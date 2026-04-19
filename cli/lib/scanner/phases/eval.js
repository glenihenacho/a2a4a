import * as docker from "../../docker.js";

export async function phase(ctx) {
  const output = [];
  const evalClaims = ctx.manifest?.evalClaims || [];

  if (evalClaims.length === 0) {
    output.push("? No eval claims declared in manifest");
    ctx.evalResults = { claims: [], tested: 0, passed: 0 };
    return { status: "warn", output, data: ctx.evalResults };
  }

  output.push(`${evalClaims.length} eval claims declared`);

  const results = [];
  for (const claim of evalClaims) {
    output.push(`Claim: ${claim.metric} — target: ${claim.target}`);

    try {
      const evalJob = JSON.stringify({
        mode: "eval",
        metric: claim.metric,
        target: claim.target,
      });

      const result = docker.run(ctx.imageUri, "", {
        network: "none",
        memory: "512m",
        cpus: "1",
        env: [`EVAL_SPEC=${evalJob}`, "AP_EVAL=1"],
        timeout: 60_000,
      });

      let evalOutput;
      try {
        evalOutput = JSON.parse(result.output);
      } catch {
        evalOutput = { achieved: "unknown", pass: false };
      }

      results.push({
        metric: claim.metric,
        target: claim.target,
        achieved: evalOutput.achieved || "unknown",
        pass: evalOutput.pass || false,
        durationMs: result.durationMs,
      });

      const status = evalOutput.pass ? "" : "? ";
      output.push(`${status}${claim.metric}: achieved=${evalOutput.achieved || "unknown"} ${evalOutput.pass ? "(pass)" : "(untested)"}`);
    } catch (err) {
      results.push({
        metric: claim.metric,
        target: claim.target,
        achieved: null,
        pass: false,
        error: err.message,
      });
      output.push(`? ${claim.metric}: eval failed — ${err.message}`);
    }
  }

  const passed = results.filter((r) => r.pass).length;
  ctx.evalResults = { claims: results, tested: results.length, passed };

  return {
    status: passed === results.length ? "pass" : "warn",
    output,
    data: ctx.evalResults,
  };
}
