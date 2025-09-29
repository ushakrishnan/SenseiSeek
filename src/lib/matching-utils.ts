// Utility helpers for matching score derivation and normalization.
// Keep these pure and testable.
export function deriveRawScore(match: any, rank: number, total: number) {
    // Prefer explicit score, then distance, then rank-derived fallback.
    if (match && typeof match.score === 'number' && Number.isFinite(match.score)) return match.score;
    if (match && typeof match.distance === 'number' && Number.isFinite(match.distance)) return 1 / (1 + match.distance);
    // rank-based fallback: rank starts at 0 -> convert to 1..N
    return 1 - ((rank + 1) / (Math.max(1, total) + 1));
}

export function normalizeScores(rawScores: number[], epsilon = 1e-6) {
    if (!rawScores || !rawScores.length) return [];
    if (rawScores.length === 1) return [1];
    const nums = rawScores.map(n => (Number(n) || 0));
    const minS = Math.min(...nums);
    const maxS = Math.max(...nums);
    const range = Math.abs(maxS - minS) < epsilon ? 0 : maxS - minS;
    if (range === 0) {
        // all identical (or nearly): assign spaced ranks to preserve ordering
        // produce values linearly spaced in (0..1], top = 1
        const spaced = nums.map((_, i) => (nums.length - i) / nums.length);
        const sMin = Math.min(...spaced);
        const sMax = Math.max(...spaced);
        // map into a narrower floor..1 range to avoid tiny/zero values in UI
        const normalized = spaced.map(v => (v - sMin) / (sMax - sMin || 1));
        const floor = 0.05; // ensure smallest visible score is at least 5%
        return normalized.map(v => floor + (1 - floor) * v);
    }
    const mapped = nums.map(v => (v - minS) / range);
    // avoid exact zeros which render as 0% in the UI; nudge to a tiny floor
    const floor = 1e-3;
    return mapped.map(v => Math.max(floor, Math.min(1, v)));
}

export function clampScore(v: number, min = 1e-4, max = 1e6) {
    if (!Number.isFinite(v)) return min;
    return Math.max(min, Math.min(max, v));
}
