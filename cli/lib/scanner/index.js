import { SCAN_PHASES } from "../../shared/constants.js";
import { phaseHeader, phaseResult, c, progressBar } from "../output.js";

import { phase as pullPhase } from "./phases/pull.js";
import { phase as inspectPhase } from "./phases/inspect.js";
import { phase as manifestPhase } from "./phases/manifest.js";
import { phase as capabilitiesPhase } from "./phases/capabilities.js";
import { phase as schemasPhase } from "./phases/schemas.js";
import { phase as toolsPhase } from "./phases/tools.js";
import { phase as slaPhase } from "./phases/sla.js";
import { phase as policyPhase } from "./phases/policy.js";
import { phase as evalPhase } from "./phases/eval.js";
import { phase as wrapPhase } from "./phases/wrap.js";

const PHASE_MODULES = {
  pull: pullPhase,
  inspect: inspectPhase,
  manifest: manifestPhase,
  capabilities: capabilitiesPhase,
  schemas: schemasPhase,
  tools: toolsPhase,
  sla: slaPhase,
  policy: policyPhase,
  eval: evalPhase,
  wrap: wrapPhase,
};

export async function runScanPipeline(imageUri, manifestPath, options = {}) {
  const phases = options.phases
    ? SCAN_PHASES.filter((p) => options.phases.includes(p.id))
    : options.skip
      ? SCAN_PHASES.filter((p) => !options.skip.includes(p.id))
      : SCAN_PHASES;

  const context = {
    imageUri,
    manifestPath,
    manifest: null,
    inspectData: null,
    extractedFs: null,
    capabilities: [],
    tools: [],
    schemas: null,
    slaResults: null,
    policyResults: null,
    evalResults: null,
    wrapperConfig: null,
    options,
  };

  const results = [];
  let criticalFailure = false;

  for (let i = 0; i < phases.length; i++) {
    const phaseSpec = phases[i];
    const phaseFn = PHASE_MODULES[phaseSpec.id];

    if (!phaseFn) {
      results.push({ id: phaseSpec.id, status: "skip", output: [], data: null, durationMs: 0 });
      continue;
    }

    if (criticalFailure) {
      results.push({ id: phaseSpec.id, status: "skip", output: ["Skipped due to earlier critical failure"], data: null, durationMs: 0 });
      if (!options.json) {
        console.log(phaseHeader(i, phases.length, phaseSpec.label));
        console.log(phaseResult("fail", "Skipped due to earlier critical failure"));
      }
      continue;
    }

    if (!options.json) {
      console.log();
      console.log(phaseHeader(i, phases.length, phaseSpec.label));
    }

    const start = Date.now();
    let result;
    try {
      result = await phaseFn(context);
    } catch (err) {
      result = { status: "fail", output: [err.message], data: null };
    }
    result.durationMs = Date.now() - start;
    result.id = phaseSpec.id;

    if (!options.json) {
      for (const line of result.output || []) {
        const lvl = line.startsWith("!") ? "fail" : line.startsWith("?") ? "warn" : "pass";
        console.log(phaseResult(lvl, line.replace(/^[!?]\s*/, "")));
      }
      console.log(`  ${c.dim}${result.durationMs}ms${c.reset}`);
    }

    results.push(result);

    if (result.status === "fail" && ["pull", "inspect", "manifest"].includes(phaseSpec.id)) {
      criticalFailure = true;
    }
  }

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === "pass").length,
    warn: results.filter((r) => r.status === "warn").length,
    fail: results.filter((r) => r.status === "fail").length,
    skip: results.filter((r) => r.status === "skip").length,
    overallStatus: results.some((r) => r.status === "fail") ? "fail" : results.some((r) => r.status === "warn") ? "warn" : "pass",
  };

  return { phases: results, manifest: context.manifest, wrapperConfig: context.wrapperConfig, summary };
}
