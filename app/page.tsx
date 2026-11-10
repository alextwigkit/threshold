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
  resistanceChoices,
  noticingChoices,
  noticeLabels,
  remaining,
  observation,
  compare,
  patternEvidence,
  patternMeaning,
  discoveries,
  appendEncounter,
  updateEncounter,
  worryLine,
  lastPurpose,
  toggleNotice,
  validScale,
  stepReasons,
  blankStepHints,
  careHint,
  urgeOnReturn,
  isLateReturn,
  startedDay,
  type Resistance,
  type Session,
  type Encounter,
  type Urge,
} from '@/lib/engine';
import { statedMinutes, timeLine, timeTaken } from '@/lib/duration';
import Trail from './trail';
import {
  pattern,
  taken,
  trailStones,
  worryPattern,
  groupBySituation,
  recentSituations,
  trailKey,
} from '@/lib/trail';
import { SuggestionRequest } from '@/lib/suggestions';
import {
  guessChoices,
  noticedChoices,
  noticedLabels,
  recognised,
  usualLines,
  watchedChoices,
  watchLine,
  type Drift,
  type Moment,
  type Noticed,
} from '@/lib/moments';
import {
  KEY,
  initial,
  parseSaved,
  mergeBackup,
  restoreSummary,
  screenOnOpen,
  type Saved,
  type Screen,
} from '@/lib/storage';
// Offered only after "I'm done": a stop already answers this, so Return
// records 'stopped' directly instead of asking (see urgeOnReturn).
const urgeChoices: [Urge, string][] = [
  ['no', 'No'],
  ['stayed', 'Yes, but I kept going'],
  ['returned', 'Yes, I paused and came back'],
];
// A label for every urge code, including 'stopped', for rows and History
// that show an already-recorded answer rather than the question itself.
const urgeLabels: Record<Urge, string> = {
  '': '',
  no: 'No',
  stayed: 'Yes, but I kept going',
  returned: 'Yes, I paused and came back',
  stopped: 'Stopped partway',
};
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
  labelledBy,
  value,
  onChange,
  onPick,
  onLeave,
}: {
  id: string;
  label: string;
  // When set, an outside heading already names the scale, so no visible
  // label is printed here and the radio group points at it instead.
  labelledBy?: string;
  value: number | null;
  onChange: (n: number) => void;
  onPick?: () => void;
  onLeave?: (e: React.FocusEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="scale-field" onBlur={onLeave}>
      {labelledBy === undefined && (
        <div className="scale-legend" id={`${id}-label`} tabIndex={-1}>
          {label}
        </div>
      )}
      <RadioGroup
        className="scale"
        value={value === null ? '' : String(value)}
        onValueChange={(v) => onChange(Number(v))}
        aria-labelledby={labelledBy ?? `${id}-label`}
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
// "2 steps and 1 noticed moment will be added. 3 already here will stay as they are."
function restoreLine(
  summary: ReturnType<typeof restoreSummary> | null,
): string {
  const count = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;
  const added = summary?.added ?? 0;
  const moments = summary?.momentsAdded ?? 0;
  const kept = (summary?.duplicates ?? 0) + (summary?.momentDuplicates ?? 0);
  const parts = [
    ...(added || !moments ? [count(added, 'step', 'steps')] : []),
    ...(moments ? [count(moments, 'noticed moment', 'noticed moments')] : []),
  ];
  const stay = kept === 1 ? 'will stay as it is' : 'will stay as they are';
  return `${parts.join(' and ')} will be added. ${kept} already here ${stay}.`;
}
const durationChoices = [1, 3, 5, 10];
// A row of duration chips, styled like the scale's own choice cells. When the
// draft holds a value outside the usual four, an extra chip shows it selected
// instead of silently dropping it.
function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (minutes: number) => void;
}) {
  const options = durationChoices.includes(value)
    ? durationChoices
    : [...durationChoices, value].sort((a, b) => a - b);
  return (
    <div className="duration-field">
      <div className="duration-legend" id="duration-label">
        How many minutes?
      </div>
      <RadioGroup
        className="duration-choices"
        value={String(value)}
        onValueChange={(v) => onChange(Number(v))}
        aria-labelledby="duration-label"
      >
        {options.map((m) => (
          <label
            className={`scale-choice ${value === m ? 'selected' : ''}`}
            key={m}
          >
            <RadioGroupItem value={String(m)} />
            <span>{m}</span>
          </label>
        ))}
      </RadioGroup>
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
  // Absent when there is no question left to reopen (a stop, recorded
  // automatically, has no urge question behind it).
  onChange?: () => void;
}) {
  return (
    <div className="answered-row">
      <span className="meta">{label}</span>
      <span className="answered-value">{value}</span>
      {onChange && (
        <button
          id={id}
          className="text-button"
          aria-label={`Change ${label.toLowerCase()}`}
          onClick={onChange}
        >
          Change
        </button>
      )}
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
  id,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button id={id} className="primary" onClick={onClick} disabled={disabled}>
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
  // The encounter a trail stone opened, scrolled to and expanded in Atlas.
  const [atlasFocus, setAtlasFocus] = useState<string | null>(null);
  // History: which step groups (by situation) are expanded.
  // History groups the person opened or closed; the rest use the default.
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});
  const [backup, setBackup] = useState<Saved | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [restoreMessage, setRestoreMessage] = useState('');
  // The noticing form; short enough that its text isn't saved across a reload.
  const [noticeWhat, setNoticeWhat] = useState('');
  const [noticeSaying, setNoticeSaying] = useState('');
  const [noticeWhen, setNoticeWhen] = useState<Noticed>('now');
  // After noticing: the smallest-version field, and a minute stopped early.
  const [smallestOpen, setSmallestOpen] = useState(false);
  const [smallestText, setSmallestText] = useState('');
  const [watchEnded, setWatchEnded] = useState(false);
  // The guess before a watch, saved only when the minute starts.
  const [guessDraft, setGuessDraft] = useState<Drift | undefined>(undefined);
  // History: older noticed moments stay folded away until asked for.
  const [allMoments, setAllMoments] = useState(false);
  // Return: an answered question collapses to a summary until the person reopens it.
  const [reopened, setReopened] = useState<'actual' | 'urge' | 'worry' | null>(
    null,
  );
  // Arrow keys select as they move, so a keyed answer stays open until focus leaves it.
  const keyed = useRef(false);
  const pendingFocus = useRef<string | null>(null);
  // Clarify: "Something else" may be preselected; its text field waits for an explicit pick.
  const [pickedOther, setPickedOther] = useState(false);
  // Setup's purpose input. Unlike worry, its value lives on the draft
  // itself, so this only tracks whether the input is open.
  const [showPurpose, setShowPurpose] = useState(false);
  // Your step: whether the field was empty when the person arrived on this
  // half, so the heading and hint don't flip while they type.
  const [blankAtArrival, setBlankAtArrival] = useState(false);
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
        setS(screenOnOpen(parseSaved(raw), Date.now()));
        rawUnreadable.current = null;
      }
    } catch {
      saveBlocked.current = true;
      setError(
        'Your saved data could not be read. It has not been overwritten. You can download it from Your data before clearing it.',
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
        'Your data changed in another tab. Download any unfinished work here, then reload to use the latest version.',
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
        'This browser could not save your data. Keep this page open and download a backup from Your data.',
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
              'Open a new situation for user review. Does not start or record a step.',
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
              if (s.session) throw Error('Return from the active step first.');
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
  useEffect(() => {
    setBlankAtArrival(!s.draft?.action.trim());
  }, [s.screen, s.setupPart, s.draft?.situation]);
  useEffect(() => () => suggestionRequest.current.cancel(), []);
  const go = (screen: Screen) => {
    suggestionRequest.current.cancel();
    setBusy(false);
    setSuggestionMessage('');
    patch({ screen });
  };
  const history = s.encounters.length > 0 || s.moments.length > 0;
  const moment = s.moments.find((m) => m.id === s.momentId);
  const lines = usualLines(s.moments);
  function updateMoment(id: string, change: Partial<Moment>) {
    setS((v) => ({
      ...v,
      moments: v.moments.map((m) => (m.id === id ? { ...m, ...change } : m)),
    }));
  }
  function startNotice() {
    setNoticeWhat('');
    setNoticeSaying('');
    setNoticeWhen('now');
    go('notice');
  }
  function saveNotice() {
    const what = noticeWhat.trim();
    if (!what) {
      return;
    }
    const m: Moment = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      noticed: noticeWhen,
      what,
      saying: noticeSaying.trim(),
    };
    setSmallestOpen(false);
    setSmallestText('');
    patch({ moments: [...s.moments, m], momentId: m.id, screen: 'noticed' });
  }
  function leaveMoment() {
    setSmallestOpen(false);
    patch({ momentId: undefined, screen: 'map' });
  }
  // The on-device step: used offline, when suggestions fail, and on request.
  function builtInStep(confirmed: Resistance | null) {
    const situation = s.situation.trim();
    const guess = confirmed
      ? { resistance: confirmed, confident: true }
      : infer(situation);
    const step = candidate(situation, guess.resistance, s.encounters);
    patch({
      resistance: guess.resistance,
      draft: {
        ...step,
        resistanceNote: s.custom,
        purpose: lastPurpose(s.encounters, situation),
      },
      prediction: null,
      predictionNote: '',
      screen: guess.confident ? 'setup' : 'clarify',
      setupPart: undefined,
      setupFrom: 'clarify',
      worryDraft: undefined,
    });
    return step.action.trim() !== '';
  }
  // Says what the person is looking at: a built-in step, or a blank one to write.
  function fallbackMessage(hasStep: boolean, limit: boolean) {
    const why = limit
      ? 'You’ve reached today’s suggestion limit'
      : 'No suggestion came back this time';
    return hasStep
      ? `${why}, so this is a standard step.`
      : `${why}, so write a step of your own.`;
  }
  async function requestStep(confirmed: Resistance | null) {
    if (!navigator.onLine) return false;
    const epoch = ++requestEpoch.current;
    setBusy(true);
    setSuggestionMessage('');
    const situation = s.situation.trim();
    try {
      const result = await suggestionRequest.current.run(situation, confirmed);
      if (!result) {
        return true;
      }
      if (result.source === 'local') {
        setSuggestionMessage(fallbackMessage(builtInStep(confirmed), false));
        return true;
      }
      let draft = result.candidate;
      const local = candidate(situation, draft.resistance, s.encounters);
      // Previous edits and smaller-dose rules remain local and outrank a new suggestion.
      if (local.userAction) {
        draft = { ...local, careful: draft.careful || local.careful };
      } else if (
        !draft.action.trim() &&
        !draft.careful &&
        local.action.trim()
      ) {
        // A blank model step falls back to the built-in one rather than an empty field.
        draft = local;
      } else {
        // Duration stays on the device (carried choice, smaller dose); a notice step stays at 1.
        draft = {
          ...draft,
          minutes: draft.template === 'model-notice-v1' ? 1 : local.minutes,
        };
      }
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
        setupPart: undefined,
        setupFrom: 'clarify',
        worryDraft: undefined,
      });
      return true;
    } catch (e) {
      setSuggestionMessage(
        fallbackMessage(
          builtInStep(confirmed),
          e instanceof Error && e.message === 'limit',
        ),
      );
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
    setShowPurpose(false);
    if (await requestStep(null)) {
      return;
    }
    builtInStep(null);
  }
  async function setup() {
    setShowPurpose(false);
    if (await requestStep(s.resistance)) {
      return;
    }
    builtInStep(s.resistance);
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
        worry: (s.worryDraft ?? '').trim(),
        startedAt: Date.now(),
        actual: null,
        urge: '',
        notices: [],
        note: '',
        stopped: false,
      },
      screen: 'active',
      setupPart: undefined,
      setupFrom: undefined,
      worryDraft: undefined,
    });
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
        session: {
          ...s.session,
          returnedAt: Date.now(),
          stopped,
          urge: urgeOnReturn(stopped, s.session.urge),
        },
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
  const worrySplit: [string, string] = last
    ? splitWorryLine(worryLine(last))
    : ['', ''];
  const obs = last ? observation(last, next) : null;
  const cmp = last ? compare(last) : null;
  const backupSummary = backup ? restoreSummary(s, backup) : null;
  const steps = taken(s.encounters);
  function openEntry(id: string | null) {
    setAtlasFocus(id);
    const entry = id && s.encounters.find((e) => e.id === id);
    if (entry) {
      const key = entry.situation.trim();
      setGroupOpen((prev) => ({ ...prev, [key]: true }));
    }
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
        'Download the unreadable data, then clear this device’s data before restoring a backup.',
      );
      return;
    }
    const merged = mergeBackup(s, backup);
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
      setS(merged);
      setRestoreMessage('Your backup has been merged in.');
      setBackup(null);
    } catch {
      setRestoreError(
        'Your browser could not save the restored data. Your existing data has not changed.',
      );
    }
  }

  const nav = ['map', 'atlas', 'me'].includes(s.screen);
  const active = s.session;
  // Timer: more than 30 minutes past the end, stop counting down and ask
  // what happened instead.
  const late = !!active && isLateReturn(active, now);
  const timerDone = !!active && remaining(active, now) === 0;
  // Once the timer's done, count up instead of sitting at 0:00.
  const overSeconds = active
    ? Math.max(
        0,
        Math.floor((now - (active.startedAt + active.minutes * 60000)) / 1000),
      )
    : 0;
  // The tab title matches the live region once time is up, so it's visible
  // from another tab too; leaving Timer restores whatever title was there.
  useEffect(() => {
    if (s.screen !== 'active' || late || !timerDone) {
      return;
    }
    const previous = document.title;
    document.title = 'Time’s up · Threshold';
    return () => {
      document.title = previous;
    };
  }, [s.screen, late, timerDone]);
  // When the watched minute runs out on its own, focus moves to its question.
  const watching =
    s.screen === 'watch' &&
    moment?.watchStartedAt !== undefined &&
    !watchEnded &&
    now < moment.watchStartedAt + 60000;
  const wasWatching = useRef(false);
  useEffect(() => {
    if (wasWatching.current && !watching && s.screen === 'watch') {
      heading.current?.focus();
    }
    wasWatching.current = watching;
  }, [watching, s.screen]);
  const actualOpen = active?.actual === null || reopened === 'actual';
  // A stop already answers the urge question (see urgeOnReturn), so Return
  // never reopens it for a stop.
  const urgeOpen = !active?.stopped && (!active?.urge || reopened === 'urge');
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
    a.download = 'threshold-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!ready)
    return (
      <main className="shell">
        <header>
          <span className="brand">Threshold</span>
        </header>
        <p>Opening Threshold…</p>
      </main>
    );
  return (
    <main className={`shell ${nav ? 'with-nav' : ''}`}>
      <header>
        {s.screen === 'me' ? (
          <button
            className="back"
            aria-label="Go back"
            onClick={() => go(s.session ? 'active' : history ? 'map' : 'name')}
          >
            ←
          </button>
        ) : s.screen === 'name' && history ? (
          <button
            className="back"
            aria-label="Go back"
            onClick={() => go('map')}
          >
            ←
          </button>
        ) : !nav &&
          s.screen !== 'name' &&
          s.screen !== 'observation' &&
          s.screen !== 'active' &&
          s.screen !== 'watch' ? (
          <button
            className="back"
            aria-label="Go back"
            onClick={() => {
              if (s.screen === 'notice') {
                go(history ? 'map' : 'name');
                return;
              }
              if (s.screen === 'noticed') {
                leaveMoment();
                return;
              }
              if (s.screen === 'clarify') {
                go('name');
                return;
              }
              if (s.screen === 'setup' && s.setupPart === 'prepare') {
                if (s.setupFrom === 'home') {
                  go('map');
                  return;
                }
                patch({ setupPart: undefined });
                return;
              }
              if (s.screen === 'setup') {
                go(s.setupFrom === 'home' ? 'map' : 'clarify');
                return;
              }
              go(s.screen === 'return' ? 'active' : 'setup');
            }}
          >
            ←
          </button>
        ) : (
          <span className="brand">Threshold</span>
        )}
        {s.screen === 'me' && <span className="brand">Threshold</span>}
        {s.screen === 'name' && history && (
          <span className="brand">Threshold</span>
        )}
        {!nav &&
          s.screen !== 'name' &&
          s.screen !== 'observation' &&
          s.screen !== 'active' &&
          s.screen !== 'watch' && <span className="brand">Threshold</span>}
        {s.screen === 'name' && !history && (
          <button className="text-button" onClick={() => go('me')}>
            Your data
          </button>
        )}
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
          <button className="text-button" onClick={() => go('me')}>
            Open Your data
          </button>
        </div>
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
              setShowPurpose(false);
              builtInStep(s.screen === 'clarify' ? s.resistance : null);
            }}
          >
            Use a standard step instead
          </button>
        </div>
      )}
      {s.screen === 'name' && !busy && (
        <section
          className={`opening screen-fade-in${s.encounters.length > 0 ? ' returning' : ''}`}
        >
          {title('What have you been avoiding?')}
          {s.encounters.length === 0 && (
            <p className="premise">
              Pick one thing. You’ll try a small step for a few minutes, then
              compare how hard you expected it to be with how it actually felt.
            </p>
          )}
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
          <Primary
            id="continue-button"
            disabled={!s.situation.trim() || busy}
            onClick={resolve}
          >
            Continue
          </Primary>
          {!history && (
            <button className="text-button" onClick={startNotice}>
              Or write down a moment of resistance
            </button>
          )}
          {s.encounters.length > 0 &&
            (() => {
              const current = s.situation.trim();
              const suggestions = recentSituations(s.encounters).filter(
                (t) => t !== current,
              );
              if (!suggestions.length) {
                return null;
              }
              return (
                <div className="recent-situations">
                  <p className="meta">Or take another step on</p>
                  {suggestions.map((t) => (
                    <button
                      key={t}
                      className="text-button recent-situation"
                      onClick={() => {
                        patch({ situation: t });
                        pendingFocus.current = 'continue-button';
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              );
            })()}
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
      {s.screen === 'setup' && s.draft && s.setupPart !== 'prepare' && (
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
          {blankAtArrival
            ? title('What’s one small step you could take?')
            : title('Your step', 'eyebrow step-eyebrow')}
          {blankAtArrival && (
            <p className="meta question-hint" id="action-hint">
              {s.draft.careful ? careHint : blankStepHints[s.resistance]}
            </p>
          )}
          <textarea
            id="action"
            aria-labelledby="screen-title"
            aria-describedby={blankAtArrival ? 'action-hint' : undefined}
            className="text-input action-input lead"
            maxLength={1000}
            value={s.draft.action}
            onChange={(e) => {
              // Only text the person actually typed is read for a stated
              // duration; carried-over or model text never runs through this.
              const stated = statedMinutes(e.target.value);
              patch({
                draft: {
                  ...s.draft!,
                  action: e.target.value,
                  userAction: e.target.value,
                  minutes: stated ?? s.draft!.minutes,
                },
              });
            }}
          />
          {!blankAtArrival && !s.draft.careful && (
            <p className="step-reason">{stepReasons[s.resistance]}</p>
          )}
          {s.draft.action.trim() && (
            <DurationPicker
              value={s.draft.minutes}
              onChange={(minutes) => patch({ draft: { ...s.draft!, minutes } })}
            />
          )}
          <Primary
            onClick={() => patch({ setupPart: 'prepare' })}
            disabled={!s.draft.action.trim()}
          >
            Next
          </Primary>
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
                placeholder="For example: So the team can move forward."
                onChange={(e) =>
                  patch({ draft: { ...s.draft!, purpose: e.target.value } })
                }
              />
            </>
          )}
          {!s.draft.purpose?.trim() && !showPurpose && (
            <div className="setup-links">
              <button
                className="text-button note-toggle"
                onClick={() => setShowPurpose(true)}
              >
                Add why this matters
              </button>
            </div>
          )}
          {suggestionMessage && (
            <p className="notice" role="status">
              {suggestionMessage}
            </p>
          )}
        </section>
      )}
      {s.screen === 'setup' && s.draft && s.setupPart === 'prepare' && (
        <section className="setup">
          <div className="echo setup-context">
            <p className="meta echo-body setup-step">
              Your step ({s.draft.minutes} min):{' '}
              <span className="echo-text">{s.draft.action}</span>
            </p>
            <button
              className="text-button"
              aria-label="Edit step"
              onClick={() => patch({ setupPart: undefined })}
            >
              Edit
            </button>
          </div>
          {title('How uncomfortable will it be?')}
          <Scale
            id="expected"
            label="How uncomfortable do you expect this to be?"
            labelledBy="screen-title"
            value={s.prediction}
            onChange={(prediction) => patch({ prediction })}
          />
          <label className="field-label" htmlFor="worry">
            What are you worried will happen?{' '}
            <span className="optional">Optional</span>
          </label>
          <p className="meta" id="worry-hint">
            You’ll check afterwards whether it happened.
          </p>
          <textarea
            className="text-input"
            id="worry"
            value={s.worryDraft ?? ''}
            maxLength={1000}
            aria-describedby="worry-hint"
            placeholder={
              s.draft.territory === 'spotlight'
                ? 'For example: They’ll think it’s a silly question.'
                : s.draft.territory === 'fog'
                  ? 'For example: I’ll get it wrong and have to start over.'
                  : s.draft.territory === 'loop'
                    ? 'For example: I’ll miss a mistake that matters.'
                    : s.draft.territory === 'water'
                      ? 'For example: I won’t be able to stay with it.'
                      : 'For example: They’ll say no.'
            }
            onChange={(e) => patch({ worryDraft: e.target.value })}
          />
          <Primary
            onClick={begin}
            disabled={!s.draft.action.trim() || s.prediction === null}
          >
            Start timer
          </Primary>
        </section>
      )}
      {s.screen === 'active' && active && (
        <section className="active">
          {title('Timer', 'sr-only')}
          {late ? (
            <p className="lead late-return">
              You started this {startedDay(active.startedAt, now)} at{' '}
              {new Date(active.startedAt)
                .toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })
                .replace(/\s/g, ' ')}
              . How did it go?
            </p>
          ) : (
            <>
              {/* The ring empties as time runs out, then stays full once time's up. */}
              <div
                className="timer"
                role="timer"
                aria-label={
                  timerDone
                    ? `${Math.floor(overSeconds / 60)} minute${Math.floor(overSeconds / 60) === 1 ? '' : 's'} ${overSeconds % 60} second${overSeconds % 60 === 1 ? '' : 's'} over`
                    : `${Math.floor(remaining(active, now) / 60)} minutes ${remaining(active, now) % 60} seconds remaining`
                }
                style={
                  {
                    '--left': timerDone
                      ? '1turn'
                      : `${remaining(active, now) / (active.minutes * 60)}turn`,
                  } as React.CSSProperties
                }
              >
                {timerDone ? (
                  <span className="timer-over">
                    +{Math.floor(overSeconds / 60)}:
                    {(overSeconds % 60).toString().padStart(2, '0')}
                  </span>
                ) : (
                  <>
                    {Math.floor(remaining(active, now) / 60)}:
                    {(remaining(active, now) % 60).toString().padStart(2, '0')}
                  </>
                )}
              </div>
            </>
          )}
          {/* The step stays in view while it's happening, as a quiet reminder. */}
          <div className="step-text">
            <p className="step-now">{active.action}</p>
            {active.purpose?.trim() && (
              <p className="meta">For: {active.purpose}</p>
            )}
          </div>
          {!late && (
            // One live region, announced once, when its text actually
            // changes to the time's-up copy.
            <p className="meta invitation" role="status">
              {timerDone
                ? 'Time’s up. Keep going if you like, and tap “I’m done” when you finish.'
                : 'Tap “I’m done” whenever you finish, even before 0:00.'}
              {/* Explained once; after a first step it is known. */}
              {!timerDone &&
                s.encounters.length === 0 &&
                ' The timer keeps running if you leave the app.'}
            </p>
          )}
          <Primary onClick={() => returnFrom()}>I’m done</Primary>
          <button className="secondary" onClick={() => returnFrom(true)}>
            I stopped partway
          </button>
          <button className="text-button exit" onClick={() => finish(true)}>
            I didn’t start
          </button>
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
          {title('How it went', 'sr-only')}
          <p className="meta setup-step return-step">
            Your step: {active.action}
          </p>
          {actualOpen && (
            <Scale
              id="actual"
              label="How uncomfortable was it?"
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
                  label="How it felt"
                  value={`${active.actual} of 10`}
                  onChange={() => change('actual')}
                />
              )}
              {!urgeOpen && !active.stopped && (
                <AnsweredRow
                  label="Wanted to stop"
                  value={urgeLabels[active.urge]}
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
                Did you want to stop partway?
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
                  Anything you noticed?{' '}
                  <span className="optional">Optional</span>
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
        </section>
      )}
      {s.screen === 'observation' && last && (
        <section className="observation">
          <div className={newDiscovery ? 'discovery-reveal' : undefined}>
            {newDiscovery && <p className="eyebrow accent">New pattern</p>}
            {title(newDiscovery?.title ?? obs?.title ?? '')}
            {newDiscovery ? (
              <p className="result-summary">
                {patternEvidence(newDiscovery, discoveryEvidence)}
              </p>
            ) : (
              <p className="result-summary result-numbers">
                {cmp ? cmp.numbers : obs?.body}
              </p>
            )}
            <div className="result-details">
              {newDiscovery && <p>{patternMeaning[newDiscovery.rule]}</p>}
              {!newDiscovery && cmp && obs?.body && <p>{obs.body}</p>}
              {!newDiscovery && worrySplit[0] && (
                <p>
                  You worried: <span className="meta">{worrySplit[0]}</span>.{' '}
                  {last.worryHappened === 'unknown' && !last.worryLater
                    ? 'Later, in History, you can add whether it happened.'
                    : worrySplit[1]}
                </p>
              )}
              {!newDiscovery && timeLine(last) && (
                <p className="meta">{timeLine(last)}</p>
              )}
            </div>
          </div>
          {/* The trail is context for the finding, so it follows it. */}
          {last.outcome !== 'not_started' && (
            <>
              <Trail
                encounters={s.encounters}
                found={found}
                revealId={last.id}
                newDiscoveryId={newDiscovery?.id}
              />
              <p className="meta trail-key">
                {trailKey(trailStones(s.encounters).stones, false)}
              </p>
            </>
          )}
          {/* Done only dismisses, so it stays quieter than the finding. */}
          <button className="secondary result-done" onClick={() => go('map')}>
            Done
          </button>
        </section>
      )}
      {s.screen === 'notice' && (
        <section className="noticing">
          {title('What’s happening?')}
          <div className="entry notice-entry">
            <textarea
              aria-labelledby="screen-title"
              value={noticeWhat}
              maxLength={300}
              placeholder="For example: Reaching for my phone again."
              onChange={(e) => setNoticeWhat(e.target.value)}
            />
          </div>
          <label className="field-label" htmlFor="notice-saying">
            What’s it saying? <span className="optional">Optional</span>
          </label>
          <input
            id="notice-saying"
            className="text-input"
            value={noticeSaying}
            maxLength={200}
            placeholder="For example: Not now."
            onChange={(e) => setNoticeSaying(e.target.value)}
          />
          {lines.length > 0 && (
            <div
              className="usual-rail"
              role="group"
              aria-labelledby="usual-label"
            >
              <span className="meta usual-label" id="usual-label">
                Its usual lines
              </span>
              {lines.map((line) => (
                <button
                  key={line}
                  className={`usual-line ${noticeSaying.trim() === line ? 'selected' : ''}`}
                  aria-pressed={noticeSaying.trim() === line}
                  onClick={() => setNoticeSaying(line)}
                >
                  {line}
                </button>
              ))}
            </div>
          )}
          <div className="duration-field notice-when">
            <div className="duration-legend" id="noticed-label">
              When did you notice?
            </div>
            <RadioGroup
              className="duration-choices word-choices"
              value={noticeWhen}
              onValueChange={(v) => setNoticeWhen(v as Noticed)}
              aria-labelledby="noticed-label"
            >
              {noticedChoices.map(([v, l]) => (
                <label
                  className={`scale-choice ${noticeWhen === v ? 'selected' : ''}`}
                  key={v}
                >
                  <RadioGroupItem value={v} />
                  <span>{l}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <Primary disabled={!noticeWhat.trim()} onClick={saveNotice}>
            Save
          </Primary>
        </section>
      )}
      {s.screen === 'noticed' && moment && (
        <section className="noticed">
          {title(
            recognised(s.moments, moment)
              ? 'You’ve met this one before'
              : 'You haven’t met this one before',
          )}
          <p className="meta noticed-echo">
            {moment.saying
              ? `${moment.what} · “${moment.saying}”`
              : moment.what}
          </p>
          {/* Results read as Body, below the heading; context while typing. */}
          {watchLine(moment) && (
            <p className={`noticed-result${smallestOpen ? ' meta' : ''}`}>
              {watchLine(moment)}
            </p>
          )}
          {moment.smallest && (
            <p className={`noticed-result${smallestOpen ? ' meta' : ''}`}>
              Smallest thing to try: {moment.smallest}
            </p>
          )}
          {smallestOpen ? (
            <div className="smallest-field">
              <label className="field-label" htmlFor="smallest">
                What’s the smallest thing you’d try?
              </label>
              <textarea
                id="smallest"
                className="text-input"
                value={smallestText}
                maxLength={300}
                placeholder="For example: Shoes on, decide at the door."
                onChange={(e) => setSmallestText(e.target.value)}
              />
              <Primary
                disabled={!smallestText.trim()}
                onClick={() => {
                  updateMoment(moment.id, { smallest: smallestText.trim() });
                  setSmallestOpen(false);
                  pendingFocus.current = 'screen-title';
                }}
              >
                Save
              </Primary>
              <button
                className="text-button"
                onClick={() => {
                  setSmallestOpen(false);
                  pendingFocus.current = 'screen-title';
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              {moment.noticed === 'now' &&
                (moment.watchStartedAt === undefined || !moment.smallest) && (
                  <div className="noticed-options">
                    <p>
                      If you like, try something with it. Leaving it is just as
                      fine.
                    </p>
                    {moment.watchStartedAt === undefined && (
                      <button
                        className="secondary"
                        onClick={() => {
                          setGuessDraft(undefined);
                          setWatchEnded(false);
                          go('watch');
                        }}
                      >
                        Watch it for a minute
                      </button>
                    )}
                    {!moment.smallest && (
                      <button
                        className="secondary"
                        onClick={() => {
                          setSmallestText('');
                          setSmallestOpen(true);
                          pendingFocus.current = 'smallest';
                        }}
                      >
                        Name the smallest thing you’d try
                      </button>
                    )}
                  </div>
                )}
              <button className="secondary noticed-done" onClick={leaveMoment}>
                {moment.noticed === 'now' &&
                moment.watchStartedAt === undefined &&
                !moment.smallest
                  ? 'Leave it for now'
                  : 'Done'}
              </button>
            </>
          )}
        </section>
      )}
      {s.screen === 'watch' &&
        moment &&
        (() => {
          const started = moment.watchStartedAt;
          if (started === undefined) {
            return (
              <section className="watch">
                {title('What will it do in the next minute?')}
                <p className="meta">
                  A guess. No answer is better than another.
                </p>
                <RadioGroup
                  className="choices"
                  value={guessDraft ?? ''}
                  onValueChange={(v) => setGuessDraft(v as Drift)}
                  aria-labelledby="screen-title"
                >
                  {guessChoices.map(([v, l]) => (
                    <label
                      className={`choice ${guessDraft === v ? 'selected' : ''}`}
                      key={v}
                    >
                      <span>{l}</span>
                      <RadioGroupItem value={v} />
                    </label>
                  ))}
                </RadioGroup>
                <Primary
                  disabled={!guessDraft}
                  onClick={() => {
                    setWatchEnded(false);
                    pendingFocus.current = 'screen-title';
                    // The guess is saved only once the minute starts.
                    updateMoment(moment.id, {
                      guess: guessDraft,
                      watchStartedAt: Date.now(),
                    });
                  }}
                >
                  Start the minute
                </Primary>
                <button
                  className="text-button exit"
                  onClick={() => go('noticed')}
                >
                  Back
                </button>
              </section>
            );
          }
          const left = Math.max(0, Math.ceil((started + 60000 - now) / 1000));
          if (left > 0 && !watchEnded) {
            return (
              <section className="active watch">
                {title('Watching it', 'sr-only')}
                <div
                  className="timer"
                  role="timer"
                  aria-label={`${left} second${left === 1 ? '' : 's'} remaining`}
                  style={
                    { '--left': `${left / 60}turn` } as React.CSSProperties
                  }
                >
                  {Math.floor(left / 60)}:
                  {(left % 60).toString().padStart(2, '0')}
                </div>
                <p className="step-now">
                  {moment.saying ? `“${moment.saying}”` : moment.what}
                </p>
                <p className="meta">
                  Watch what it does. You don’t have to act.
                </p>
                <button
                  className="text-button exit"
                  onClick={() => {
                    setWatchEnded(true);
                    pendingFocus.current = 'screen-title';
                  }}
                >
                  Stop early
                </button>
              </section>
            );
          }
          return (
            <section className="watch">
              {title('What did it do?')}
              {watchLine({ ...moment, watched: undefined }) && (
                <p className="meta">
                  {watchLine({ ...moment, watched: undefined })}
                </p>
              )}
              <RadioGroup
                className="choices"
                value={moment.watched ?? ''}
                onValueChange={(v) =>
                  updateMoment(moment.id, { watched: v as Drift })
                }
                aria-labelledby="screen-title"
              >
                {watchedChoices.map(([v, l]) => (
                  <label
                    className={`choice ${moment.watched === v ? 'selected' : ''}`}
                    key={v}
                  >
                    <span>{l}</span>
                    <RadioGroupItem value={v} />
                  </label>
                ))}
              </RadioGroup>
              <Primary disabled={!moment.watched} onClick={() => go('noticed')}>
                Save
              </Primary>
              <button
                className="text-button exit"
                onClick={() => {
                  updateMoment(moment.id, { watched: undefined });
                  go('noticed');
                }}
              >
                Skip
              </button>
            </section>
          );
        })()}
      {s.screen === 'map' && (
        <section>
          <h1 className="sr-only" ref={heading} tabIndex={-1}>
            Home
          </h1>
          <div className="home-notice">
            <Primary onClick={startNotice}>I noticed some resistance</Primary>
            {!s.moments.length && (
              <p className="meta">
                Write down a moment of resistance, as it happens or afterwards.
              </p>
            )}
          </div>
          {next && (
            <>
              {next.action ? (
                <>
                  <h2>Next step</h2>
                  <p className="meta situation-context">
                    {`${next.situation} · ${next.minutes} min`}
                  </p>
                  <p className="lead home-action">{next.action}</p>
                  <button
                    className="text-button change-step"
                    onClick={() => {
                      setShowPurpose(false);
                      patch({
                        draft: next,
                        situation: next.situation,
                        resistance: next.resistance,
                        prediction: null,
                        predictionNote: '',
                        worryDraft: undefined,
                        setupPart: undefined,
                        setupFrom: 'home',
                        screen: 'setup',
                      });
                    }}
                  >
                    Change step
                  </button>
                  {next.purpose?.trim() && (
                    <p className="meta">For: {next.purpose}</p>
                  )}
                  <button
                    className="secondary home-start"
                    onClick={() => {
                      setShowPurpose(false);
                      patch({
                        draft: next,
                        situation: next.situation,
                        resistance: next.resistance,
                        prediction: null,
                        predictionNote: '',
                        worryDraft: undefined,
                        setupPart: 'prepare',
                        setupFrom: 'home',
                        screen: 'setup',
                      });
                    }}
                  >
                    Start
                  </button>
                </>
              ) : (
                <>
                  <h2>Working on</h2>
                  <p className="lead home-action">{next.situation}</p>
                  <button
                    className="secondary home-start"
                    onClick={() => {
                      setShowPurpose(false);
                      patch({
                        draft: next,
                        situation: next.situation,
                        resistance: next.resistance,
                        prediction: null,
                        predictionNote: '',
                        worryDraft: undefined,
                        setupPart: undefined,
                        setupFrom: 'home',
                        screen: 'setup',
                      });
                    }}
                  >
                    Choose a step
                  </button>
                </>
              )}
            </>
          )}
          {/* With a situation already here, a quiet link starts a different one. */}
          <button
            className={next ? 'text-button home-else' : 'secondary avoid-row'}
            onClick={() =>
              patch({
                situation: '',
                custom: '',
                draft: null,
                screen: 'name',
              })
            }
          >
            {next ? 'Work on something else' : "I'm avoiding something"}
          </button>
          {steps.length > 0 && (
            <section className="progress" aria-labelledby="progress-title">
              <h2 id="progress-title">Your progress</h2>
              {(pattern(s.encounters) || worryPattern(s.encounters)) && (
                <p>
                  {pattern(s.encounters)} {worryPattern(s.encounters)}
                </p>
              )}
              <Trail
                encounters={s.encounters}
                found={found}
                next={next}
                onStep={openEntry}
                onEarlier={() => openEntry(null)}
              />
              <p className="meta trail-key">
                {trailKey(trailStones(s.encounters).stones, true)}
              </p>
            </section>
          )}
        </section>
      )}
      {s.screen === 'atlas' && (
        <section>
          {title('History', 'sr-only')}
          {!history && (
            <>
              <p>
                Each step you take shows up here: what you expected, how it
                felt, and whether your worry came true.
              </p>
              <Primary
                onClick={() =>
                  patch({
                    situation: '',
                    custom: '',
                    draft: null,
                    screen: 'name',
                  })
                }
              >
                Start with something you’re avoiding
              </Primary>
            </>
          )}
          {found.length > 0 && (
            <>
              <h2 className="section-label">Patterns</h2>
              {found.map((d) => {
                const evidenceEncounters = s.encounters.filter((e) =>
                  d.evidence.includes(e.id),
                );
                const ordered = [...evidenceEncounters].sort(
                  (a, b) =>
                    a.createdAt - b.createdAt || a.id.localeCompare(b.id),
                );
                return (
                  <article className="discovery-entry" key={d.id}>
                    <h3>{d.title}</h3>
                    <p>{patternEvidence(d, evidenceEncounters)}</p>
                    <p className="meta">{patternMeaning[d.rule]}</p>
                    <details>
                      <summary>See the steps</summary>
                      {ordered.map((e) => {
                        const fits = d.support.includes(e.id)
                          ? 'Fits'
                          : 'Doesn’t fit';
                        const what =
                          d.rule === 'bluff'
                            ? worryLine(e)
                            : compare(e)?.numbers;
                        return (
                          <p key={e.id}>
                            {new Date(e.createdAt).toLocaleDateString(
                              undefined,
                              { month: 'short', day: 'numeric' },
                            )}
                            : {fits}. {what}
                          </p>
                        );
                      })}
                    </details>
                  </article>
                );
              })}
            </>
          )}
          {s.moments.length > 0 && (
            <>
              <h2 className="section-label">Noticed</h2>
              {[...s.moments]
                .reverse()
                .slice(0, allMoments ? undefined : 5)
                .map((m) => (
                  <article className="atlas-entry moment-entry" key={m.id}>
                    <h3>
                      {new Date(m.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {noticedLabels[m.noticed]}
                    </h3>
                    <p>{m.what}</p>
                    {m.saying && <p className="meta">It said: “{m.saying}”</p>}
                    {watchLine(m) && <p className="meta">{watchLine(m)}</p>}
                    {m.smallest && (
                      <>
                        <p className="meta">
                          Smallest thing to try: {m.smallest}
                        </p>
                        {m.tried ? (
                          <p className="meta">You tried it</p>
                        ) : (
                          <button
                            className="text-button tried-it"
                            onClick={() => updateMoment(m.id, { tried: true })}
                          >
                            I tried it
                          </button>
                        )}
                      </>
                    )}
                  </article>
                ))}
              {s.moments.length > 5 && !allMoments && (
                <button
                  className="text-button"
                  onClick={() => setAllMoments(true)}
                >
                  Show all {s.moments.length}
                </button>
              )}
            </>
          )}
          {s.encounters.length > 0 &&
            (found.length > 0 || s.moments.length > 0) && (
              <h2 className="section-label">Your steps</h2>
            )}
          {groupBySituation(s.encounters).map((group, index) => {
            const key = group.situation.trim();
            // The newest group starts open.
            const isOpen = groupOpen[key] ?? index === 0;
            const labelled = found.length > 0 || s.moments.length > 0;
            const GroupHeading: 'h2' | 'h3' = labelled ? 'h3' : 'h2';
            const EntryHeading: 'h3' | 'h4' = labelled ? 'h4' : 'h3';
            return (
              <details
                className="atlas-group"
                key={key}
                open={isOpen}
                onToggle={(ev) => {
                  const nowOpen = ev.currentTarget.open;
                  setGroupOpen((prev) => ({ ...prev, [key]: nowOpen }));
                }}
              >
                <summary className="group-summary">
                  <GroupHeading>{group.situation}</GroupHeading>
                  <span className="meta">
                    {group.entries.length} step
                    {group.entries.length === 1 ? '' : 's'} · last{' '}
                    {new Date(group.entries[0].createdAt).toLocaleDateString(
                      undefined,
                      { month: 'short', day: 'numeric' },
                    )}
                  </span>
                </summary>
                {group.entries.map((e) => {
                  // Same notation as Home's key, so the scale is named here too.
                  const cmp = compare(e);
                  const numbers = cmp
                    ? ` · discomfort ${e.prediction} → ${e.actual}`
                    : '';
                  const result =
                    e.outcome === 'not_started'
                      ? 'Didn’t start'
                      : e.outcome === 'stopped' || e.urge === 'stopped'
                        ? `Stopped partway${numbers}`
                        : `${cmp?.heading ?? 'Not rated yet'}${numbers}`;
                  // The result line already says when a step stopped or never started.
                  const showUrge =
                    e.outcome === 'attempted' && e.urge !== 'stopped';
                  const took = timeTaken(e);
                  const hasDetails =
                    e.purpose ||
                    e.resistanceNote ||
                    e.predictionNote ||
                    showUrge ||
                    e.notices.length > 0 ||
                    e.note;
                  return (
                    <article
                      className="atlas-entry"
                      key={e.id}
                      id={`entry-${e.id}`}
                      tabIndex={-1}
                    >
                      <EntryHeading>
                        {new Date(e.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {took && ` · ${took}`}
                      </EntryHeading>
                      <p>{e.action}</p>
                      <p className="meta">{result}</p>
                      {e.worry?.trim() && (
                        <>
                          <p className="meta">
                            {(() => {
                              const [quote, status] = splitWorryLine(
                                worryLine(e),
                              );
                              return status
                                ? `You worried: ${quote}. ${status}`
                                : `You worried: ${quote}`;
                            })()}
                            {!showWorryButtons(e) &&
                              e.worryHappened === 'unknown' && (
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
                              className="worry-later"
                              role="group"
                              aria-labelledby={`worry-q-${e.id}`}
                            >
                              <p className="meta" id={`worry-q-${e.id}`}>
                                Did it happen?
                              </p>
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
                      {hasDetails && (
                        <details>
                          <summary>Details</summary>
                          <dl className="facts">
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
                            {e.predictionNote && (
                              <>
                                <dt className="meta">Expected</dt>
                                <dd>{e.predictionNote}</dd>
                              </>
                            )}
                            {showUrge && (
                              <>
                                <dt className="meta">Wanted to stop</dt>
                                <dd>{urgeLabels[e.urge]}</dd>
                              </>
                            )}
                            {e.notices.length > 0 && (
                              <>
                                <dt className="meta">Noticed</dt>
                                <dd>
                                  {e.notices
                                    .map(
                                      (n) =>
                                        (
                                          noticeLabels as Record<string, string>
                                        )[n],
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
                      )}
                    </article>
                  );
                })}
                <button
                  className="text-button"
                  onClick={() =>
                    patch({
                      situation: group.situation,
                      custom: '',
                      draft: null,
                      screen: 'name',
                    })
                  }
                >
                  Take another step on this
                </button>
              </details>
            );
          })}
          {s.encounters.length > 0 && found.length === 0 && (
            <p className="meta pattern-hint">
              Patterns show up once you’ve taken 4 or more steps where the same
              thing made it hard, on at least 3 different days.
            </p>
          )}
        </section>
      )}
      {s.screen === 'me' && (
        <section>
          {title('Your data')}
          {s.session && (
            <Primary onClick={() => go('active')}>Back to your step</Primary>
          )}
          {saveBlocked.current && (
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Reload saved data
            </button>
          )}
          <h2 className="section-heading keep-heading">Back up</h2>
          <p>
            Everything is stored only in this browser. Clearing browser data
            erases it, so download a backup now and then.
          </p>
          <div className="data-actions">
            {/* A step in progress keeps the one primary action. */}
            {s.session ? (
              <button className="secondary" onClick={exportData}>
                Download a backup
              </button>
            ) : (
              <Primary onClick={exportData}>Download a backup</Primary>
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
                <AlertDialogTitle>Merge this backup?</AlertDialogTitle>
                <AlertDialogDescription>
                  {restoreLine(backupSummary)} Your current step won’t change.
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
              Delete all data
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete all data from this browser?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This removes everything you’ve recorded here. Download a
                  backup first if you want to keep it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my data</AlertDialogCancel>
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
                      setError('');
                    } catch {
                      setError(
                        'Your data could not be deleted. Try your browser’s site-data settings.',
                      );
                    }
                  }}
                >
                  Delete all data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="meta privacy">
            When the app suggests a step, what you’re avoiding and the reason
            you picked are sent to an AI service to suggest a step. Your history
            stays in this browser.
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
                  setAtlasFocus(null);
                }
                go(n);
              }}
            >
              <span aria-hidden="true">{['↗', '▤', '○'][i]}</span>
              {['Home', 'History', 'Your data'][i]}
            </button>
          ))}
        </nav>
      )}
    </main>
  );
}
