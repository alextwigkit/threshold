'use client';
import { useId } from 'react';
import { territories, type Encounter, type Territory } from '@/lib/engine';
import { projectMap, positions } from '@/lib/map';
export default function MapFragment({
  encounters,
  territory,
  compact = false,
  revealId,
  onTerritory,
}: {
  encounters: Encounter[];
  territory?: Territory;
  compact?: boolean;
  revealId?: string;
  onTerritory?: (t: Territory) => void;
}) {
  const id = useId().replace(/:/g, '');
  const map = projectMap(encounters);
  const known = [...new Set([...map.known, ...(territory ? [territory] : [])])];
  const description = map.routes.length
    ? `Your map shows real attempts in ${map.known.map((t) => territories[t].name).join(', ')}. Select a territory to see its encounters.`
    : 'An unresolved map. Your first route is still ahead.';
  return (
    <div className={`map-fragment ${compact ? 'compact' : ''}`}>
      <svg
        viewBox="0 0 400 470"
        role={onTerritory ? 'group' : 'img'}
        aria-label={description}
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
          <mask id={`${id}-known`}>
            <rect width="400" height="470" fill="white" />
            {map.routes.map((r) => (
              <path
                key={r.id}
                d={r.path}
                fill="none"
                stroke="black"
                strokeWidth="38"
                strokeLinecap="round"
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
          const familiarity = Math.min(map.familiarity[t] ?? 0, 8);
          return (
            <g key={t}>
              {t === 'fog' &&
                [0, 15, 30].map((n) => (
                  <path
                    key={n}
                    d={`M ${x - 70} ${y + n} Q ${x - 20} ${y + n + 35} ${x + 50} ${y + n - 8}`}
                    fill="none"
                    stroke="#777e70"
                    strokeDasharray={familiarity < 2 ? '3 6' : undefined}
                    opacity={0.14 + familiarity * 0.025}
                  />
                ))}
              {t === 'spotlight' &&
                [-45, -15, 15, 45].map((n) => (
                  <path
                    key={n}
                    d={`M ${x + n} ${y - 4} L ${x + n * 1.4} ${y + 55}`}
                    fill="none"
                    stroke="#777e70"
                    opacity={0.15 + familiarity * 0.02}
                  />
                ))}
              {t === 'loop' &&
                [22, 36, 50].map((r) => (
                  <path
                    key={r}
                    d={`M ${x + r} ${y} A ${r} ${r} 0 1 1 ${x + r - 8} ${y - 18}`}
                    fill="none"
                    stroke="#777e70"
                    opacity={0.17 + familiarity * 0.02}
                  />
                ))}
              {t === 'water' &&
                [0, 10, 20].map((n) => (
                  <path
                    key={n}
                    d={`M ${x - 55} ${y + n} Q ${x} ${y + n + 15} ${x + 55} ${y + n}`}
                    fill="none"
                    stroke="#777e70"
                    opacity={0.17 + familiarity * 0.02}
                  />
                ))}
            </g>
          );
        })}
        {map.routes.map((r, i) => (
          <g key={r.id}>
            <path
              className={r.id === revealId ? 'draw-route' : ''}
              pathLength="1"
              d={r.path}
              fill="none"
              stroke={i === map.routes.length - 1 ? '#ac3d24' : '#7d8176'}
              strokeWidth={i === map.routes.length - 1 ? 2 : 1}
              opacity={i === map.routes.length - 1 ? 1 : 0.35}
              strokeDasharray={r.stopped ? '3 4' : undefined}
            />
            <circle
              cx={r.end[0]}
              cy={r.end[1]}
              r="3"
              fill={i === map.routes.length - 1 ? '#ac3d24' : '#7d8176'}
            />
            {r.stopped && i === map.routes.length - 1 && (
              <text
                x={r.end[0] - 5}
                y={r.end[1] + 18}
                textAnchor="middle"
                className="map-note"
              >
                stopped here
              </text>
            )}
          </g>
        ))}
        {map.discoveries.map((d, i) => {
          const r = map.routes.find((r) => d.support.includes(r.id));
          return r ? (
            <circle
              key={d.id}
              className={
                revealId === map.routes.at(-1)?.id ? 'discovery-mark' : ''
              }
              cx={r.end[0]}
              cy={r.end[1]}
              r={9 + (i % 2) * 4}
              fill="none"
              stroke="#ac3d24"
              strokeWidth="1"
            >
              <title>{d.title}</title>
            </circle>
          ) : null;
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
        {known.map((t) => {
          const [x, y] = positions[t];
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
              onClick={() => onTerritory?.(t)}
              onKeyDown={(e) => {
                if (onTerritory && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onTerritory(t);
                }
              }}
            >
              <rect
                x={x - 79}
                y={y - 58}
                width="158"
                height="44"
                rx="4"
                fill="#f4f1eb"
                fillOpacity=".82"
              />
              <text x={x} y={y - 28} textAnchor="middle" className="map-label">
                {territories[t].name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
