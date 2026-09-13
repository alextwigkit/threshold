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
  type Resistance,
  type Territory,
  type Session,
  type Encounter,
  type Urge,
} from '@/lib/engine';
import MapFragment from './map-fragment';
import { SuggestionRequest } from '@/lib/suggestions';
import {
  KEY,
  initial,
  parseSaved,
  mergeBackup,
  restoreSummary,
  type Saved,
  type Screen,
} from '@/lib/storage';
const urgeChoices: [Urge, string][] = [
  ['no', 'No'],
  ['stayed', 'Yes, and I stayed'],
  ['returned', 'Yes, I left and came back'],
  ['stopped', 'Yes, and I stopped'],
];
function Scale({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div className="scale-field">
      <div className="scale-legend" id={`${id}-label`}>
        {label}
      </div>
      <RadioGroup
        className="scale"
        value={value === null ? '' : String(value)}
        onValueChange={(v) => onChange(Number(v))}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-ends`}
      >
        {Array.from({ length: 11 }, (_, n) => (
          <label
            className={`scale-choice ${value === n ? 'selected' : ''}`}
            key={n}
          >
            <RadioGroupItem value={String(n)} />
            <span>{n}</span>
          </label>
        ))}
      </RadioGroup>
      {/* The scale wraps to two rows on narrow screens, so each end names its own number. */}
      <div className="scale-ends" id={`${id}-ends`}>
        <span>0 · No discomfort</span> <span>10 · Very uncomfortable</span>
      </div>
    </div>
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
export default function Home() {
  const [s, setS] = useState<Saved>(initial);
  const [busy, setBusy] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const suggestionRequest = useRef(new SuggestionRequest());
  const requestEpoch = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);
  const [atlasTerritory, setAtlasTerritory] = useState<Territory | null>(null);
  const [backup, setBackup] = useState<Saved | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [restoreMessage, setRestoreMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const rawUnreadable = useRef<string | null>(null);

  const heading = useRef<HTMLHeadingElement>(null);
  const saveBlocked = useRef(false);
  const patch = (p: Partial<Saved>) => setS((v) => ({ ...v, ...p }));
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        rawUnreadable.current = raw;
        setS(parseSaved(raw));
        rawUnreadable.current = null;
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
    const changedElsewhere = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      suggestionRequest.current.cancel();
      setBusy(false);
      saveBlocked.current = true;
      setError(
        'Your map changed in another tab. Export any unfinished work here, then reload to use the latest map.',
      );
    };
    window.addEventListener('storage', changedElsewhere);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() =>
          setError('Offline setup did not finish. You can continue online.'),
        );
    return () => {
      clearInterval(tick);
      window.removeEventListener('storage', changedElsewhere);
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
  // A textarea scrolls rather than grows, so a long action loses its last
  // lines once text is enlarged or the screen is narrow. Fit each one to its
  // content after every render; the CSS min-height still sets the floor.
  useEffect(() => {
    const fit = () => {
      for (const area of document.querySelectorAll('textarea')) {
        area.style.height = 'auto';
        // scrollHeight excludes the border, which border-box sizing counts.
        const border = area.offsetHeight - area.clientHeight;
        area.style.height = `${area.scrollHeight + border}px`;
      }
    };
    fit();
    // Rotating the device rewraps the text, so the fit has to be redone.
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  });
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
  useEffect(() => {
    suggestionRequest.current.cancel();
    setBusy(false);
  }, [s.situation, s.resistance, s.custom, s.screen]);
  useEffect(() => () => suggestionRequest.current.cancel(), []);
  const go = (screen: Screen) => {
    suggestionRequest.current.cancel();
    setBusy(false);
    setSuggestionMessage('');
    patch({ screen });
  };
  async function requestStep(confirmed: Resistance | null) {
    if (!navigator.onLine) return false;
    const epoch = ++requestEpoch.current;
    setBusy(true);
    setSuggestionMessage('');
    const situation = s.situation.trim();
    try {
      const result = await suggestionRequest.current.run(situation, confirmed);
      if (!result) return true;
      let draft = result.candidate;
      const local = candidate(situation, draft.resistance, s.encounters);
      // Previous edits and smaller-dose rules remain local and outrank a new suggestion.
      if (local.userAction) draft = local;
      else if (local.minutes < draft.minutes)
        draft = {
          ...draft,
          minutes: local.minutes,
          action: draft.action.replace(
            /\b3 minutes\b/g,
            `${local.minutes} minute${local.minutes === 1 ? '' : 's'}`,
          ),
        };
      patch({
        draft: { ...draft, resistanceNote: s.custom },
        resistance: draft.resistance,
        prediction: null,
        predictionNote: '',
        screen: confirmed
          ? 'setup'
          : result.needsClarification
            ? 'clarify'
            : 'setup',
      });
      if (result.source === 'local')
        setSuggestionMessage(
          'Suggestions are unavailable right now. You can choose your own step.',
        );
      return true;
    } catch (e) {
      setSuggestionMessage(
        e instanceof Error && e.message === 'limit'
          ? 'You’ve reached the suggestion limit. You can still choose your own step.'
          : 'Suggestions are unavailable right now. You can still choose your own step.',
      );
      const draft = {
        ...candidate(situation, confirmed ?? 'other'),
        title: 'Choose Your Own Step',
        action: '',
      };
      patch({
        draft,
        resistance: confirmed ?? 'other',
        prediction: null,
        predictionNote: '',
        screen: 'setup',
      });
      return true;
    } finally {
      if (epoch === requestEpoch.current) setBusy(false);
    }
  }

  const title = (text: string) => (
    <h1 ref={heading} tabIndex={-1}>
      {text}
    </h1>
  );
  async function resolve() {
    if (await requestStep(null)) return;
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
  async function setup() {
    if (await requestStep(s.resistance)) return;
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
  const previousDiscoveryIds = new Set(
    discoveries(s.encounters.filter((e) => e.id !== last?.id)).map((d) => d.id),
  );
  const newDiscovery = found.find((d) => !previousDiscoveryIds.has(d.id));
  const discoveryEvidence = newDiscovery
    ? s.encounters.filter((e) => newDiscovery.evidence.includes(e.id))
    : [];
  const expectedMean = discoveryEvidence.length
    ? discoveryEvidence.reduce((n, e) => n + e.prediction, 0) /
      discoveryEvidence.length
    : 0;
  const experiencedMean = discoveryEvidence.length
    ? discoveryEvidence.reduce((n, e) => n + (e.actual ?? 0), 0) /
      discoveryEvidence.length
    : 0;
  const filteredEncounters = atlasTerritory
    ? s.encounters.filter((e) => e.territory === atlasTerritory)
    : s.encounters;
  const filteredDiscoveries = atlasTerritory
    ? found.filter((d) => d.territory === atlasTerritory)
    : found;
  const backupSummary = backup ? restoreSummary(s, backup) : null;
  function showTerritory(t: Territory) {
    setAtlasTerritory(t);
    go('atlas');
  }
  async function stageBackup(file: File | undefined) {
    setRestoreError('');
    setRestoreMessage('');
    if (!file) return;
    if (file.size > 10_000_000) {
      setRestoreError('Choose a Threshold backup smaller than 10 MB.');
      return;
    }
    try {
      setBackup(parseSaved(await file.text()));
    } catch (e) {
      setRestoreError(
        e instanceof Error ? e.message : 'This backup could not be read.',
      );
    }
  }
  function confirmRestore() {
    if (!backup) return;
    if (saveBlocked.current) {
      setRestoreError(
        'Export the unreadable data, then clear this device’s map before restoring a backup.',
      );
      return;
    }
    const merged = mergeBackup(s, backup);
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
      setS(merged);
      setRestoreMessage('Your backup has been merged into this map.');
      setBackup(null);
    } catch {
      setRestoreError(
        'Your browser could not save the restored map. Your existing map has not changed.',
      );
    }
  }

  const nav = ['map', 'atlas', 'me'].includes(s.screen);
  const active = s.session;
  function exportData() {
    const raw = saveBlocked.current
      ? rawUnreadable.current
      : JSON.stringify(s, null, 2);
    const url = URL.createObjectURL(
      new Blob([raw || JSON.stringify(s, null, 2)], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'threshold-map.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!ready)
    return (
      <main className="shell">
        <header>
          <span className="brand">THRESHOLD</span>
        </header>
        <p>Opening your map…</p>
      </main>
    );
  return (
    <main className={`shell ${nav ? 'with-nav' : ''}`}>
      <header>
        {s.screen === 'me' ? (
          <button
            className="preferences-back"
            onClick={() =>
              go(s.session ? 'active' : s.encounters.length ? 'map' : 'name')
            }
          >
            <span aria-hidden="true">←</span> Back
          </button>
        ) : !nav &&
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
          <span className="brand">THRESHOLD</span>
        )}
        {s.screen === 'me' && <span className="brand">THRESHOLD</span>}
        {!nav &&
          s.screen !== 'name' &&
          s.screen !== 'observation' &&
          s.screen !== 'active' && <span className="brand">THRESHOLD</span>}
        {s.screen === 'name' && s.encounters.length === 0 && (
          <button className="text-button" onClick={() => go('me')}>
            Preferences
          </button>
        )}
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
      {suggestionMessage && <p role="status">{suggestionMessage}</p>}
      {busy && (
        <div role="status">
          <p>Finding a small step…</p>
          <button
            className="text-button"
            onClick={() => {
              suggestionRequest.current.cancel();
              setBusy(false);
              const draft = candidate(
                s.situation.trim(),
                s.resistance,
                s.encounters,
              );
              patch({
                draft,
                prediction: null,
                predictionNote: '',
                screen: 'setup',
              });
            }}
          >
            Continue with a built-in step
          </button>
        </div>
      )}
      {s.screen === 'name' && (
        <section className="opening">
          {title('What do you keep turning away from?')}
          <p className="premise">
            Threshold turns the things you avoid into territory you can explore.
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
          <Primary disabled={!s.situation.trim() || busy} onClick={resolve}>
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
          <p className="eyebrow quiet" id="resistance-label">
            What feels closest?
          </p>
          <RadioGroup
            className="choices"
            value={s.resistance}
            onValueChange={(v) => patch({ resistance: v as Resistance })}
            aria-labelledby="resistance-label"
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
          <Primary disabled={busy} onClick={setup}>
            Continue
          </Primary>
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
              patch({
                draft: {
                  ...s.draft!,
                  action: e.target.value,
                  userAction: e.target.value,
                },
              })
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
            id="expected"
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
            role="timer"
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
            id="actual"
            label="How uncomfortable was it actually?"
            value={active.actual}
            onChange={(actual) => updateSession({ actual })}
          />
          {active.actual !== null && (
            <section className="reveal">
              <h2 id="urge-label">Did an urge to avoid or leave show up?</h2>
              <RadioGroup
                className="choices"
                value={active.urge}
                onValueChange={(v) => updateSession({ urge: v as Urge })}
                aria-labelledby="urge-label"
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
              <h2 id="noticing-label">What did you notice?</h2>
              <p className="optional" id="noticing-hint">
                Choose any that fit.
              </p>
              <fieldset
                className="choices"
                aria-labelledby="noticing-label"
                aria-describedby="noticing-hint"
              >
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
              </fieldset>
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
          <MapFragment
            encounters={s.encounters}
            revealId={last.id}
            newDiscoveryId={newDiscovery?.id}
          />
          <p className="eyebrow">
            {newDiscovery
              ? 'Discovery'
              : last.outcome === 'not_started'
                ? 'This time'
                : s.encounters.filter((e) => e.outcome !== 'not_started')
                      .length === 1
                  ? 'First observation'
                  : 'Observation'}
          </p>
          {title(newDiscovery?.title ?? observation(last).title)}
          {last.actual !== null && (
            <p className="evidence">
              Expected{' '}
              {newDiscovery ? expectedMean.toFixed(1) : last.prediction}{' '}
              <span aria-hidden="true">→</span> Experienced{' '}
              {newDiscovery ? experiencedMean.toFixed(1) : last.actual}
            </p>
          )}
          <p className="serif observation-copy">
            {newDiscovery?.body ?? observation(last).body}
          </p>
          {newDiscovery && (
            <p className="optional">
              Across {discoveryEvidence.length} encounters with{' '}
              {territories[newDiscovery.territory].name}.
            </p>
          )}
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
              <MapFragment
                encounters={s.encounters}
                onTerritory={showTerritory}
              />
            </>
          ) : (
            <>
              {title('Your map starts with something real.')}
              <MapFragment encounters={[]} />
            </>
          )}
          {next && (
            <>
              <p className="eyebrow">Today's Threshold · {next.minutes} min</p>
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
          {title(
            atlasTerritory ? territories[atlasTerritory].name : 'Your atlas',
          )}
          {atlasTerritory && (
            <button
              className="text-button"
              onClick={() => setAtlasTerritory(null)}
            >
              See all of my atlas
            </button>
          )}
          {!s.encounters.length && (
            <p>
              Your observations will appear here after you try an expedition.
            </p>
          )}
          {filteredDiscoveries.map((d) => (
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
          {[...filteredEncounters].reverse().map((e) => (
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
            Your map and encounters are saved in this browser, on this device.
            They aren’t synced to an account.
          </p>
          <p>
            Threshold currently offers a small set of editable suggestions. You
            decide what fits and what step to take.
          </p>
          {saveBlocked.current && (
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Reload the saved map
            </button>
          )}
          <h2>Keep your map</h2>
          <p>
            Clearing browser data will remove it. Save a copy whenever you want
            to keep a backup.
          </p>
          <div className="data-actions">
            <button className="text-button" onClick={exportData}>
              Export my data
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                void stageBackup(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              className="text-button"
              onClick={() => fileInput.current?.click()}
            >
              Restore a backup
            </button>
          </div>
          {restoreError && (
            <p className="error" role="alert">
              {restoreError}
            </p>
          )}
          {restoreMessage && <p role="status">{restoreMessage}</p>}
          <AlertDialog
            open={!!backup}
            onOpenChange={(open) => {
              if (!open) setBackup(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Merge this backup into your map?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {backupSummary?.added ?? 0} encounters will be added.{' '}
                  {backupSummary?.duplicates ?? 0} already on this device will
                  be kept as they are. Your current step and unfinished
                  expedition will stay here.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div role="alert">{restoreError}</div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmRestore}>
                  Merge backup
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
                      suggestionRequest.current.cancel();
                      setBusy(false);
                      saveBlocked.current = false;
                      setS(initial);
                      rawUnreadable.current = null;
                      setBackup(null);
                      setRestoreError('');
                      setRestoreMessage('');
                      setAtlasTerritory(null);
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
              onClick={() => {
                if (n === 'atlas') setAtlasTerritory(null);
                go(n);
              }}
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
