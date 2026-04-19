import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateManifest } from "../../../shared/schemas.js";

export async function phase(ctx) {
  const output = [];
  let manifestData = null;

  const locations = [
    ctx.manifestPath,
    ctx.extractedFs ? join(ctx.extractedFs, "agent.manifest.json") : null,
    ctx.extractedFs ? join(ctx.extractedFs, "app", "agent.manifest.json") : null,
    ctx.extractedFs ? join(ctx.extractedFs, "src", "agent.manifest.json") : null,
  ].filter(Boolean);

  for (const loc of locations) {
    if (existsSync(loc)) {
      try {
        const raw = readFileSync(loc, "utf-8");
        manifestData = JSON.parse(raw);
        output.push(`Found manifest at ${loc}`);
        break;
      } catch (err) {
        output.push(`? Found ${loc} but failed to parse: ${err.message}`);
      }
    }
  }

  if (!manifestData) {
    output.push("? No agent.manifest.json found — will infer from image analysis");
    return { status: "warn", output, data: null };
  }

  const validation = validateManifest(manifestData);

  if (!validation.valid) {
    output.push("? Manifest has validation errors:");
    for (const err of validation.errors) {
      output.push(`  ${err}`);
    }
    ctx.manifest = manifestData;
    return { status: "warn", output, data: manifestData };
  }

  ctx.manifest = validation.data;

  output.push(`Name: ${validation.data.name}`);
  output.push(`Version: ${validation.data.version}`);
  output.push(`Verticals: ${validation.data.verticals.join(", ")}`);
  output.push(`Capabilities: ${validation.data.capabilities.length} declared`);

  return { status: "pass", output, data: validation.data };
}
