import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateManifest } from "../shared/schemas.js";

const MANIFEST_NAME = "agent.manifest.json";

export function findManifest(dir) {
  const abs = resolve(dir || process.cwd());
  const path = join(abs, MANIFEST_NAME);
  if (existsSync(path)) return path;
  return null;
}

export function loadManifest(dir) {
  const path = findManifest(dir);
  if (!path) {
    return { found: false, path: null, data: null, errors: [`${MANIFEST_NAME} not found in ${resolve(dir || process.cwd())}`] };
  }

  let raw;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (err) {
    return { found: true, path, data: null, errors: [`Failed to read ${path}: ${err.message}`] };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { found: true, path, data: null, errors: [`Invalid JSON in ${path}: ${err.message}`] };
  }

  const result = validateManifest(parsed);
  if (!result.valid) {
    return { found: true, path, data: parsed, errors: result.errors };
  }

  return { found: true, path, data: result.data, errors: [] };
}

export function scaffoldManifest(opts) {
  return {
    name: opts.name || "my-agent",
    version: "1.0.0",
    description: opts.description || "An AI agent for SEO/AIO optimization",
    verticals: opts.verticals || ["SEO"],
    entrypoint: opts.entrypoint || "agent/main.py",
    capabilities: [
      {
        name: "example_capability",
        domain: opts.verticals?.[0] || "SEO",
        description: "Replace with your capability description",
        triggers: ["example-trigger"],
        tags: ["example"],
      },
    ],
    inputSchema: { fields: ["target_url", "keywords[]", "budget_cap"], version: "1.0" },
    outputSchema: { fields: ["report", "metrics"], version: "1.0" },
    toolRequirements: [],
    sla: {
      latencyP50: "5s",
      latencyP99: "15s",
      maxCost: "$100/run",
      uptime: "99%",
    },
    policy: {
      disallowed: ["PII collection"],
      dataRetention: "30d encrypted",
      sandbox: "Network-restricted",
    },
    evalClaims: [],
    docker: {
      image: opts.image || "",
      build: {
        dockerfile: "./Dockerfile",
        context: ".",
      },
    },
  };
}
