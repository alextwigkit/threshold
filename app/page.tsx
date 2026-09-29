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
  updateEncounter,
  worryLine,
  lastPurpose,
  toggleNotice,
  validScale,
  type Resistance,
  type Territory,
  type Session,
  type Encounter,
  type Urge,
} from '@/lib/engine';
import Trail from './trail';
import {
  pattern,
  taken,
  trailCaption,
  trailStones,
  worryPattern,
} from '@/lib/trail';
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
const worryHappenedChoices: [NonNullable<Session['worryHappened']>, string][] =
  [
    ['no', 'No'],
    ['partly', 'Partly'],
    ['yes', 'Yes'],
    ['unknown', 'Can’t tell yet'],
  ];
// worryLine() always returns either '' or `“quote” status`; splitting it here
// lets Observation show the quote in meta colour without duplicating the
// quoting/truncation logic that already lives in that one pure helper.
function splitWorryLine(line: string): [string, string] {
  const match = line.match(/^(“.*”)\s*(.*)$/);
  return match ? [match[1], match[2]] : [line, ''];
}
function Scale({
  id,
  label,
  value,
  onChange,
  onPick,
  onLeave,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (n: number) => void;
  onPick?: () => void;
  onLeave?: (e: React.FocusEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="scale-field" onBlur={onLeave}>
      <div className="scale-legend" id={`${id}-label`} tabIndex={-1}>
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
            onClick={onPick}
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
function AnsweredRow({
  id,
  label,
  value,
  onChange,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: () => void;
}) {
  return (
    <div className="answered-row">
      <span className="meta">{label}</span>
      <span className="answered-value">{value}</span>
      <button
        id={id}
        className="text-button"
        aria-label={`Change ${label.toLowerCase()}`}
        onClick={onChange}
      >
        Change
      </button>
    </div>
  );
}
// The person's own words echoed back as quiet context, with a way to edit them.
function Echo({
  text,
  detail,
  editLabel,
  onEdit,
  purpose,
  onEditPurpose,
}: {
  text: string;
  detail?: string;
  editLabel: string;
  onEdit: () => void;
  purpose?: string;
  onEditPurpose?: () => void;
}) {
  return (
    <>
      <div className="echo">
        <p className="meta echo-body">
          You’re avoiding: <span className="echo-text">{text}</span>
          {detail && <> · {detail}</>}
        </p>
        <button className="text-button" aria-label={editLabel} onClick={onEdit}>
          Edit
        </button>
      </div>
      {purpose && onEditPurpose && (
        <div className="echo">
          <p className="meta echo-body">
            For: <span className="echo-text">{purpose}</span>
          </p>
          <button
            className="text-button"
            aria-label="Edit what this is for"
            onClick={onEditPurpose}
          >
            Edit
          </button>
        </div>
      )}
    </>
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
// An open, hand-drawn ring rather than a mechanical loader, echoing the map's own loop motif.
function Spinner() {
  return (
    <svg
      className="spinner"
      viewBox="0 0 24 24"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="34 22"
      />
    </svg>
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
  // The encounter a trail stone opened, scrolled to and expanded in Atlas.
  const [atlasFocus, setAtlasFocus] = useState<string | null>(null);
  const [backup, setBackup] = useState<Saved | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [restoreMessage, setRestoreMessage] = useState('');
  // Return: an answered question collapses to a summary until the person reopens it.
  const [reopened, setReopened] = useState<'actual' | 'urge' | 'worry' | null>(
    null,
  );
  // Arrow keys select as they move, so a keyed answer stays open until focus leaves it.
  const keyed = useRef(false);
  const pendingFocus = useRef<string | null>(null);
  // Clarify: "Something else" may be preselected; its text field waits for an explicit pick.
  const [pickedOther, setPickedOther] = useState(false);
  // Setup's worry field. Not part of Saved: like the prediction, it's a
  // fresh guess each time, so it never needs to survive a reload.
  const [showWorry, setShowWorry] = useState(false);
  const [worryDraft, setWorryDraft] = useState('');
  // Setup's purpose input. Unlike worry, its value lives on the draft
  // itself, so this only tracks whether the input is open.
  const [showPurpose, setShowPurpose] = useState(false);
  // Atlas: an unanswered worry being given a later answer.
  const [editingWorryId, setEditingWorryId] = useState<string | null>(null);
  const [worrySavedId, setWorrySavedId] = useState<string | null>(null);
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
        'Your saved trail could not be read. It has not been overwritten. You can export it in Me before clearing it.',
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
        'Your trail changed in another tab. Export any unfinished work here, then reload to use the latest trail.',
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
        'This browser could not save your trail. Keep this page open and export your data in Me.',
      );
    }
  }, [s, ready]);
  useEffect(() => {
    if (ready) {
      window.scrollTo({ top: 0 });
      heading.current?.focus();
    }
  }, [s.screen, ready]);
  // A stone opened from the trail: land on its entry, already expanded.
  useEffect(() => {
    if (s.screen !== 'atlas' || !atlasFocus) return;
    const entry = document.getElementById(`entry-${atlasFocus}`);
    if (!entry) return;
    entry.querySelector('details')?.setAttribute('open', '');
    entry.scrollIntoView({ block: 'start' });
    entry.focus({ preventScroll: true });
  }, [s.screen, atlasFocus]);
  // Collapsing a question unmounts the focused control, so focus moves to the
  // heading named here once it has rendered. No deps: it checks after every render.
  useEffect(() => {
    const target =
      pendingFocus.current && document.getElementById(pendingFocus.current);
    if (target) {
      pendingFocus.current = null;
      target.focus();
    }
  });
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
        draft: {
          ...draft,
          resistanceNote: s.custom,
          purpose: lastPurpose(s.encounters, situation),
        },
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
        title: 'Choose your own step',
        action: '',
        purpose: lastPurpose(s.encounters, situation),
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

  const title = (text: string, className?: string) => (
    <h1 ref={heading} tabIndex={-1} className={className} id="screen-title">
      {text}
    </h1>
  );
  async function resolve() {
    setPickedOther(false);
    setShowWorry(false);
    setWorryDraft('');
    setShowPurpose(false);
    if (await requestStep(null)) return;
    const guess = infer(s.situation);
    const draft = {
      ...candidate(s.situation.trim(), guess.resistance, s.encounters),
      purpose: lastPurpose(s.encounters, s.situation),
    };
    patch({
      resistance: guess.resistance,
      draft,
      prediction: null,
      predictionNote: '',
      screen: guess.confident ? 'setup' : 'clarify',
    });
  }
  async function setup() {
    setShowWorry(false);
    setWorryDraft('');
    setShowPurpose(false);
    if (await requestStep(s.resistance)) return;
    patch({
      draft: {
        ...candidate(s.situation.trim(), s.resistance, s.encounters),
        resistanceNote: s.custom,
        purpose: lastPurpose(s.encounters, s.situation),
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
    setSuggestionMessage('');
    setReopened(null);
    patch({
      session: {
        ...s.draft,
        id: crypto.randomUUID(),
        prediction: s.prediction,
        predictionNote: s.predictionNote,
        worry: worryDraft.trim(),
        startedAt: Date.now(),
        actual: null,
        urge: '',
        notices: [],
        note: '',
        stopped: false,
      },
      screen: 'active',
    });
    setShowWorry(false);
    setWorryDraft('');
    setShowPurpose(false);
  }
  function updateSession(p: Partial<Session>) {
    if (s.session) patch({ session: { ...s.session, ...p } });
  }
  function returnFrom(stopped = false) {
    if (s.session) {
      setSuggestionMessage('');
      setReopened(null);
      keyed.current = false;
      pendingFocus.current = null;
      patch({
        session: { ...s.session, returnedAt: Date.now(), stopped },
        screen: 'return',
      });
    }
  }
  function finish(notStarted = false) {
    if (!s.session) return;
    const a = s.session;
    if (
      !notStarted &&
      (!validScale(a.actual) ||
        !a.urge ||
        (a.worry?.trim() && !a.worryHappened))
    ) {
      return;
    }
    const date = new Date();
    const e: Encounter = {
      ...a,
      actual: notStarted ? null : a.actual,
      notices: notStarted ? [] : a.notices,
      worryHappened: notStarted ? undefined : a.worryHappened,
      outcome: notStarted
        ? 'not_started'
        : a.urge === 'stopped' || a.stopped
          ? 'stopped'
          : 'attempted',
      createdAt: Date.now(),
      localDate: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
    };
    setSuggestionMessage('');
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
    ? {
        ...candidate(last.situation, last.resistance, s.encounters),
        purpose: lastPurpose(s.encounters, last.situation),
      }
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
  // A bluff discovery is about whether the worry happened, not discomfort:
  // the arrow pair means expected → experienced everywhere else, so it isn't reused here.
  const bluffCounts =
    newDiscovery?.rule === 'bluff'
      ? {
          no: discoveryEvidence.filter((e) => e.worryHappened === 'no').length,
          partly: discoveryEvidence.filter((e) => e.worryHappened === 'partly')
            .length,
          yes: discoveryEvidence.filter((e) => e.worryHappened === 'yes')
            .length,
        }
      : null;
  const worrySplit: [string, string] = last
    ? splitWorryLine(worryLine(last))
    : ['', ''];
  const filteredEncounters = atlasTerritory
    ? s.encounters.filter((e) => e.territory === atlasTerritory)
    : s.encounters;
  const filteredDiscoveries = atlasTerritory
    ? found.filter((d) => d.territory === atlasTerritory)
    : found;
  const backupSummary = backup ? restoreSummary(s, backup) : null;
  const steps = taken(s.encounters);
  // Only explain half-filled stones when one is on screen.
  const stoppedShown = trailStones(s.encounters).stones.some(
    (st) => st.stopped,
  );
  function showTerritory(t: Territory) {
    setAtlasFocus(null);
    setAtlasTerritory(t);
  }
  function openEntry(id: string | null) {
    setAtlasTerritory(null);
    setAtlasFocus(id);
    go('atlas');
  }
  // An unanswered worry ("can't tell yet") shows its three buttons; so does
  // one being changed. A worry already answered, from Return or from here,
  // shows the line and (for a later answer) a Change button instead.
  function showWorryButtons(e: Encounter) {
    return (
      e.worryHappened === 'unknown' &&
      (!e.worryLater || editingWorryId === e.id)
    );
  }
  function pickWorryLater(id: string, value: 'no' | 'partly' | 'yes') {
    patch({
      encounters: updateEncounter(s.encounters, id, { worryLater: value }),
    });
    setEditingWorryId(null);
    setWorrySavedId(id);
    pendingFocus.current = `worry-change-${id}`;
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
        'Export the unreadable data, then clear this device’s trail before restoring a backup.',
      );
      return;
    }
    const merged = mergeBackup(s, backup);
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
      setS(merged);
      setRestoreMessage('Your backup has been merged into this trail.');
      setBackup(null);
    } catch {
      setRestoreError(
        'Your browser could not save the restored trail. Your existing trail has not changed.',
      );
    }
  }

  const nav = ['map', 'atlas', 'me'].includes(s.screen);
  const active = s.session;
  const actualOpen = active?.actual === null || reopened === 'actual';
  const urgeOpen = !active?.urge || reopened === 'urge';
  const hasWorry = !!active?.worry?.trim();
  const worryOpen =
    hasWorry && (!active?.worryHappened || reopened === 'worry');
  // Base UI commits a change before the click reaches the label, so a keyed
  // answer is held open here rather than in picked().
  function answer(question: 'actual' | 'urge' | 'worry', p: Partial<Session>) {
    updateSession(p);
    if (keyed.current) {
      setReopened(question);
    }
  }
  // A pointer pick closes the question, even when it repeats the same value.
  function picked(question: 'actual' | 'urge' | 'worry') {
    if (keyed.current) {
      return;
    }
    setReopened(null);
    pendingFocus.current =
      question === 'actual' && !active?.urge
        ? 'urge-label'
        : question === 'worry' || !hasWorry || active?.worryHappened
          ? 'noticing-label'
          : 'worry-label';
  }
  // Only a move to another control counts; leaving the window keeps it open.
  function left(question: 'actual' | 'urge' | 'worry', e: React.FocusEvent) {
    const outside =
      e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node);
    if (keyed.current && outside && reopened === question) {
      setReopened(null);
    }
  }
  function change(question: 'actual' | 'urge' | 'worry') {
    pendingFocus.current = `${question}-label`;
    setReopened(question);
  }
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
        <p>Opening your trail…</p>
      </main>
    );
  return (
    <main className={`shell ${nav ? 'with-nav' : ''}`}>
      <header>
        {s.screen === 'me' ? (
          <button
            className="back"
            aria-label="Go back"
            onClick={() =>
              go(s.session ? 'active' : s.encounters.length ? 'map' : 'name')
            }
          >
            ←
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
            My trail
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
      {suggestionMessage && s.screen !== 'setup' && (
        <p className="notice" role="status">
          {suggestionMessage}
        </p>
      )}
      {busy && (
        <div role="status" className="loading">
          <p>
            <Spinner /> Finding a small step…
          </p>
          <button
            className="text-button"
            onClick={() => {
              suggestionRequest.current.cancel();
              setBusy(false);
              setShowWorry(false);
              setWorryDraft('');
              setShowPurpose(false);
              const draft = {
                ...candidate(s.situation.trim(), s.resistance, s.encounters),
                purpose: lastPurpose(s.encounters, s.situation),
              };
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
      {s.screen === 'name' && !busy && (
        <section className="opening screen-fade-in">
          {title('What do you keep turning away from?')}
          <p className="premise">
            Threshold turns the things you avoid into territory you can explore.
          </p>
          <div className="entry">
            <textarea
              id="situation"
              aria-labelledby="screen-title"
              aria-describedby="situation-hint"
              value={s.situation}
              maxLength={2000}
              onChange={(e) => patch({ situation: e.target.value })}
            />
            <p className="meta hint" id="situation-hint">
              A conversation, starting a project, answering a message, making a
              decision.
            </p>
          </div>
          <Primary disabled={!s.situation.trim() || busy} onClick={resolve}>
            Continue
          </Primary>
        </section>
      )}
      {s.screen === 'clarify' && !busy && (
        <section className="screen-fade-in clarify">
          <Echo
            text={s.situation}
            editLabel="Edit what I’m avoiding"
            onEdit={() => go('name')}
          />
          {title('What makes it hard to take a step?')}
          <p className="meta question-hint" id="resistance-hint">
            Pick the main thing for now. It doesn’t have to explain everything.
          </p>
          <RadioGroup
            className="choices"
            value={s.resistance}
            onValueChange={(v) => {
              setPickedOther(v === 'other');
              patch({ resistance: v as Resistance });
            }}
            aria-label="What makes it hard to take a step?"
            aria-describedby="resistance-hint"
          >
            {resistanceChoices.map(([v, l]) => (
              <label
                className={`choice ${s.resistance === v ? 'selected' : ''}`}
                key={v}
                // A preselected "Something else" fires no change when clicked.
                onClick={v === 'other' ? () => setPickedOther(true) : undefined}
              >
                <span>{l}</span>
                <RadioGroupItem value={v} />
              </label>
            ))}
          </RadioGroup>
          {s.resistance === 'other' && (pickedOther || s.custom) && (
            <label className="field-label panel-extension">
              What makes it hard?
              <textarea
                className="text-input"
                value={s.custom}
                maxLength={1000}
                // Once used, the field stays even if its text is cleared.
                onFocus={() => setPickedOther(true)}
                onChange={(e) => patch({ custom: e.target.value })}
              />
            </label>
          )}
          <Primary disabled={busy} onClick={setup}>
            Continue
          </Primary>
        </section>
      )}
      {s.screen === 'setup' && s.draft && (
        <section className="setup">
          {/*
           * No map preview here: on a first situation there is no history yet
           * for it to show, so it read as an unexplained, empty rectangle.
           * The real map (with real routes) still lives on the Map screen.
           */}
          <Echo
            text={s.situation}
            detail={
              s.resistance === 'other'
                ? s.custom
                : resistanceChoices.find(([v]) => v === s.resistance)?.[1]
            }
            editLabel="Edit what makes it hard"
            onEdit={() => go('clarify')}
            purpose={showPurpose ? undefined : s.draft.purpose?.trim()}
            onEditPurpose={() => setShowPurpose(true)}
          />
          {title(s.draft.title)}
          <div>
            <textarea
              id="action"
              aria-label="Your step"
              className="text-input action-input lead"
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
              <span className="duration-label">{s.draft!.minutes} min</span>
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
            </div>
          </div>
          <Scale
            id="expected"
            label="How uncomfortable do you expect this to be?"
            value={s.prediction}
            onChange={(prediction) => patch({ prediction })}
          />
          <Primary
            onClick={begin}
            disabled={!s.draft.action.trim() || s.prediction === null}
          >
            Begin
          </Primary>
          {/* Explains the loop once; after a first encounter it is known. */}
          {s.encounters.length === 0 && (
            <p className="meta mechanic-note">
              You'll leave the app to try this for real, then say what actually
              happened.
            </p>
          )}
          {(showWorry || worryDraft) && (
            <>
              <label className="field-label" htmlFor="worry">
                What are you worried will happen?{' '}
                <span className="optional">Optional</span>
              </label>
              <textarea
                className="text-input"
                id="worry"
                value={worryDraft}
                maxLength={1000}
                autoFocus={showWorry && !worryDraft}
                placeholder={
                  s.draft.territory === 'spotlight'
                    ? 'They’ll think it’s a silly question.'
                    : s.draft.territory === 'fog'
                      ? 'I’ll get it wrong and have to start over.'
                      : s.draft.territory === 'loop'
                        ? 'I’ll miss a mistake that matters.'
                        : s.draft.territory === 'water'
                          ? 'I won’t be able to stay with it.'
                          : 'Something you could check afterwards.'
                }
                onFocus={() => setShowWorry(true)}
                onChange={(e) => setWorryDraft(e.target.value)}
              />
            </>
          )}
          {showPurpose && (
            <>
              <label className="field-label" htmlFor="purpose">
                What is this for? <span className="optional">Optional</span>
              </label>
              <input
                className="text-input"
                id="purpose"
                type="text"
                value={s.draft.purpose ?? ''}
                maxLength={300}
                autoFocus
                placeholder="Who it helps, or what it makes possible."
                onChange={(e) =>
                  patch({ draft: { ...s.draft!, purpose: e.target.value } })
                }
              />
            </>
          )}
          {(!(showWorry || worryDraft) ||
            (!s.draft.purpose?.trim() && !showPurpose)) && (
            <div className="setup-links">
              {!(showWorry || worryDraft) && (
                <button
                  className="text-button note-toggle"
                  onClick={() => setShowWorry(true)}
                >
                  Name a worry
                </button>
              )}
              {!s.draft.purpose?.trim() && !showPurpose && (
                <button
                  className="text-button note-toggle"
                  onClick={() => setShowPurpose(true)}
                >
                  Name what it’s for
                </button>
              )}
            </div>
          )}
          {suggestionMessage && (
            <p className="notice" role="status">
              {suggestionMessage}
            </p>
          )}
        </section>
      )}
      {s.screen === 'active' && active && (
        <section className="active">
          {title(active.title, 'sr-only')}
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
          <div className="step-text">
            <p className="meta">Your step</p>
            <p className="lead">{active.action}</p>
          </div>
          {active.purpose?.trim() && (
            <p className="meta purpose-block">For: {active.purpose}</p>
          )}
          <p className="invitation">
            Go do it. Come back when you're done, or when something interesting
            happens.
          </p>
          <p className="meta timer-note">
            Time keeps counting when you leave the app.
          </p>
          <div className="action-pair">
            <button className="secondary" onClick={() => returnFrom(true)}>
              Stop
            </button>
            <Primary onClick={() => returnFrom()}>I'm back</Primary>
          </div>
        </section>
      )}
      {s.screen === 'return' && active && (
        <section
          onKeyDownCapture={() => {
            keyed.current = true;
          }}
          onPointerDownCapture={() => {
            keyed.current = false;
          }}
        >
          {title('What happened?', 'sr-only')}
          {actualOpen && (
            <Scale
              id="actual"
              label="How uncomfortable was it actually?"
              value={active.actual}
              onChange={(actual) => answer('actual', { actual })}
              onPick={() => picked('actual')}
              onLeave={(e) => left('actual', e)}
            />
          )}
          {/* Answers already given share one surface, apart from the open question. */}
          {(!actualOpen || !urgeOpen || (hasWorry && !worryOpen)) && (
            <div className="summary">
              {!actualOpen && (
                <AnsweredRow
                  label="Discomfort"
                  value={`${active.actual} of 10`}
                  onChange={() => change('actual')}
                />
              )}
              {!urgeOpen && (
                <AnsweredRow
                  label="Urge"
                  value={
                    urgeChoices.find(([v]) => v === active.urge)?.[1] ?? ''
                  }
                  onChange={() => change('urge')}
                />
              )}
              {hasWorry && !worryOpen && (
                <AnsweredRow
                  label="Worry"
                  value={
                    worryHappenedChoices.find(
                      ([v]) => v === active.worryHappened,
                    )?.[1] ?? ''
                  }
                  onChange={() => change('worry')}
                />
              )}
            </div>
          )}
          {active.actual !== null && urgeOpen && (
            <section className="reveal" onBlur={(e) => left('urge', e)}>
              <h2 id="urge-label" tabIndex={-1}>
                Did an urge to avoid or leave show up?
              </h2>
              <RadioGroup
                className="choices"
                value={active.urge}
                onValueChange={(v) => answer('urge', { urge: v as Urge })}
                aria-labelledby="urge-label"
              >
                {urgeChoices.map(([v, l]) => (
                  <label
                    className={`choice ${active.urge === v ? 'selected' : ''}`}
                    key={v}
                    onClick={() => picked('urge')}
                  >
                    <span>{l}</span>
                    <RadioGroupItem value={v} />
                  </label>
                ))}
              </RadioGroup>
            </section>
          )}
          {active.actual !== null && active.urge && hasWorry && worryOpen && (
            <section className="reveal" onBlur={(e) => left('worry', e)}>
              <h2 id="worry-label" tabIndex={-1}>
                Did what you were worried about happen?
              </h2>
              <p className="meta question-hint" id="worry-hint">
                “{active.worry}”
              </p>
              <RadioGroup
                className="choices"
                value={active.worryHappened ?? ''}
                onValueChange={(v) =>
                  answer('worry', {
                    worryHappened: v as Session['worryHappened'],
                  })
                }
                aria-labelledby="worry-label"
                aria-describedby="worry-hint"
              >
                {worryHappenedChoices.map(([v, l]) => (
                  <label
                    className={`choice ${active.worryHappened === v ? 'selected' : ''}`}
                    key={v}
                    onClick={() => picked('worry')}
                  >
                    <span>{l}</span>
                    <RadioGroupItem value={v} />
                  </label>
                ))}
              </RadioGroup>
            </section>
          )}
          {active.actual !== null &&
            active.urge &&
            (!hasWorry || active.worryHappened) && (
              <section className="reveal">
                <h2 id="noticing-label" tabIndex={-1}>
                  What did you notice?
                </h2>
                <p className="meta question-hint" id="noticing-hint">
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
                  <label className="field-label panel-extension">
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
                {/* Optional: a quiet Skip until something is chosen. */}
                {active.notices.length ? (
                  <Primary onClick={() => finish()}>Continue</Primary>
                ) : (
                  <button
                    className="secondary continue"
                    onClick={() => finish()}
                  >
                    Skip
                  </button>
                )}
              </section>
            )}
          <button className="text-button exit" onClick={() => finish(true)}>
            I didn't start
          </button>
        </section>
      )}
      {s.screen === 'observation' && last && (
        <section className="observation">
          <Trail
            encounters={s.encounters}
            found={found}
            revealId={last.id}
            newDiscoveryId={newDiscovery?.id}
          />
          <p className="meta trail-key">
            {trailCaption(last, s.encounters)}
            {bluffCounts && ' Stones show expected → felt.'}
            {stoppedShown && ' Half-filled means you stopped early.'}
          </p>
          <div className={newDiscovery ? 'discovery-reveal' : undefined}>
            <p className="eyebrow accent">
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
            {last.actual !== null &&
              (bluffCounts ? (
                <>
                  <div className="evidence">
                    <div>
                      <span className="meta">Worries that didn’t happen</span>
                      <strong>
                        {bluffCounts.no} of {discoveryEvidence.length}
                      </strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="evidence">
                  <div>
                    <span className="meta">Expected</span>
                    <strong>
                      {newDiscovery ? expectedMean.toFixed(1) : last.prediction}
                    </strong>
                  </div>
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                  <div>
                    <span className="meta">Experienced</span>
                    <strong>
                      {newDiscovery ? experiencedMean.toFixed(1) : last.actual}
                    </strong>
                  </div>
                </div>
              ))}
            {newDiscovery && (
              <p className="optional evidence-scope">
                Across {discoveryEvidence.length} encounters{' '}
                {territories[newDiscovery.territory].description
                  .replace(/^When/, 'when')
                  .replace(/\.$/, '')}
                .
                {bluffCounts &&
                  bluffCounts.partly + bluffCounts.yes > 0 &&
                  ` ${bluffCounts.partly} partly happened, ${bluffCounts.yes} happened.`}
              </p>
            )}
            <p className="observation-copy">
              {newDiscovery?.body ?? observation(last).body}
            </p>
            {worrySplit[0] && (
              <p className="observation-copy">
                <span className="meta">{worrySplit[0]}</span> {worrySplit[1]}
                {last.worryHappened === 'unknown' &&
                  !last.worryLater &&
                  ' You can answer later from the Atlas.'}
              </p>
            )}
          </div>
          <Primary onClick={() => go('map')}>See my trail</Primary>
        </section>
      )}
      {s.screen === 'map' && (
        <section>
          {steps.length ? (
            <>
              <h1 className="sr-only" ref={heading} tabIndex={-1}>
                Your trail
              </h1>
              <Trail
                encounters={s.encounters}
                found={found}
                next={next}
                onStep={openEntry}
                onEarlier={() => openEntry(null)}
              />
              <p className="meta trail-key">
                {pattern(s.encounters)} {worryPattern(s.encounters)} Stones show
                expected → felt
                {stoppedShown && '; half-filled means you stopped early'}. Tap
                one to open it.
              </p>
            </>
          ) : (
            <>
              {/* With a step waiting, the step leads and this line joins the trail's key. */}
              {next ? (
                <h1 className="sr-only" ref={heading} tabIndex={-1}>
                  Your trail
                </h1>
              ) : (
                title('Your trail starts with something real.')
              )}
              {next && <Trail encounters={[]} next={next} />}
              <p className="meta trail-key">
                {next && 'Your trail starts with something real. '}Each step you
                take adds a stone.
              </p>
            </>
          )}
          {next && (
            <>
              <p className="eyebrow">Today's Threshold · {next.minutes} min</p>
              {/* Which situation this reflects, not just the resulting step — this is
               * always the most recent one, and without it there is no way to tell
               * whether it's still the thing worth continuing before committing to it. */}
              <p className="meta situation-context">{next.situation}</p>
              <h2 className="home-step">{next.title}</h2>
              <p>
                {next.action ||
                  'Choose a small step toward the situation you last brought here.'}
              </p>
              {next.purpose?.trim() && (
                <p className="meta">For: {next.purpose}</p>
              )}
              <Primary
                onClick={() => {
                  setShowWorry(false);
                  setWorryDraft('');
                  setShowPurpose(false);
                  patch({
                    draft: next,
                    situation: next.situation,
                    resistance: next.resistance,
                    prediction: null,
                    predictionNote: '',
                    screen: 'setup',
                  });
                }}
              >
                Explore
              </Primary>
            </>
          )}
          <button
            className="secondary avoid-row"
            onClick={() =>
              patch({ situation: '', custom: '', draft: null, screen: 'name' })
            }
          >
            {/* With a step already here, this starts a different situation. */}
            {next ? 'Work on something else' : "I'm avoiding something"}
          </button>
        </section>
      )}
      {s.screen === 'atlas' && (
        <section>
          {title(
            atlasTerritory ? territories[atlasTerritory].name : 'Your atlas',
            'tab-title',
          )}
          {atlasTerritory && (
            <p className="meta">{territories[atlasTerritory].description}</p>
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
            <>
              <p>
                Every real attempt lands here — what you expected, what actually
                happened, and the patterns that show up once there are a few to
                compare.
              </p>
              <button
                className="secondary avoid-row"
                onClick={() =>
                  patch({
                    situation: '',
                    custom: '',
                    draft: null,
                    screen: 'name',
                  })
                }
              >
                I'm avoiding something
              </button>
            </>
          )}
          {filteredDiscoveries.map((d) => (
            <article className="atlas-entry discovery-entry panel" key={d.id}>
              <p className="eyebrow accent">
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
                      {d.rule === 'bluff' ? worryLine(e) : observation(e).body}
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
            <article
              className="atlas-entry"
              key={e.id}
              id={`entry-${e.id}`}
              tabIndex={-1}
            >
              <p className="eyebrow">
                {new Date(e.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                ·{' '}
                {atlasTerritory ? (
                  territories[e.territory].name
                ) : (
                  <button
                    className="eyebrow-link"
                    aria-label={`Only show ${territories[e.territory].name}`}
                    onClick={() => showTerritory(e.territory)}
                  >
                    {territories[e.territory].name}
                  </button>
                )}
              </p>
              <h2>{observation(e).title}</h2>
              <p>{observation(e).body}</p>
              {e.worry?.trim() && (
                <>
                  <p className="observation-copy">
                    {worryLine(e)}
                    {!showWorryButtons(e) && e.worryHappened === 'unknown' && (
                      <>
                        {' '}
                        <button
                          id={`worry-change-${e.id}`}
                          className="text-button inline-change"
                          aria-label="Change worry answer"
                          onClick={() => setEditingWorryId(e.id)}
                        >
                          Change
                        </button>
                      </>
                    )}
                  </p>
                  {showWorryButtons(e) && (
                    <div
                      className="choices"
                      role="group"
                      aria-label="Did what you were worried about happen?"
                    >
                      {(['no', 'partly', 'yes'] as const).map((v) => (
                        <button
                          key={v}
                          className="secondary"
                          onClick={() => pickWorryLater(e.id, v)}
                        >
                          {v === 'no'
                            ? 'No'
                            : v === 'partly'
                              ? 'Partly'
                              : 'Yes'}
                        </button>
                      ))}
                    </div>
                  )}
                  {worrySavedId === e.id && (
                    <p role="status" className="sr-only">
                      Saved.
                    </p>
                  )}
                </>
              )}
              <details>
                <summary>The encounter</summary>
                <dl className="facts panel">
                  <dt className="meta">Avoiding</dt>
                  <dd>{e.situation}</dd>
                  <dt className="meta">Step</dt>
                  <dd>{e.action}</dd>
                  {e.purpose && (
                    <>
                      <dt className="meta">What it's for</dt>
                      <dd>{e.purpose}</dd>
                    </>
                  )}
                  {e.resistanceNote && (
                    <>
                      <dt className="meta">What made it hard</dt>
                      <dd>{e.resistanceNote}</dd>
                    </>
                  )}
                  {e.actual !== null && (
                    <>
                      <dt className="meta">Discomfort</dt>
                      <dd>
                        Expected {e.prediction} → Experienced {e.actual}
                      </dd>
                    </>
                  )}
                  {e.predictionNote && (
                    <>
                      <dt className="meta">Expected</dt>
                      <dd>{e.predictionNote}</dd>
                    </>
                  )}
                  <dt className="meta">Urge to leave</dt>
                  <dd>
                    {e.outcome === 'not_started'
                      ? 'Not started'
                      : urgeChoices.find(([v]) => v === e.urge)?.[1]}
                  </dd>
                  {e.notices.length > 0 && (
                    <>
                      <dt className="meta">Noticed</dt>
                      <dd>
                        {e.notices
                          .map(
                            (n) => noticingChoices.find(([v]) => v === n)?.[1],
                          )
                          .join('; ')}
                      </dd>
                    </>
                  )}
                  {e.note && (
                    <>
                      <dt className="meta">Note</dt>
                      <dd>{e.note}</dd>
                    </>
                  )}
                </dl>
              </details>
            </article>
          ))}
          {!atlasTerritory &&
            s.encounters.length > 0 &&
            s.encounters.length < 4 && (
              <p className="optional">
                Patterns show up here once there are a few more encounters to
                compare.
              </p>
            )}
        </section>
      )}
      {s.screen === 'me' && (
        <section>
          {title('A trail of your own')}
          {s.session && (
            <Primary onClick={() => go('active')}>
              Return to your expedition
            </Primary>
          )}
          {saveBlocked.current && (
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Reload the saved trail
            </button>
          )}
          <h2 className="section-heading keep-heading">Keep your trail</h2>
          <p>
            Your trail lives only in this browser, and clearing browser data
            erases it. Save a copy now and then.
          </p>
          <div className="data-actions">
            {/* An expedition in progress keeps the one primary action. */}
            {s.session ? (
              <button className="secondary" onClick={exportData}>
                Export my data
              </button>
            ) : (
              <Primary onClick={exportData}>Export my data</Primary>
            )}
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
                  Merge this backup into your trail?
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
          <AlertDialog>
            <AlertDialogTrigger className="text-button destructive">
              Delete my trail
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete your trail from this device?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your situations, encounters and observations.
                  Export a copy first if you want to keep them.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my trail</AlertDialogCancel>
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
                        'Your trail could not be deleted. Try your browser’s site-data settings.',
                      );
                    }
                  }}
                >
                  Delete my trail
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="meta privacy">
            Suggestions send what you’re avoiding and what makes it hard, never
            your trail.
          </p>
        </section>
      )}
      {nav && (
        <nav className="bottom-nav" aria-label="Main navigation">
          {(['map', 'atlas', 'me'] as Screen[]).map((n, i) => (
            <button
              key={n}
              aria-current={s.screen === n ? 'page' : undefined}
              onClick={() => {
                if (n === 'atlas') {
                  setAtlasTerritory(null);
                  setAtlasFocus(null);
                }
                go(n);
              }}
            >
              <span aria-hidden="true">{['↗', '▤', '○'][i]}</span>
              {['Trail', 'Atlas', 'Me'][i]}
            </button>
          ))}
        </nav>
      )}
    </main>
  );
}
