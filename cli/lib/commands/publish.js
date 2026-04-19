import { resolve } from "node:path";
import { loadManifest, findManifest } from "../manifest.js";
import { runScanPipeline } from "../scanner/index.js";
import { post } from "../remote.js";
import { isAuthenticated } from "../session.js";
import * as docker from "../docker.js";
import { ok, warn, fail, info, heading, json as jsonOut, c, progressBar } from "../output.js";

export async function run(positional, flags) {
  if (!isAuthenticated()) {
    fail("Not authenticated — run: ap login <email> <password>");
    return;
  }

  const dir = resolve(positional[0] || process.cwd());
  const manifest = loadManifest(dir);

  if (!manifest.found || manifest.errors.length > 0) {
    fail("Valid agent.manifest.json required");
    if (manifest.errors.length > 0) {
      for (const err of manifest.errors) info(`  ${err}`);
    }
    return;
  }

  if (!docker.isDockerAvailable()) {
    fail("Docker is not available");
    return;
  }

  const imageUri = manifest.data.docker?.image || manifest.data.name.toLowerCase().replace(/\s+/g, "-");

  // Run scan pipeline
  if (!flags["skip-scan"]) {
    heading("Running scan pipeline");
    const manifestPath = findManifest(dir);
    const scanResult = await runScanPipeline(imageUri, manifestPath, { json: false });

    if (scanResult.summary.overallStatus === "fail") {
      fail("Scan failed — fix critical issues before publishing");
      return;
    }

    if (scanResult.summary.overallStatus === "warn" && !flags.force) {
      warn("Scan has warnings. Use --force to publish anyway.");
      return;
    }

    console.log();
    const bar = progressBar(scanResult.summary.pass, scanResult.summary.total);
    console.log(`${c.bold}Scan${c.reset}  ${bar}`);
  }

  // Push image if remote registry is specified
  if (manifest.data.docker?.image && manifest.data.docker.image.includes("/")) {
    heading("Pushing image");
    try {
      docker.push(imageUri);
      ok(`Pushed ${imageUri}`);
    } catch (err) {
      fail(`Push failed: ${err.message}`);
      return;
    }
  }

  // Register on marketplace
  heading("Registering on marketplace");

  const digest = docker.getDigest(imageUri);
  const size = docker.getSize(imageUri);

  const payload = {
    manifest: manifest.data,
    imageUri,
    imageDigest: digest,
    imageSizeBytes: size,
  };

  try {
    const result = await post("/api/cli/publish", payload);

    console.log();
    ok(`Agent published: ${c.bold}${result.agentId}${c.reset}`);
    info(`Status: ${result.status}`);
    info(`Capabilities: ${result.capabilities.map((c) => c.name).join(", ")}`);

    if (flags.json) {
      jsonOut(result);
    }
  } catch (err) {
    fail(`Publish failed: ${err.message}`);
  }
}
