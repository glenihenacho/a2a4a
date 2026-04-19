import { readdirSync, readFileSync, existsSync } from "node:fs";

const PY_DECORATOR = /@(?:capability|tool|handler)\s*(?:\([^)]*\))?/g;
const PY_FUNCTION = /def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*(\w+))?/g;
const PY_PYDANTIC = /class\s+(\w+)\s*\(\s*BaseModel\s*\)/g;

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
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "__pycache__" && e.name !== "node_modules") {
        recurse(full, depth + 1);
      } else if (e.isFile() && (e.name.endsWith(".py") || e.name.endsWith(".pyi"))) {
        files.push(full);
      }
    }
  }
  recurse(dir, 0);
  return files;
}

export async function phase(ctx) {
  const output = [];
  const discovered = [];

  const scanDir = ctx.extractedFs || ctx.manifestPath?.replace(/\/[^/]+$/, "");
  if (!scanDir) {
    if (ctx.manifest?.capabilities?.length > 0) {
      ctx.capabilities = ctx.manifest.capabilities;
      output.push(`${ctx.manifest.capabilities.length} capabilities from manifest (no filesystem to scan)`);
      return { status: "pass", output, data: ctx.manifest.capabilities };
    }
    return { status: "warn", output: ["? No filesystem available and no manifest capabilities"], data: [] };
  }

  const pyFiles = walkPythonFiles(scanDir);
  output.push(`Scanned ${pyFiles.length} Python files`);

  for (const file of pyFiles) {
    let content;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }

    const decorators = [...content.matchAll(PY_DECORATOR)];
    for (const match of content.matchAll(PY_FUNCTION)) {
      const [fullMatch, name, params, returnType] = match;
      const pos = content.indexOf(fullMatch);
      const nearDeco = decorators.some((d) => {
        const dPos = content.indexOf(d[0]);
        return dPos < pos && pos - dPos < 200;
      });

      if (nearDeco) {
        discovered.push({
          name,
          params: params.trim(),
          returnType: returnType || null,
          file: file.replace(scanDir, "."),
          source: "decorator",
        });
      }
    }

    for (const match of content.matchAll(PY_PYDANTIC)) {
      discovered.push({
        name: match[1],
        file: file.replace(scanDir, "."),
        source: "pydantic",
        type: "model",
      });
    }
  }

  const manifestCaps = ctx.manifest?.capabilities || [];

  if (discovered.length > 0) {
    for (const cap of discovered) {
      if (cap.type === "model") {
        output.push(`Pydantic: ${cap.name}`);
      } else {
        const declared = manifestCaps.some((m) => m.name === cap.name);
        output.push(`@capability ${cap.name}(${cap.params})${declared ? "" : " (undeclared)"}`);
      }
    }
  }

  if (manifestCaps.length > 0) {
    const discoveredNames = new Set(discovered.filter((d) => d.source === "decorator").map((d) => d.name));
    for (const mc of manifestCaps) {
      if (!discoveredNames.has(mc.name)) {
        output.push(`? ${mc.name} declared in manifest but not found in source`);
      }
    }
  }

  const mergedCaps = manifestCaps.length > 0 ? manifestCaps : discovered.filter((d) => d.source === "decorator").map((d) => ({
    name: d.name,
    domain: "SEO",
    description: `Auto-discovered capability: ${d.name}`,
    triggers: [d.name.replace(/_/g, "-")],
    tags: [],
  }));

  ctx.capabilities = mergedCaps;

  return {
    status: discovered.length > 0 || manifestCaps.length > 0 ? "pass" : "warn",
    output,
    data: { discovered, manifest: manifestCaps, merged: mergedCaps },
  };
}
