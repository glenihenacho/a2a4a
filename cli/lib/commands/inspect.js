import { resolve } from "node:path";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { loadManifest } from "../manifest.js";
import { ok, warn, fail, info, heading, json as jsonOut, c, phaseHeader, phaseResult } from "../output.js";
import { SCAN_PHASES } from "../../shared/constants.js";

const PY_DECORATOR = /@(?:capability|tool|handler)\s*(?:\([^)]*\))?/g;
const PY_FUNCTION = /def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*(\w+))?/g;
const PY_PYDANTIC = /class\s+(\w+)\s*\(\s*BaseModel\s*\)/g;
const PY_IMPORT = /^(?:import|from)\s+(\S+)/gm;

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
};

function walkPythonFiles(dir, maxDepth = 5) {
  const files = [];
  function recurse(d, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = `${d}/${e.name}`;
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "__pycache__" && e.name !== ".git") {
        recurse(full, depth + 1);
      } else if (e.isFile() && (e.name.endsWith(".py") || e.name.endsWith(".pyi"))) {
        files.push(full);
      }
    }
  }
  recurse(dir, 0);
  return files;
}

function scanSource(dir) {
  const pyFiles = walkPythonFiles(dir);
  const capabilities = [];
  const imports = new Set();
  const pydanticModels = [];
  const decorators = [];

  for (const file of pyFiles) {
    let content;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }

    for (const match of content.matchAll(PY_DECORATOR)) {
      decorators.push({ file, decorator: match[0] });
    }

    for (const match of content.matchAll(PY_FUNCTION)) {
      const [, name, params, returnType] = match;
      const nearDecorator = decorators.some(
        (d) => d.file === file && content.indexOf(d.decorator) < content.indexOf(match[0]) && content.indexOf(match[0]) - content.indexOf(d.decorator) < 200,
      );
      if (nearDecorator) {
        capabilities.push({ name, params: params.trim(), returnType: returnType || null, file });
      }
    }

    for (const match of content.matchAll(PY_PYDANTIC)) {
      pydanticModels.push({ name: match[1], file });
    }

    for (const match of content.matchAll(PY_IMPORT)) {
      imports.add(match[1].split(".")[0]);
    }
  }

  return { pyFiles, capabilities, imports: [...imports], pydanticModels, decorators };
}

function detectTools(dir) {
  const tools = new Set();
  const reqFile = `${dir}/requirements.txt`;
  const pipfile = `${dir}/Pipfile`;
  const pyproject = `${dir}/pyproject.toml`;

  for (const f of [reqFile, pipfile, pyproject]) {
    if (!existsSync(f)) continue;
    const content = readFileSync(f, "utf-8");
    for (const [pkg, tool] of Object.entries(TOOL_SDKS)) {
      if (content.includes(pkg)) tools.add(tool);
    }
  }

  return [...tools];
}

export async function run(positional, flags) {
  const dir = resolve(positional[0] || process.cwd());
  const jsonMode = flags.json;

  const results = { dir, phases: [] };

  // Phase 3: manifest
  heading(phaseHeader(0, 4, SCAN_PHASES[2].label));
  const manifest = loadManifest(dir);
  if (manifest.found && manifest.errors.length === 0) {
    results.manifest = manifest.data;
    console.log(phaseResult("pass", `Found ${manifest.path}`));
    console.log(phaseResult("pass", `Name: ${manifest.data.name} v${manifest.data.version}`));
    console.log(phaseResult("pass", `Verticals: ${manifest.data.verticals.join(", ")}`));
    results.phases.push({ id: "manifest", status: "pass" });
  } else if (manifest.found) {
    console.log(phaseResult("warn", `Found but invalid: ${manifest.errors.join(", ")}`));
    results.phases.push({ id: "manifest", status: "warn", errors: manifest.errors });
  } else {
    console.log(phaseResult("warn", "No agent.manifest.json found — run `ap init` to scaffold"));
    results.phases.push({ id: "manifest", status: "warn", errors: manifest.errors });
  }

  // Phase 4: capabilities
  heading(phaseHeader(1, 4, SCAN_PHASES[3].label));
  const source = scanSource(dir);
  if (source.capabilities.length > 0) {
    for (const cap of source.capabilities) {
      console.log(phaseResult("pass", `@capability ${cap.name}(${cap.params})${cap.returnType ? ` → ${cap.returnType}` : ""}`));
    }
    results.capabilities = source.capabilities;
  } else if (source.pyFiles.length > 0) {
    console.log(phaseResult("warn", `${source.pyFiles.length} Python files found but no decorated capabilities`));
    info("  Add @capability, @tool, or @handler decorators to your functions");
  } else {
    console.log(phaseResult("warn", "No Python source files found"));
  }
  if (source.pydanticModels.length > 0) {
    console.log(phaseResult("pass", `${source.pydanticModels.length} Pydantic models: ${source.pydanticModels.map((m) => m.name).join(", ")}`));
  }
  results.phases.push({ id: "capabilities", status: source.capabilities.length > 0 ? "pass" : "warn", count: source.capabilities.length });

  // Phase 5: schemas
  heading(phaseHeader(2, 4, SCAN_PHASES[4].label));
  if (manifest.data?.inputSchema && manifest.data?.outputSchema) {
    console.log(phaseResult("pass", `Input: { ${manifest.data.inputSchema.fields.join(", ")} }`));
    console.log(phaseResult("pass", `Output: { ${manifest.data.outputSchema.fields.join(", ")} }`));
    results.phases.push({ id: "schemas", status: "pass" });
  } else if (source.pydanticModels.length > 0) {
    console.log(phaseResult("warn", `Inferred from Pydantic: ${source.pydanticModels.map((m) => m.name).join(", ")}`));
    results.phases.push({ id: "schemas", status: "warn" });
  } else {
    console.log(phaseResult("warn", "No I/O schemas declared — add inputSchema/outputSchema to manifest"));
    results.phases.push({ id: "schemas", status: "warn" });
  }

  // Phase 6: tools
  heading(phaseHeader(3, 4, SCAN_PHASES[5].label));
  const tools = detectTools(dir);
  const declaredTools = manifest.data?.toolRequirements || [];
  if (tools.length > 0) {
    for (const t of tools) {
      const declared = declaredTools.includes(t);
      console.log(phaseResult(declared ? "pass" : "warn", `${t}${declared ? "" : " (undeclared — add to toolRequirements)"}`));
    }
  }
  const undeclaredInManifest = declaredTools.filter((t) => !tools.includes(t));
  for (const t of undeclaredInManifest) {
    console.log(phaseResult("warn", `${t} (declared but not detected in dependencies)`));
  }
  if (tools.length === 0 && declaredTools.length === 0) {
    console.log(phaseResult("pass", "No tool dependencies detected"));
  }
  results.phases.push({ id: "tools", status: "pass", detected: tools, declared: declaredTools });

  console.log();
  const passCount = results.phases.filter((p) => p.status === "pass").length;
  const total = results.phases.length;
  if (passCount === total) {
    ok(`All ${total} phases passed`);
  } else {
    warn(`${passCount}/${total} phases passed — review warnings above`);
  }

  if (jsonMode) {
    console.log();
    jsonOut(results);
  }
}
