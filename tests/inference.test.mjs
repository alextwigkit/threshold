import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_VERSION,
  parseInput,
  parseJudgment,
  renderSuggestion,
  responseRequest,
  extractJudgment,
  requestSuggestion,
} from '../server/inference.ts';
import { handleSuggestion } from '../server/handler.ts';
const input = {
  situation:
    'I am avoiding the design proposal because I am unsure of its structure.',
  confirmedResistance: null,
  consentVersion: CONSENT_VERSION,
};
const judgment = {
  confidence: 'high',
  resistance: 'understand',
  primary: 'fog',
  secondary: [],
  template: 'draft',
  object: 'the design proposal',
  minutes: 3,
  reason: 'uncertainty',
  eligibility: 'ordinary',
};
const payload = (j = judgment) => ({
  status: 'completed',
  output: [
    {
      type: 'message',
      content: [{ type: 'output_text', text: JSON.stringify(j) }],
    },
  ],
});
const provider = (extra = {}) => ({
  apiKey: 'test-only-key',
  model: 'test-model',
  fetchImpl: async () => Response.json(payload()),
  ...extra,
});
const ctx = (extra = {}) => ({
  userId: 'verified-test-user',
  trustedOrigin: 'https://edge.test',
  provider: provider(),
  consumeQuota: async () => true,
  ...extra,
});
const req = (body = input, headers = {}) =>
  new Request('https://edge.test/api/suggestion', {
    method: 'POST',
    headers: {
      origin: 'https://edge.test',
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
test('input requires explicit versioned consent and rejects unexpected history', () => {
  assert.deepEqual(parseInput(input), input);
  assert.throws(() => parseInput({ ...input, consentVersion: null }));
  assert.throws(() => parseInput({ ...input, history: ['private'] }));
});
test('judgment rejects invented territories, titles and incompatible templates', () => {
  for (const bad of [
    { ...judgment, primary: 'plate-1' },
    { ...judgment, title: 'Great job' },
    { ...judgment, template: 'message' },
    { ...judgment, primary: 'water' },
    { ...judgment, secondary: ['fog'] },
    { ...judgment, eligibility: 'needs_user_step' },
  ])
    assert.throws(() => parseJudgment(bad));
});
test('product renders controlled title and grounded slots; secondary remains unconfirmed', () => {
  const s = renderSuggestion(input, { ...judgment, secondary: ['spotlight'] });
  assert.equal(s.candidate.title, 'Start Before You Know');
  assert.match(s.candidate.action, /the design proposal/);
  assert.deepEqual(s.candidate.secondary, []);
  assert.deepEqual(s.secondarySuggestions, ['spotlight']);
  assert.throws(() =>
    renderSuggestion(input, { ...judgment, object: 'your medical treatment' }),
  );
});
test('confirmed corrections outrank a model classification', () => {
  assert.throws(
    () =>
      renderSuggestion({ ...input, confirmedResistance: 'judged' }, judgment),
    /correction_overridden/,
  );
});
test('low confidence and unknown cases require clarification; doses remain small', () => {
  assert.equal(
    renderSuggestion(input, { ...judgment, confidence: 'low' })
      .needsClarification,
    true,
  );
  assert.equal(
    renderSuggestion(input, { ...judgment, minutes: 5 }).candidate.minutes,
    3,
  );
  const s = renderSuggestion(input, {
    ...judgment,
    resistance: 'other',
    primary: 'unknown',
    template: 'own_step',
    object: '',
    eligibility: 'needs_user_step',
  });
  assert.equal(s.candidate.action, '');
  assert.equal(s.needsClarification, true);
});
test('request sends only situation and confirmed resistance with storage disabled', () => {
  const b = responseRequest(input, 'test-model');
  assert.equal(b.store, false);
  assert.deepEqual(JSON.parse(b.input[0].content), {
    situation: input.situation,
    confirmedResistance: null,
  });
  assert.equal(b.text.format.strict, true);
  assert.equal(b.text.format.type, 'json_schema');
});
test('extractor handles output arrays and rejects refusals, truncation and malformed JSON', () => {
  assert.deepEqual(extractJudgment(payload()), judgment);
  for (const bad of [
    { ...payload(), status: 'incomplete' },
    {
      status: 'completed',
      output: [{ content: [{ type: 'refusal', refusal: 'no' }] }],
    },
    {
      status: 'completed',
      output: [{ content: [{ type: 'output_text', text: 'not json' }] }],
    },
  ])
    assert.throws(() => extractJudgment(bad));
});
test('provider call fixes destination, keeps key in header and renders validated output', async () => {
  let called = false;
  const s = await requestSuggestion(
    input,
    provider({
      fetchImpl: async (url, options) => {
        called = true;
        assert.equal(url, 'https://api.openai.com/v1/responses');
        assert.equal(options.headers.Authorization, 'Bearer test-only-key');
        assert.ok(!options.body.includes('test-only-key'));
        return Response.json(payload());
      },
    }),
  );
  assert.ok(called);
  assert.equal(s.source, 'model');
});
test('provider rejects missing configuration, HTTP failure, timeout and oversized response', async () => {
  await assert.rejects(
    requestSuggestion(input, provider({ apiKey: '' })),
    /unconfigured/,
  );
  await assert.rejects(
    requestSuggestion(
      input,
      provider({
        fetchImpl: async () => new Response('private details', { status: 500 }),
      }),
    ),
    /unavailable/,
  );
  await assert.rejects(
    requestSuggestion(
      input,
      provider({ timeoutMs: 5, fetchImpl: () => new Promise(() => {}) }),
    ),
    /timeout/,
  );
  await assert.rejects(
    requestSuggestion(
      input,
      provider({ fetchImpl: async () => new Response('x'.repeat(20001)) }),
    ),
    /too_large/,
  );
});
test('handler rejects unauthenticated, cross-origin, missing consent and quota failures before calling model', async () => {
  let calls = 0;
  const p = provider({
    fetchImpl: async () => {
      calls++;
      return Response.json(payload());
    },
  });
  for (const [request, context, status] of [
    [req(), ctx({ provider: p, userId: null }), 401],
    [req(input, { origin: 'https://other.test' }), ctx({ provider: p }), 403],
    [req({ ...input, consentVersion: '' }), ctx({ provider: p }), 400],
    [req(), ctx({ provider: p, consumeQuota: async () => false }), 429],
  ])
    assert.equal((await handleSuggestion(request, context)).status, status);
  assert.equal(calls, 0);
});
test('handler exposes no provider secrets and does not suggest an action after refusal', async () => {
  const response = await handleSuggestion(
    req(),
    ctx({
      provider: provider({
        fetchImpl: async () =>
          Response.json({
            status: 'completed',
            output: [
              {
                content: [
                  { type: 'refusal', refusal: 'sensitive provider detail' },
                ],
              },
            ],
          }),
      }),
    }),
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.source, 'local');
  assert.equal(body.candidate.action, '');
  assert.equal(body.needsClarification, true);
  assert.ok(!JSON.stringify(body).includes('sensitive provider detail'));
});
test('handler fails closed without a provider or quota store and bounds input bodies', async () => {
  assert.equal(
    (await handleSuggestion(req(), ctx({ provider: null }))).status,
    503,
  );
  assert.equal(
    (
      await handleSuggestion(
        req(),
        ctx({
          consumeQuota: async () => {
            throw Error('db unavailable');
          },
        }),
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await handleSuggestion(
        req({ ...input, situation: 'x'.repeat(11000) }),
        ctx(),
      )
    ).status,
    413,
  );
});
