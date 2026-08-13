import { monitorEventLoopDelay } from "node:perf_hooks";

type Labels = Record<string, string>;

const counters = new Map<string, number>();
const gauges = new Map<string, number>();
const durationBuckets = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const durations = new Map<string, { count: number; sum: number; buckets: number[] }>();
const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
eventLoopDelay.enable();

function escapeLabel(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}

function labelText(labels: Labels) {
  const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
  return entries.length ? `{${entries.map(([key, value]) => `${key}="${escapeLabel(value)}"`).join(",")}}` : "";
}

function key(name: string, labels: Labels) {
  return `${name}${labelText(labels)}`;
}

function splitMetricKey(metricKey: string) {
  const labelStart = metricKey.indexOf("{");
  return labelStart === -1
    ? { name: metricKey, labels: "" }
    : { name: metricKey.slice(0, labelStart), labels: metricKey.slice(labelStart) };
}

export const metricsService = {
  increment(name: string, labels: Labels = {}, amount = 1) {
    const metricKey = key(name, labels);
    counters.set(metricKey, (counters.get(metricKey) ?? 0) + amount);
  },

  gauge(name: string, value: number, labels: Labels = {}) {
    gauges.set(key(name, labels), value);
  },

  observe(name: string, seconds: number, labels: Labels = {}) {
    const metricKey = key(name, labels);
    const value = durations.get(metricKey) ?? { count: 0, sum: 0, buckets: durationBuckets.map(() => 0) };
    value.count += 1;
    value.sum += seconds;
    durationBuckets.forEach((upperBound, index) => {
      if (seconds <= upperBound) value.buckets[index] += 1;
    });
    durations.set(metricKey, value);
  },

  render() {
    const memory = process.memoryUsage();
    const eventLoopP99 = Number.isFinite(eventLoopDelay.percentile(99))
      ? eventLoopDelay.percentile(99) / 1_000_000_000
      : 0;
    const lines = [
      "# HELP job_tracker_info Static Job Tracker process information.",
      "# TYPE job_tracker_info gauge",
      `job_tracker_info{process="${escapeLabel(process.env.METRICS_PROCESS ?? "api")}"} 1`,
      "# HELP process_resident_memory_bytes Resident memory used by the Node.js process.",
      "# TYPE process_resident_memory_bytes gauge",
      `process_resident_memory_bytes ${memory.rss}`,
      "# HELP nodejs_heap_size_used_bytes Heap memory used by the Node.js process.",
      "# TYPE nodejs_heap_size_used_bytes gauge",
      `nodejs_heap_size_used_bytes ${memory.heapUsed}`,
      "# HELP nodejs_eventloop_lag_p99_seconds Event-loop delay at the 99th percentile.",
      "# TYPE nodejs_eventloop_lag_p99_seconds gauge",
      `nodejs_eventloop_lag_p99_seconds ${eventLoopP99}`,
    ];
    for (const [metricKey, value] of counters) lines.push(`${metricKey} ${value}`);
    for (const [metricKey, value] of gauges) lines.push(`${metricKey} ${value}`);
    for (const [metricKey, value] of durations) {
      const { name, labels } = splitMetricKey(metricKey);
      const baseLabels = labels ? labels.slice(1, -1) : "";
      durationBuckets.forEach((upperBound, index) => {
        const combined = [baseLabels, `le="${upperBound}"`].filter(Boolean).join(",");
        lines.push(`${name}_bucket{${combined}} ${value.buckets[index]}`);
      });
      const combined = [baseLabels, 'le="+Inf"'].filter(Boolean).join(",");
      lines.push(`${name}_bucket{${combined}} ${value.count}`);
      lines.push(`${name}_sum${labels} ${value.sum}`);
      lines.push(`${name}_count${labels} ${value.count}`);
    }
    return `${lines.join("\n")}\n`;
  },

  resetForTests() {
    counters.clear(); gauges.clear(); durations.clear();
  },
};
