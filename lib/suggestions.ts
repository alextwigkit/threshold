import { isCandidate, type Candidate, type Resistance } from './engine.ts';
// Owner authorized always-on suggestions on September 12, 2026. Retain the
// existing versioned request contract; this no longer represents a browser toggle.
export const CONSENT_VERSION = 'edge-inference-2026-09-v1';
export type SuggestionResult = { candidate: Candidate; needsClarification: boolean; source: 'model' | 'local' };
export function parseSuggestion(value: unknown, situation: string, confirmed: Resistance | null): SuggestionResult {
 const v = value as SuggestionResult;
 if (!v || !isCandidate(v.candidate) || v.candidate.situation !== situation ||
  typeof v.needsClarification !== 'boolean' || !['model', 'local'].includes(v.source) ||
  (confirmed && v.candidate.resistance !== confirmed)) throw Error('invalid_suggestion');
 return v;
}
// A single active request owns the result. Cancel also invalidates responses already in flight.
export class SuggestionRequest {
 private controller: AbortController | null = null;
 private generation = 0;
 cancel() { this.generation++; this.controller?.abort(); this.controller = null; }
 async run(situation: string, confirmedResistance: Resistance | null, fetchImpl: typeof fetch = fetch): Promise<SuggestionResult | null> {
  this.cancel();
  const generation = this.generation;
  const controller = new AbortController(); this.controller = controller;
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
   const r = await fetchImpl('/api/suggestion', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
    body: JSON.stringify({ situation, confirmedResistance, consentVersion: CONSENT_VERSION }) });
   if (!r.ok) throw Error(r.status === 429 ? 'limit' : 'unavailable');
   const parsed = parseSuggestion(await r.json(), situation, confirmedResistance);
   return generation === this.generation && !controller.signal.aborted ? parsed : null;
  } catch (e) { if (generation !== this.generation) return null; throw e;
  } finally { clearTimeout(timer); if (generation === this.generation) this.controller = null; }
 }
}
