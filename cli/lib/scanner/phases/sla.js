import * as docker from "../../docker.js";

const SYNTHETIC_JOBSPEC = JSON.stringify({
  agent_id: "test",
  client_id: "test",
  intent_signal_id: "test",
  parameters: { target_url: "https://example.com", keywords: ["test"] },
  budget_cap: 100,
  sla_requirements: {},
  escrow_tx_id: "test",
  callback_url: "http://localhost/callback",
});

const SLA_ITERATIONS = 3;

export async function phase(ctx) {
  const output = [];
  const declaredSla = ctx.manifest?.sla;

  if (!declaredSla) {
    output.push("? No SLA declared in manifest");
    return { status: "warn", output, data: null };
  }

  output.push(`Declared P50: ${declaredSla.latencyP50}  P99: ${declaredSla.latencyP99}  MaxCost: ${declaredSla.maxCost}`);

  const iterations = ctx.options?.slaIterations || SLA_ITERATIONS;
  const durations = [];
  const errors = [];

  for (let i = 0; i < iterations; i++) {
    try {
      const result = docker.run(ctx.imageUri, "", {
        network: "none",
        memory: "512m",
        cpus: "1",
        env: [`JOBSPEC=${SYNTHETIC_JOBSPEC}`, "AP_BENCHMARK=1"],
        timeout: 60_000,
      });
      durations.push(result.durationMs);
      output.push(`Run ${i + 1}: ${result.durationMs}ms`);
    } catch (err) {
      errors.push(err.message);
      output.push(`? Run ${i + 1} failed: ${err.message}`);
    }
  }

  if (durations.length === 0) {
    output.push("? All benchmark runs failed — cannot verify SLA");
    ctx.slaResults = { measured: null, declared: declaredSla, pass: false };
    return { status: "warn", output, data: ctx.slaResults };
  }

  durations.sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p99 = durations[Math.floor(durations.length * 0.99)] || durations[durations.length - 1];

  const declaredP50Ms = parseFloat(declaredSla.latencyP50) * 1000;
  const declaredP99Ms = parseFloat(declaredSla.latencyP99) * 1000;

  const p50Pass = p50 <= declaredP50Ms * 1.2;
  const p99Pass = p99 <= declaredP99Ms * 1.2;

  output.push(`Measured P50: ${p50}ms ${p50Pass ? "(pass)" : "? (exceeds declared)"}`);
  output.push(`Measured P99: ${p99}ms ${p99Pass ? "(pass)" : "? (exceeds declared)"}`);

  ctx.slaResults = {
    measured: { p50, p99, runs: durations.length, errors: errors.length },
    declared: declaredSla,
    pass: p50Pass && p99Pass,
  };

  return {
    status: p50Pass && p99Pass ? "pass" : "warn",
    output,
    data: ctx.slaResults,
  };
}
