'use client';
import { useEffect, useRef, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  candidate,
  infer,
  territories,
  resistanceChoices,
  noticingChoices,
  remaining,
  observation,
  discoveries,
  appendEncounter,
  toggleNotice,
  validScale,
  isEncounter,
  isCandidate,
  isSession,
  type Candidate,
  type Resistance,
  type Territory,
  type Session,
  type Encounter,
  type Urge,
} from '@/lib/engine';
type Screen =
  | 'name'
  | 'clarify'
  | 'setup'
  | 'active'
  | 'return'
  | 'observation'
  | 'map'
  | 'atlas'
  | 'me';
type Saved = {
  version: 1;
  screen: Screen;
  situation: string;
  resistance: Resistance;
  custom: string;
  draft: Candidate | null;
  prediction: number | null;
  predictionNote: string;
  session: Session | null;
  encounters: Encounter[];
  lastId: string | null;
};
const initial: Saved = {
  version: 1,
  screen: 'name',
  situation: '',
  resistance: 'start',
  custom: '',
  draft: null,
  prediction: null,
  predictionNote: '',
  session: null,
  encounters: [],
  lastId: null,
};
const KEY = 'edge-atlas-v1';
const urgeChoices: [Urge, string][] = [
  ['no', 'No'],
  ['stayed', 'Yes, and I stayed'],
  ['returned', 'Yes, I left and came back'],
  ['stopped', 'Yes, and I stopped'],
];
function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <fieldset className="scale-field">
      <legend>{label}</legend>
      <RadioGroup
        className="scale"
        value={value === null ? '' : String(value)}
        onValueChange={(v) => onChange(Number(v))}
        aria-label={label}
      >
        {Array.from({ length: 11 }, (_, n) => (
          <label
            className={`scale-choice ${value === n ? 'selected' : ''}`}
            key={n}
          >
            <RadioGroupItem value={String(n)} aria-label={String(n)} />
            <span>{n}</span>
          </label>
        ))}
      </RadioGroup>
      <div className="scale-ends">
        <span>No discomfort</span>
        <span>Very uncomfortable</span>
      </div>
    </fieldset>
  );
}
function Primary({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="primary" onClick={onClick} disabled={disabled}>
      {children}
      <span className="arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}
function MapFragment({
  encounters,
  territory,
  compact = false,
}: {
  encounters: Encounter[];
  territory?: Territory;
  compact?: boolean;
}) {
  const attempted = encounters.filter((e) => e.outcome !== 'not_started');
  const known = [
    ...new Set([
      ...attempted.map((e) => e.territory),
      ...(territory ? [territory] : []),
    ]),
  ];
  const positions: Record<Territory, [number, number]> = {
    fog: [260, 130],
    spotlight: [280, 310],
    loop: [95, 170],
    water: [115, 350],
    unknown: [200, 230],
  };
  return (
    <div className={`map-fragment ${compact ? 'compact' : ''}`}>
      <svg
        viewBox="0 0 400 470"
        role="img"
        aria-label={
          attempted.length
            ? `Your map: ${attempted.length} real attempt${attempted.length === 1 ? '' : 's'} in ${known.map((t) => territories[t].name).join(', ')}.`
            : 'An unresolved map. Your first route is still ahead.'
        }
      >
        <defs>
          <pattern
            id="dots"
            width="15"
            height="15"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="3" cy="3" r=".7" fill="#85887e" opacity=".22" />
          </pattern>
        </defs>
        <rect width="400" height="470" fill="url(#dots)" />
        {Array.from({ length: 7 }, (_, i) => (
          <path
            key={i}
            d={`M -25 ${85 + i * 54} C 100 ${15 + i * 61}, 135 ${170 + i * 32}, 230 ${95 + i * 41} S 350 ${100 + i * 42}, 445 ${20 + i * 57}`}
            fill="none"
            stroke="#777e70"
            strokeWidth=".8"
            opacity={0.1 + Math.min(attempted.length, 6) * 0.025}
          />
        ))}
        {known.map((t) => {
          const [x, y] = positions[t];
          return (
            <g key={t}>
              <text x={x} y={y - 28} textAnchor="middle" className="map-label">
                {territories[t].name}
              </text>
              {t === 'loop' &&
                [25, 40, 55].map((r) => (
                  <path
                    key={r}
                    d={`M ${x + r} ${y} A ${r} ${r} 0 1 1 ${x + r - 8} ${y - 18}`}
                    fill="none"
                    stroke="#777e70"
                    opacity=".25"
                  />
                ))}
              {t === 'water' &&
                [0, 10, 20].map((d) => (
                  <path
                    key={d}
                    d={`M ${x - 55} ${y + d} Q ${x} ${y + d + 15} ${x + 55} ${y + d}`}
                    fill="none"
                    stroke="#777e70"
                    opacity=".3"
                  />
                ))}
            </g>
          );
        })}
        {attempted.map((e, i) => {
          const [x, y] = positions[e.territory];
          const j = attempted
            .slice(0, i)
            .filter((v) => v.territory === e.territory).length;
          const dx = ((j % 5) - 2) * 9;
          const stopped = e.outcome === 'stopped';
          return (
            <g key={e.id} className="route-reveal">
              <path
                d={`M 90 410 Q 140 ${330 - j * 3} ${x + dx - 35} ${y + 85} T ${x + dx} ${y + (stopped ? 65 : 20)}`}
                fill="none"
                stroke={i === attempted.length - 1 ? '#ac3d24' : '#7d8176'}
                strokeWidth={i === attempted.length - 1 ? 2.1 : 1}
                opacity={i === attempted.length - 1 ? 1 : 0.4}
                strokeDasharray={stopped ? '3 4' : undefined}
              />
              <circle
                cx={x + dx}
                cy={y + (stopped ? 65 : 20)}
                r="3"
                fill="#ac3d24"
              />
              {stopped && i === attempted.length - 1 && (
                <text
                  x={x + dx - 5}
                  y={y + 84}
                  textAnchor="middle"
                  className="map-note"
                >
                  stopped here
                </text>
              )}
            </g>
          );
        })}
        {territory && (
          <path
            d={`M 90 410 Q 170 280 ${positions[territory][0]} ${positions[territory][1] + 20}`}
            fill="none"
            stroke="#ac3d24"
            strokeWidth="1.3"
            strokeDasharray="3 6"
            opacity=".6"
          />
        )}
      </svg>
    </div>
  );
}
export default function Home() {
  const [s, setS] = useState<Saved>(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);
  const [install, setInstall] = useState<any>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const saveBlocked = useRef(false);
  const patch = (p: Partial<Saved>) => setS((v) => ({ ...v, ...p }));
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed.version !== 1 ||
          !Array.isArray(parsed.encounters) ||
          !parsed.encounters.every(isEncounter) ||
          ![
            'name',
            'clarify',
            'setup',
            'active',
            'return',
            'observation',
            'map',
            'atlas',
            'me',
          ].includes(parsed.screen) ||
          typeof parsed.situation !== 'string'
        )
          throw Error('invalid');
        if (parsed.session && !isSession(parsed.session))
          throw Error('invalid');
        if (['active', 'return'].includes(parsed.screen) && !parsed.session)
          throw Error('invalid');
        if (parsed.screen === 'setup' && !isCandidate(parsed.draft))
          throw Error('invalid');
        if (parsed.screen === 'observation' && !parsed.encounters.length)
          throw Error('invalid');
        setS({ ...initial, ...parsed });
      }
    } catch {
      saveBlocked.current = true;
      setError(
        'Your saved map could not be read. It has not been overwritten. You can export it in Me before clearing it.',
      );
    }
    setReady(true);
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener('beforeinstallprompt', prompt);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() =>
          setError('Offline setup did not finish. You can continue online.'),
        );
    return () => {
      clearInterval(tick);
      window.removeEventListener('beforeinstallprompt', prompt);
    };
  }, []);
  useEffect(() => {
    if (!ready || saveBlocked.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      setError('');
    } catch {
      setError(
        'This browser could not save your map. Keep this page open and export your data in Me.',
      );
    }
  }, [s, ready]);
  useEffect(() => {
    if (ready) {
      window.scrollTo({ top: 0 });
      heading.current?.focus();
    }
  }, [s.screen, ready]);
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'stage_edge_situation',
            description:
              'Open a new situation for user review. Does not start or record an expedition.',
            inputSchema: {
              type: 'object',
              properties: {
                situation: { type: 'string', minLength: 1, maxLength: 2000 },
              },
              required: ['situation'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            execute: async (input: unknown) => {
              const v = input as { situation?: unknown };
              if (
                typeof v?.situation !== 'string' ||
                !v.situation.trim() ||
                v.situation.length > 2000
              )
                throw Error('Provide a situation of 1–2000 characters.');
              if (s.session)
                throw Error('Return from the active expedition first.');
              const text = v.situation.trim();
              setS((prev) => ({
                ...prev,
                situation: text,
                screen: 'name',
                draft: null,
                prediction: null,
                predictionNote: '',
              }));
              await new Promise((resolve) => requestAnimationFrame(resolve));
              return { status: 'staged', screen: 'name' };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [s.session]);
  const go = (screen: Screen) => patch({ screen });
  const title = (text: string) => (
    <h1 ref={heading} tabIndex={-1}>
      {text}
    </h1>
  );
  function resolve() {
    const guess = infer(s.situation);
    const draft = candidate(s.situation.trim(), guess.resistance, s.encounters);
    patch({
      resistance: guess.resistance,
      draft,
      prediction: null,
      predictionNote: '',
      screen: guess.confident ? 'setup' : 'clarify',
    });
  }
  function setup() {
    patch({
      draft: {
        ...candidate(s.situation.trim(), s.resistance, s.encounters),
        resistanceNote: s.custom,
      },
      prediction: null,
      predictionNote: '',
      screen: 'setup',
    });
  }
  function begin() {
    if (s.session) {
      go('active');
      return;
    }
    if (!s.draft?.action.trim() || !validScale(s.prediction)) return;
    patch({
      session: {
        ...s.draft,
        id: crypto.randomUUID(),
        prediction: s.prediction,
        predictionNote: s.predictionNote,
        startedAt: Date.now(),
        actual: null,
        urge: '',
        notices: [],
        note: '',
        stopped: false,
      },
      screen: 'active',
    });
  }
  function updateSession(p: Partial<Session>) {
    if (s.session) patch({ session: { ...s.session, ...p } });
  }
  function returnFrom(stopped = false) {
    if (s.session)
      patch({
        session: { ...s.session, returnedAt: Date.now(), stopped },
        screen: 'return',
      });
  }
  function finish(notStarted = false) {
    if (!s.session) return;
    const a = s.session;
    if (!notStarted && (!validScale(a.actual) || !a.urge)) return;
    const date = new Date();
    const e: Encounter = {
      ...a,
      actual: notStarted ? null : a.actual,
      notices: notStarted ? [] : a.notices,
      outcome: notStarted
        ? 'not_started'
        : a.urge === 'stopped' || a.stopped
          ? 'stopped'
          : 'attempted',
      createdAt: Date.now(),
      localDate: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
    };
    patch({
      encounters: appendEncounter(s.encounters, e),
      session: null,
      lastId: e.id,
      screen: 'observation',
    });
  }
  const last =
    s.encounters.find((e) => e.id === s.lastId) ?? s.encounters.at(-1);
  const next = last
    ? candidate(last.situation, last.resistance, s.encounters)
    : null;
  const found = discoveries(s.encounters);
  const nav = ['map', 'atlas', 'me'].includes(s.screen);
  const active = s.session;
  function exportData() {
    const raw = saveBlocked.current
      ? localStorage.getItem(KEY)
      : JSON.stringify(s, null, 2);
    const url = URL.createObjectURL(
      new Blob([raw || JSON.stringify(s, null, 2)], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edge-map.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!ready)
    return (
      <main className="shell">
        <header>
          <span className="brand">EDGE</span>
        </header>
        <p>Opening your map…</p>
      </main>
    );
  return (
    <main className={`shell ${nav ? 'with-nav' : ''}`}>
      <header>
        {!nav &&
        s.screen !== 'name' &&
        s.screen !== 'observation' &&
        s.screen !== 'active' ? (
          <button
            className="back"
            aria-label="Go back"
            onClick={() =>
              go(
                s.screen === 'clarify'
                  ? 'name'
                  : s.screen === 'setup'
                    ? 'clarify'
                    : s.screen === 'return'
                      ? 'active'
                      : 'setup',
              )
            }
          >
            ←
          </button>
        ) : (
          <span className="brand">EDGE</span>
        )}
        {!nav &&
          s.screen !== 'name' &&
          s.screen !== 'observation' &&
          s.screen !== 'active' && <span className="brand">EDGE</span>}
        {s.screen === 'name' && s.encounters.length > 0 && (
          <button className="text-button" onClick={() => go('map')}>
            My map
          </button>
        )}
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
          <button className="text-button" onClick={() => go('me')}>
            Open Me
          </button>
        </div>
      )}
      {s.screen === 'name' && (
        <section className="opening">
          {title('What do you keep turning away from?')}
          <p className="premise">
            Edge turns the things you avoid into territory you can explore.
          </p>
          <label className="field-label" htmlFor="situation">
            What's something you've been avoiding lately?
          </label>
          <div className="entry">
            <textarea
              id="situation"
              value={s.situation}
              maxLength={2000}
              onChange={(e) => patch({ situation: e.target.value })}
            />
            <p className="hint">
              A conversation, starting a project, answering a message, making a
              decision.
            </p>
          </div>
          <Primary disabled={!s.situation.trim()} onClick={resolve}>
            Continue
          </Primary>
        </section>
      )}
      {s.screen === 'clarify' && (
        <section>
          {title(
            s.resistance === 'understand'
              ? 'Sounds like the hard part may be acting before you know exactly what you’re doing.'
              : 'What feels like the hard part?',
          )}
          <p className="eyebrow quiet">What feels closest?</p>
          <RadioGroup
            className="choices"
            value={s.resistance}
            onValueChange={(v) => patch({ resistance: v as Resistance })}
          >
            {[
              ...resistanceChoices,
              ...(s.resistance === 'checking'
                ? [
                    ['checking', 'I keep checking or polishing it'] as [
                      Resistance,
                      string,
                    ],
                  ]
                : []),
            ].map(([v, l]) => (
              <label
                className={`choice ${s.resistance === v ? 'selected' : ''}`}
                key={v}
              >
                <span>{l}</span>
                <RadioGroupItem value={v} />
              </label>
            ))}
          </RadioGroup>
          {s.resistance === 'other' && (
            <label className="field-label">
              What makes it hard?
              <textarea
                className="text-input"
                value={s.custom}
                maxLength={1000}
                onChange={(e) => patch({ custom: e.target.value })}
              />
            </label>
          )}
          <button className="text-button serif" onClick={() => go('name')}>
            Not quite right? Adjust this
          </button>
          <Primary onClick={setup}>Continue</Primary>
        </section>
      )}
      {s.screen === 'setup' && s.draft && (
        <section>
          <div className="territory-setup">
            <MapFragment
              encounters={s.encounters}
              territory={s.draft.territory}
              compact
            />
            <p>{territories[s.draft.territory].description}</p>
          </div>
          {title(s.draft.title)}
          <p className="situation-context">{s.situation}</p>
          <label className="field-label" htmlFor="action">
            The step you'll take
          </label>
          <textarea
            id="action"
            className="text-input action-input"
            maxLength={1000}
            value={s.draft.action}
            placeholder={
              s.draft.territory === 'spotlight'
                ? 'Name one question, message, or small thing you could let someone see.'
                : s.draft.territory === 'loop'
                  ? 'Name one necessary check, and the extra polishing pass you could leave undone.'
                  : s.draft.territory === 'water'
                    ? 'Name a feeling you could notice briefly before opening a distraction.'
                    : 'Name one small, concrete thing you can do toward this situation.'
            }
            onChange={(e) =>
              patch({ draft: { ...s.draft!, action: e.target.value } })
            }
          />
          <div className="duration">
            <span>{s.draft!.minutes} min</span>
            <button
              className="text-button"
              onClick={() =>
                patch({
                  draft: {
                    ...s.draft!,
                    minutes: s.draft!.minutes === 1 ? 3 : 1,
                    action: s.draft!.action.replace(
                      /\b[13] minutes?\b/g,
                      s.draft!.minutes === 1 ? '3 minutes' : '1 minute',
                    ),
                  },
                })
              }
            >
              {s.draft!.minutes === 1 ? 'Use 3 minutes' : 'Make it smaller'}
            </button>
            <button className="text-button" onClick={() => go('clarify')}>
              Adjust the fit
            </button>
          </div>
          <Scale
            label="How uncomfortable do you expect this to be?"
            value={s.prediction}
            onChange={(prediction) => patch({ prediction })}
          />
          <label className="field-label" htmlFor="prediction">
            What do you expect will happen?{' '}
            <span className="optional">Optional</span>
          </label>
          <textarea
            className="text-input"
            id="prediction"
            value={s.predictionNote}
            maxLength={1000}
            onChange={(e) => patch({ predictionNote: e.target.value })}
          />
          <Primary
            onClick={begin}
            disabled={!s.draft.action.trim() || s.prediction === null}
          >
            Begin
          </Primary>
        </section>
      )}
      {s.screen === 'active' && active && (
        <section className="active">
          {title(active.title)}
          <div
            className="timer"
            aria-label={`${Math.floor(remaining(active, now) / 60)} minutes ${remaining(active, now) % 60} seconds remaining`}
          >
            {Math.floor(remaining(active, now) / 60)
              .toString()
              .padStart(2, '0')}
            :{(remaining(active, now) % 60).toString().padStart(2, '0')}
          </div>
          <p className="serif active-action">{active.action}</p>
          <div className="small-rule" />
          <p className="serif invitation">
            Go do it. Come back when you're done—or when something interesting
            happens.
          </p>
          <p className="timer-note">
            Time keeps counting when you leave the app.
          </p>
          <Primary onClick={() => returnFrom()}>I'm back</Primary>
          <button className="text-button stop" onClick={() => returnFrom(true)}>
            Stop
          </button>
        </section>
      )}
      {s.screen === 'return' && active && (
        <section>
          {title('What happened?')}
          <Scale
            label="How uncomfortable was it actually?"
            value={active.actual}
            onChange={(actual) => updateSession({ actual })}
          />
          {active.actual !== null && (
            <section className="reveal">
              <h2>Did an urge to avoid or leave show up?</h2>
              <RadioGroup
                className="choices"
                value={active.urge}
                onValueChange={(v) => updateSession({ urge: v as Urge })}
              >
                {urgeChoices.map(([v, l]) => (
                  <label
                    className={`choice ${active.urge === v ? 'selected' : ''}`}
                    key={v}
                  >
                    <span>{l}</span>
                    <RadioGroupItem value={v} />
                  </label>
                ))}
              </RadioGroup>
            </section>
          )}
          {active.actual !== null && active.urge && (
            <section className="reveal">
              <h2>What did you notice?</h2>
              <p className="optional">Choose any that fit.</p>
              <div className="choices">
                {noticingChoices.map(([v, l]) => (
                  <label
                    key={v}
                    className={`choice ${active.notices.includes(v) ? 'selected' : ''}`}
                  >
                    <span>{l}</span>
                    <Checkbox
                      checked={active.notices.includes(v)}
                      onCheckedChange={() =>
                        updateSession({
                          notices: toggleNotice(active.notices, v),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              {active.notices.includes('other') && (
                <label className="field-label">
                  What else did you notice?{' '}
                  <span className="optional">Optional</span>
                  <textarea
                    className="text-input"
                    value={active.note}
                    maxLength={1000}
                    onChange={(e) => updateSession({ note: e.target.value })}
                  />
                </label>
              )}
              <Primary onClick={() => finish()}>Continue</Primary>
            </section>
          )}
          <button className="text-button" onClick={() => finish(true)}>
            I didn't start
          </button>
        </section>
      )}
      {s.screen === 'observation' && last && (
        <section>
          <MapFragment encounters={s.encounters} />
          <p className="eyebrow">
            {last.outcome === 'not_started'
              ? 'This time'
              : s.encounters.filter((e) => e.outcome !== 'not_started')
                    .length === 1
                ? 'First observation'
                : 'Observation'}
          </p>
          {title(observation(last).title)}
          {last.actual !== null && (
            <p className="evidence">
              Expected {last.prediction} <span aria-hidden="true">→</span>{' '}
              Experienced {last.actual}
            </p>
          )}
          <p className="serif observation-copy">{observation(last).body}</p>
          <Primary onClick={() => go('map')}>See my map</Primary>
        </section>
      )}
      {s.screen === 'map' && (
        <section>
          {s.encounters.some((e) => e.outcome !== 'not_started') ? (
            <>
              <h1 className="sr-only" ref={heading} tabIndex={-1}>
                Your map
              </h1>
              <MapFragment encounters={s.encounters} />
            </>
          ) : (
            <>
              {title('Your map starts with something real.')}
              <MapFragment encounters={[]} />
            </>
          )}
          {next && (
            <>
              <p className="eyebrow">Today's Edge · {next.minutes} min</p>
              <h2>{next.title}</h2>
              <p>
                {next.action ||
                  'Choose a small step toward the situation you last brought here.'}
              </p>
              <Primary
                onClick={() =>
                  patch({
                    draft: next,
                    situation: next.situation,
                    resistance: next.resistance,
                    prediction: null,
                    predictionNote: '',
                    screen: 'setup',
                  })
                }
              >
                Explore
              </Primary>
            </>
          )}
          <button
            className="avoid-row"
            onClick={() =>
              patch({ situation: '', custom: '', draft: null, screen: 'name' })
            }
          >
            I'm avoiding something <span aria-hidden="true">→</span>
          </button>
        </section>
      )}
      {s.screen === 'atlas' && (
        <section>
          {title('Your atlas')}
          {!s.encounters.length && (
            <p>
              Your observations will appear here after you try an expedition.
            </p>
          )}
          {found.map((d) => (
            <article className="atlas-entry" key={d.id}>
              <p className="eyebrow">
                Discovery · {territories[d.territory].name}
              </p>
              <h2>{d.title}</h2>
              <p>{d.body}</p>
              <details>
                <summary>See the evidence</summary>
                {s.encounters
                  .filter((e) => d.evidence.includes(e.id))
                  .map((e) => (
                    <p key={e.id}>
                      {new Date(e.createdAt).toLocaleDateString()}:{' '}
                      {observation(e).body}
                    </p>
                  ))}
                <p>
                  {d.support.length} supporting encounters; {d.contrary.length}{' '}
                  other encounters.
                </p>
              </details>
            </article>
          ))}
          {[...s.encounters].reverse().map((e) => (
            <article className="atlas-entry" key={e.id}>
              <p className="eyebrow">
                {new Date(e.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                · {territories[e.territory].name}
              </p>
              <h2>{observation(e).title}</h2>
              <p>{observation(e).body}</p>
              <details>
                <summary>The encounter</summary>
                <p>{e.situation}</p>
                <p>{e.action}</p>
                {e.resistanceNote && <p>{e.resistanceNote}</p>}
                {e.actual !== null && (
                  <p>
                    Expected {e.prediction} → Experienced {e.actual}
                  </p>
                )}
                <p>
                  {e.outcome === 'not_started'
                    ? 'Not started'
                    : urgeChoices.find(([v]) => v === e.urge)?.[1]}
                </p>
                {e.predictionNote && <p>Expected: {e.predictionNote}</p>}
                {e.notices.map((n) => (
                  <p key={n}>{noticingChoices.find(([v]) => v === n)?.[1]}</p>
                ))}
                {e.note && <p>{e.note}</p>}
              </details>
            </article>
          ))}
        </section>
      )}
      {s.screen === 'me' && (
        <section>
          {title('A map of your own')}
          {s.session && (
            <Primary onClick={() => go('active')}>
              Return to your expedition
            </Primary>
          )}
          <p>
            Your situations and encounters stay in this browser, on this device.
            They aren't sent to a model or synced to an account.
          </p>
          <p>
            Edge currently offers a small set of editable suggestions. You
            decide what fits and what step to take.
          </p>
          <h2>Keep your map</h2>
          <p>
            Clearing browser data will remove it. Save a copy whenever you want
            to keep a backup.
          </p>
          <button className="text-button" onClick={exportData}>
            Export my data
          </button>
          <h2 className="section-heading">Keep Edge nearby</h2>
          {install ? (
            <Primary
              onClick={async () => {
                await install.prompt();
                setInstall(null);
              }}
            >
              Install Edge
            </Primary>
          ) : (
            <p>
              On iPhone or iPad, open Edge in Safari, then use Share → Add to
              Home Screen. On other devices, look for Install in your browser's
              menu.
            </p>
          )}
          <h2 className="section-heading">Start again</h2>
          <AlertDialog>
            <AlertDialogTrigger className="text-button">
              Delete my map
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete your map from this device?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your situations, encounters and observations.
                  Export a copy first if you want to keep them.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my map</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    try {
                      localStorage.removeItem(KEY);
                      saveBlocked.current = false;
                      setS(initial);
                      setError('');
                    } catch {
                      setError(
                        'Your map could not be deleted. Try your browser’s site-data settings.',
                      );
                    }
                  }}
                >
                  Delete my map
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      )}
      {nav && (
        <nav className="bottom-nav" aria-label="Main navigation">
          {(['map', 'atlas', 'me'] as Screen[]).map((n, i) => (
            <button
              key={n}
              aria-current={s.screen === n ? 'page' : undefined}
              onClick={() => go(n)}
            >
              <span aria-hidden="true">{['↗', '▤', '○'][i]}</span>
              {n[0].toUpperCase() + n.slice(1)}
            </button>
          ))}
        </nav>
      )}
    </main>
  );
}
