import { resolve } from "node:path";
import { loadManifest } from "../manifest.js";
import * as docker from "../docker.js";
import { ok, warn, fail, info, heading, json as jsonOut, c } from "../output.js";

export async function run(positional, flags) {
  const dir = resolve(positional[0] || process.cwd());
  const manifest = loadManifest(dir);

  if (!manifest.found || manifest.errors.length > 0) {
    fail("Valid agent.manifest.json required");
    return;
  }

  if (!docker.isDockerAvailable()) {
    fail("Docker is not available");
    return;
  }

  const imageUri = manifest.data.docker?.image || manifest.data.name.toLowerCase().replace(/\s+/g, "-");

  const capability = flags.capability;
  const caps = manifest.data.capabilities;

  if (capability) {
    const cap = caps.find((c) => c.name === capability);
    if (!cap) {
      fail(`Capability "${capability}" not found. Available: ${caps.map((c) => c.name).join(", ")}`);
      return;
    }
    heading(`Testing capability: ${cap.name}`);
  } else {
    heading(`Testing agent: ${manifest.data.name}`);
  }

  const jobSpec = {
    agent_id: "test",
    client_id: "test",
    intent_signal_id: "test",
    parameters: {
      target_url: "https://example.com",
      keywords: ["test"],
      ...(capability ? { capability } : {}),
    },
    budget_cap: 100,
    sla_requirements: manifest.data.sla,
    escrow_tx_id: "test",
    callback_url: "http://localhost/callback",
  };

  info(`Image: ${imageUri}`);
  info(`Network: restricted`);

  try {
    const result = docker.run(imageUri, "", {
      network: "none",
      memory: "512m",
      cpus: "1",
      env: [`JOBSPEC=${JSON.stringify(jobSpec)}`, "AP_TEST=1"],
      timeout: 120_000,
    });

    let output;
    try {
      output = JSON.parse(result.output);
    } catch {
      output = { raw: result.output };
    }

    console.log();
    ok(`Completed in ${result.durationMs}ms`);

    if (flags.json) {
      jsonOut({ durationMs: result.durationMs, output });
    } else {
      if (output.status) info(`Status: ${output.status}`);
      if (output.artifacts) info(`Artifacts: ${output.artifacts.length}`);
      if (output.metrics) info(`Metrics: ${JSON.stringify(output.metrics)}`);
      if (output.raw) {
        info("Raw output:");
        console.log(output.raw);
      }
    }
  } catch (err) {
    fail(`Test failed: ${err.message}`);
  }
}
