'use client';
import {
  territories,
  type Candidate,
  type Discovery,
  type Encounter,
} from '@/lib/engine';
import { trailStones, type Stone } from '@/lib/trail';

const day = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function describe(s: Stone) {
  const place = territories[s.encounter.territory].short;
  const how = s.stopped ? 'stopped early' : 'stayed';
  return `Step ${s.step}, ${day(s.encounter.createdAt)}${place ? `, ${place}` : ''}: expected ${s.expected}, experienced ${s.experienced}, ${how}.`;
}

/**
 * Every step taken, in order: what you expected → what it felt like, and
 * whether you stayed. Today's step waits, dashed, at the end.
 */
export default function Trail({
  encounters,
  found = [],
  next,
  revealId,
  newDiscoveryId,
  onStep,
  onEarlier,
}: {
  encounters: Encounter[];
  found?: Discovery[];
  next?: Candidate | null;
  revealId?: string;
  newDiscoveryId?: string;
  onStep?: (id: string) => void;
  onEarlier?: () => void;
}) {
  const { stones, earlier } = trailStones(encounters, found);
  const body = (s: Stone) => (
    <>
      <span
        className={`stone${s.stopped ? ' stopped' : ''}${s.id === revealId ? ' settle' : ''}`}
      >
        {s.discoveries.length > 0 && (
          <span
            className={`ring${s.discoveries.includes(newDiscoveryId ?? '') ? ' discovery-mark' : ''}`}
          />
        )}
      </span>
      <span className="nums" aria-hidden="true">
        {s.expected} → {s.experienced}
      </span>
      <span className="place" aria-hidden="true">
        {territories[s.encounter.territory].short}
      </span>
    </>
  );
  return (
    <ol className="trail" aria-label="Your trail">
      <li className="start">
        <span className="stone" aria-hidden="true" />
        {earlier > 0 && onEarlier ? (
          <button
            className="trail-step trail-earlier"
            aria-label={`${earlier} earlier ${earlier === 1 ? 'step' : 'steps'}, in the Atlas`}
            onClick={onEarlier}
          >
            <span className="nums">+{earlier}</span>
            <span className="place">earlier</span>
          </button>
        ) : earlier > 0 ? (
          <>
            <span className="nums">+{earlier}</span>
            <span className="place">earlier</span>
          </>
        ) : (
          <span className="nums">Start</span>
        )}
      </li>
      {stones.map((s) => (
        <li key={s.id} className={s.id === revealId ? 'current' : undefined}>
          {onStep ? (
            <button
              className="trail-step"
              aria-label={describe(s)}
              onClick={() => onStep(s.id)}
            >
              {body(s)}
            </button>
          ) : (
            <div className="trail-step" role="img" aria-label={describe(s)}>
              {body(s)}
            </div>
          )}
        </li>
      ))}
      {next && (
        <li className="today">
          <span className="sr-only">
            {territories[next.territory].short
              ? `Today's step, ${territories[next.territory].short}.`
              : "Today's step."}
          </span>
          <span className="stone" aria-hidden="true" />
          <span className="nums" aria-hidden="true">
            Today
          </span>
          <span className="place" aria-hidden="true">
            {territories[next.territory].short}
          </span>
        </li>
      )}
    </ol>
  );
}
