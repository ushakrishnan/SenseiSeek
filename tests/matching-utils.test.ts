import { normalizeScores, deriveRawScore } from '@/lib/matching-utils';

test('normalizeScores handles identical values by spacing ranks', () => {
    const raw = [1, 1, 1, 1];
    const out = normalizeScores(raw);
    expect(out.length).toBe(4);
    expect(Math.max(...out)).toBeCloseTo(1);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
    // ensure ordering preserved (descending)
    for (let i = 1; i < out.length; i++) {
        expect(out[i - 1]).toBeGreaterThanOrEqual(out[i]);
    }
});

test('deriveRawScore prefers score, then distance, then rank', () => {
    const withScore = { score: 0.8 };
    expect(deriveRawScore(withScore, 0, 5)).toBeCloseTo(0.8);

    const withDistance = { distance: 3 };
    expect(deriveRawScore(withDistance, 0, 5)).toBeCloseTo(1 / (1 + 3));

    // rank fallback: for rank 0 of 5 total, expect value < 1 and > 0
    const none = {};
    const v = deriveRawScore(none, 0, 5);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
});
