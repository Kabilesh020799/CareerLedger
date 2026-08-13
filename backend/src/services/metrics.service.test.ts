import { beforeEach, describe, expect, it } from "vitest";
import { metricsService } from "./metrics.service";

describe("metricsService", () => {
  beforeEach(() => metricsService.resetForTests());

  it("renders counters, gauges, and cumulative duration buckets", () => {
    metricsService.increment("job_tracker_jobs_total", { outcome: "ok" });
    metricsService.gauge("job_tracker_queue_jobs", 3, { queue: "gmail-sync", state: "waiting" });
    metricsService.observe("job_tracker_job_duration_seconds", 0.2, { worker: "gmail-sync" });

    const output = metricsService.render();
    expect(output).toContain('job_tracker_jobs_total{outcome="ok"} 1');
    expect(output).toContain('job_tracker_queue_jobs{queue="gmail-sync",state="waiting"} 3');
    expect(output).toContain('job_tracker_job_duration_seconds_bucket{worker="gmail-sync",le="0.25"} 1');
    expect(output).toContain('job_tracker_job_duration_seconds_count{worker="gmail-sync"} 1');
  });

  it("escapes label values in Prometheus format", () => {
    metricsService.increment("job_tracker_test_total", { value: 'quote"\\newline\n' });
    expect(metricsService.render()).toContain('value="quote\\"\\\\newline\\n"');
  });
});
