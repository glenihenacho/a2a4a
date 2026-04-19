import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const TOOL_SDKS = {
  scrapy: "web_crawler",
  selenium: "browser_automation",
  playwright: "browser_automation",
  beautifulsoup4: "html_parser",
  bs4: "html_parser",
  requests: "http_client",
  aiohttp: "http_client",
  httpx: "http_client",
  openai: "llm_api",
  anthropic: "llm_api",
  "google-cloud-language": "nlp_api",
  spacy: "nlp_api",
  lighthouse: "lighthouse_api",
  "google-api-python-client": "google_api",
  serpapi: "serp_tracker",
  pytrends: "trend_tracker",
  schema_org: "schema_validator",
  boto3: "aws_sdk",
  psycopg2: "database",
  sqlalchemy: "database",
  redis: "cache",
  celery: "task_queue",
};

function detectFromDeps(dir) {
  const tools = new Set();
  const depFiles = ["requirements.txt", "Pipfile", "pyproject.toml", "setup.py", "setup.cfg"];

  for (const f of depFiles) {
    const path = join(dir, f);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf-8");
    for (const [pkg, tool] of Object.entries(TOOL_SDKS)) {
      if (content.includes(pkg)) tools.add(tool);
    }
  }

  return [...tools];
}

function detectFromImports(dir) {
  const tools = new Set();
  const pyImportMap = {
    scrapy: "web_crawler",
    selenium: "browser_automation",
    playwright: "browser_automation",
    bs4: "html_parser",
    requests: "http_client",
    aiohttp: "http_client",
    httpx: "http_client",
    openai: "llm_api",
    anthropic: "llm_api",
    spacy: "nlp_api",
    boto3: "aws_sdk",
    redis: "cache",
    celery: "task_queue",
  };

  function walkPy(d, depth) {
    if (depth > 4) return;
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "__pycache__") {
        walkPy(full, depth + 1);
      } else if (e.isFile() && e.name.endsWith(".py")) {
        try {
          const content = readFileSync(full, "utf-8");
          for (const [mod, tool] of Object.entries(pyImportMap)) {
            if (content.includes(`import ${mod}`) || content.includes(`from ${mod}`)) {
              tools.add(tool);
            }
          }
        } catch { /* skip unreadable */ }
      }
    }
  }

  walkPy(dir, 0);
  return [...tools];
}

export async function phase(ctx) {
  const output = [];
  const scanDir = ctx.extractedFs || ctx.manifestPath?.replace(/\/[^/]+$/, "");

  let detected = [];
  if (scanDir) {
    const fromDeps = detectFromDeps(scanDir);
    const fromImports = detectFromImports(scanDir);
    detected = [...new Set([...fromDeps, ...fromImports])];
  }

  const declared = ctx.manifest?.toolRequirements || [];

  if (detected.length > 0) {
    for (const t of detected) {
      const isDeclared = declared.includes(t);
      output.push(`${isDeclared ? "" : "? "}${t}${isDeclared ? "" : " (detected but undeclared — add to toolRequirements)"}`);
    }
  }

  for (const t of declared) {
    if (!detected.includes(t)) {
      output.push(`? ${t} (declared but not detected in dependencies)`);
    }
  }

  if (detected.length === 0 && declared.length === 0) {
    output.push("No tool dependencies detected");
  }

  const undeclared = detected.filter((t) => !declared.includes(t));
  ctx.tools = { detected, declared, undeclared };

  return {
    status: undeclared.length > 0 ? "warn" : "pass",
    output,
    data: ctx.tools,
  };
}
