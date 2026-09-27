'use client';
import { useId } from 'react';
import { territories, type Encounter, type Territory } from '@/lib/engine';
import {
  projectMap,
  positions,
  fields,
  gates,
  labelAnchors,
  compactCrops,
  notePlacement,
  noteInk,
} from '@/lib/map';
export default function MapFragment({
  encounters,
  territory,
  compact = false,
  revealId,
  newDiscoveryId,
  onTerritory,
  className = '',
}: {
  encounters: Encounter[];
  territory?: Territory;
  compact?: boolean;
  revealId?: string;
  newDiscoveryId?: string;
  onTerritory?: (t: Territory) => void;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const map = projectMap(encounters);
  const known = [...new Set([...map.known, ...(territory ? [territory] : [])])];
  const latest = map.routes.at(-1);
  const describe = () => {
    if (compact && territory)
      return `A closer view of ${territories[territory].name}.`;
    if (!map.routes.length)
      return 'An unresolved map. Your first route is still ahead.';
    const where = map.known.map((t) => territories[t].name).join(', ');
    const count =
      map.routes.length === 1 ? 'one route' : `${map.routes.length} routes`;
    const last = latest
      ? ` Your most recent ${latest.stopped ? 'route stopped at the edge of' : 'route reached'} ${territories[latest.territory].name}.`
      : '';
    const found = map.discoveries.length
      ? ` ${map.discoveries.length === 1 ? 'One discovery is marked' : `${map.discoveries.length} discoveries are marked`} on it.`
      : '';
    // Only claim the territories are selectable where they actually are.
    const how = onTerritory ? ' Select a territory to see its encounters.' : '';
    return `Your map shows ${count} in ${where}.${last}${found}${how}`;
  };
  return (
    <div className={`map-fragment ${compact ? 'compact' : ''} ${className}`}>
      <svg
        viewBox={compact && territory ? compactCrops[territory] : '0 0 400 470'}
        role={onTerritory ? 'group' : 'img'}
        aria-label={describe()}
      >
        <defs>
          <pattern
            id={`${id}-dots`}
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="3" cy="3" r=".7" fill="#85887e" opacity=".26" />
          </pattern>
          {/* Black clears the texture, white keeps it. */}
          <radialGradient id={`${id}-clear`}>
            <stop offset="0%" stopColor="#000" />
            <stop offset="100%" stopColor="#fff" />
          </radialGradient>
          <mask id={`${id}-known`}>
            <rect width="400" height="470" fill="white" />
            {/* The corridor only thins the texture; the ground is fully cleared where a mark landed. */}
            {map.routes.map((r) => (
              <path
                key={r.id}
                d={r.path}
                fill="none"
                stroke="#8c8c8c"
                strokeWidth="20"
                strokeLinecap="round"
              />
            ))}
            {map.routes.map((r) => (
              <circle
                key={`clear-${r.id}`}
                cx={r.end[0]}
                cy={r.end[1]}
                r="26"
                fill={`url(#${id}-clear)`}
              />
            ))}
          </mask>
        </defs>
        <rect
          width="400"
          height="470"
          fill={`url(#${id}-dots)`}
          mask={`url(#${id}-known)`}
        />
        {Array.from({ length: 7 }, (_, i) => (
          <path
            key={i}
            d={`M -25 ${85 + i * 54} C 100 ${15 + i * 61}, 135 ${170 + i * 32}, 230 ${95 + i * 41} S 350 ${100 + i * 42}, 445 ${20 + i * 57}`}
            fill="none"
            stroke="#777e70"
            strokeWidth=".8"
            opacity=".13"
          />
        ))}
        {known.map((t) => {
          const [x, y] = positions[t];
          const n = map.familiarity[t] ?? 0;
          // Approaches 0.35 without ever arriving, so it never reads as complete.
          const ink = 0.13 + 0.22 * (n / (n + 5));
          const faint = n < 2 ? '3 6' : undefined;
          return (
            <g key={t}>
              {t === 'fog' &&
                [0, 15, 30].map((k) => (
                  <path
                    key={k}
                    d={`M ${x - 70} ${y + k} Q ${x - 20} ${y + k + 35} ${x + 50} ${y + k - 8}`}
                    fill="none"
                    stroke="#777e70"
                    strokeDasharray={faint}
                    opacity={ink}
                  />
                ))}
              {t === 'spotlight' &&
                [-45, -15, 15, 45].map((k) => (
                  <path
                    key={k}
                    d={`M ${x + k} ${y - 4} L ${x + k * 1.4} ${y + 55}`}
                    fill="none"
                    stroke="#777e70"
                    strokeDasharray={faint}
                    opacity={ink}
                  />
                ))}
              {t === 'loop' &&
                [22, 36, 50].map((r) => (
                  <path
                    key={r}
                    d={`M ${x + r} ${y} A ${r} ${r} 0 1 1 ${x + r - 8} ${y - 18}`}
                    fill="none"
                    stroke="#777e70"
                    strokeDasharray={faint}
                    opacity={ink}
                  />
                ))}
              {t === 'water' &&
                [0, 10, 20].map((k) => (
                  <path
                    key={k}
                    d={`M ${x - 55} ${y + k} Q ${x} ${y + k + 15} ${x + 55} ${y + k}`}
                    fill="none"
                    stroke="#777e70"
                    strokeDasharray={faint}
                    opacity={ink}
                  />
                ))}
            </g>
          );
        })}
        {map.routes.map((r) => {
          const current = r.id === latest?.id;
          return (
            <g key={r.id}>
              <path
                className={r.id === revealId ? 'draw-route' : ''}
                pathLength="1"
                d={r.path}
                fill="none"
                stroke={current ? '#ac3d24' : '#7d8176'}
                strokeWidth={current ? 2 : 1}
                // Held constant so repeated routes through the same gate composite into a darker trunk.
                opacity={current ? 1 : 0.2}
                strokeDasharray={r.stopped ? '3 4' : undefined}
              />
              {/* Hollow where the person stopped short, solid where they arrived. */}
              <circle
                cx={r.end[0]}
                cy={r.end[1]}
                r={current ? 3.2 : 2.2}
                fill={r.stopped ? 'none' : current ? '#ac3d24' : '#7d8176'}
                stroke={r.stopped ? (current ? '#ac3d24' : '#7d8176') : 'none'}
                strokeWidth={r.stopped ? 1 : undefined}
              />
              {/* Not in the preview: a clipped note from an unrelated earlier encounter reads as damage. */}
              {r.stopped && current && !compact && (
                <text
                  x={r.end[0] + noteInk.dx}
                  y={r.end[1] + notePlacement(r.end)}
                  textAnchor="middle"
                  className="map-note"
                >
                  stopped here
                </text>
              )}
            </g>
          );
        })}
        {map.discoveries.map((d) => {
          const r = map.routes.find((x) => d.support.includes(x.id));
          return r ? (
            <circle
              key={d.id}
              // Only the discovery that just resolved animates. Replaying every
              // established one on each observation would grow them on reopening.
              className={d.id === newDiscoveryId ? 'discovery-mark' : ''}
              cx={r.end[0]}
              cy={r.end[1]}
              r={d.rule === 'doorway' ? 9 : 13}
              fill="none"
              stroke="#ac3d24"
              strokeWidth="1"
            >
              <title>{d.title}</title>
            </circle>
          ) : null;
        })}
        {/*
         * Not in the compact preview: the origin (200, 437) sits below every
         * compactCrops window, so the visible remnant was a dashed line with
         * no visible start — read as a stray mark, not "the way there".
         */}
        {territory && !compact && (
          <path
            d={`M 200 437 Q ${gates[territory][0]} ${gates[territory][1]} ${fields[territory].c[0]} ${fields[territory].c[1]}`}
            fill="none"
            stroke="#ac3d24"
            strokeWidth="1.3"
            strokeDasharray="3 6"
            opacity=".6"
          />
        )}
        {known.map((t) => {
          const [x, y] = labelAnchors[t];
          return (
            <g
              key={`label-${t}`}
              className={onTerritory ? 'territory-link' : ''}
              role={onTerritory ? 'button' : undefined}
              tabIndex={onTerritory ? 0 : undefined}
              aria-label={
                onTerritory
                  ? `See encounters in ${territories[t].name}`
                  : undefined
              }
              onClick={onTerritory ? () => onTerritory(t) : undefined}
              onKeyDown={
                onTerritory
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onTerritory(t);
                      }
                    }
                  : undefined
              }
            >
              {/* Hit target and focus ring only; the name carries its own halo, not an opaque plate. */}
              <rect
                x={x - 79}
                y={y - 22}
                width="158"
                height="44"
                rx="4"
                fill="transparent"
              />
              <text x={x} y={y + 8} textAnchor="middle" className="map-label">
                {territories[t].name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
