// Minimal in-memory metrics helper for local testing and logs.
// In production wire this to your telemetry backend.
const counters: Record<string, number> = {};

export function emitMetric(name: string, value = 1) {
    counters[name] = (counters[name] || 0) + value;
    // Keep logs lightweight and only when VERBOSE_LOGS is enabled at call sites.
}

export function getMetric(name: string) {
    return counters[name] || 0;
}

export function resetMetrics() {
    for (const k of Object.keys(counters)) delete counters[k];
}
