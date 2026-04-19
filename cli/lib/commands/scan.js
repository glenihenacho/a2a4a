import { resolve } from "node:path";
import { runScanPipeline } from "../scanner/index.js";
import { findManifest } from "../manifest.js";
import { ok, warn, fail, heading, json as jsonOut, c, progressBar } from "../output.js";

export async function run(positional, flags) {
  const imageUri = positional[0];
  if (!imageUri) {
    fail("Usage: ap scan <imageUri> [--phases=...] [--skip=...] [--json]");
    return;
  }

  const manifestPath = findManifest(process.cwd());
  const options = {
    json: flags.json,
    phases: flags.phases ? flags.phases.split(",") : null,
    skip: flags.skip ? flags.skip.split(",") : null,
    slaIterations: flags.iterations ? parseInt(flags.iterations, 10) : undefined,
  };

  if (!flags.json) {
    heading(`Scanning ${imageUri}`);
    if (manifestPath) console.log(`${c.dim}Manifest: ${manifestPath}${c.reset}`);
    console.log();
  }

  const result = await runScanPipeline(imageUri, manifestPath, options);

  if (flags.json) {
    jsonOut(result);
    return;
  }

  console.log();
  const { summary } = result;
  const bar = progressBar(summary.pass, summary.total);
  console.log(`${c.bold}Summary${c.reset}  ${bar}`);
  console.log(`  Pass: ${c.green}${summary.pass}${c.reset}  Warn: ${c.yellow}${summary.warn}${c.reset}  Fail: ${c.red}${summary.fail}${c.reset}  Skip: ${c.dim}${summary.skip}${c.reset}`);

  if (summary.overallStatus === "pass") {
    ok("All phases passed — agent is ready for publishing");
  } else if (summary.overallStatus === "warn") {
    warn("Some phases have warnings — review before publishing");
  } else {
    fail("Scan failed — fix critical issues before publishing");
  }
}
