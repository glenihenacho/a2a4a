import { readdirSync, readFileSync } from "node:fs";
import * as docker from "../../docker.js";
import { MALWARE_PATTERNS } from "../../../shared/constants.js";

function walkSourceFiles(dir, maxDepth = 5) {
  const files = [];
  const extensions = [".py", ".pyi", ".sh", ".bash", ".js", ".ts", ".rb", ".go", ".rs"];
  function recurse(d, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = `${d}/${e.name}`;
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "__pycache__" && e.name !== "node_modules" && e.name !== ".git") {
        recurse(full, depth + 1);
      } else if (e.isFile() && extensions.some((ext) => e.name.endsWith(ext))) {
        files.push(full);
      }
    }
  }
  recurse(dir, 0);
  return files;
}

function scanForDisallowed(dir, disallowedPatterns) {
  const violations = [];
  const sourceFiles = walkSourceFiles(dir);

  for (const file of sourceFiles) {
    let content;
    try { content = readFileSync(file, "utf-8"); } catch { continue; }

    for (const pattern of disallowedPatterns) {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        violations.push({
          file: file.replace(dir, "."),
          pattern,
          severity: "policy",
        });
      }
    }
  }

  return violations;
}

function scanForMalware(dir) {
  const findings = [];
  const sourceFiles = walkSourceFiles(dir);

  for (const file of sourceFiles) {
    let content;
    try { content = readFileSync(file, "utf-8"); } catch { continue; }

    for (const mp of MALWARE_PATTERNS) {
      if (mp.pattern.test(content)) {
        findings.push({
          file: file.replace(dir, "."),
          id: mp.id,
          desc: mp.desc,
          severity: mp.severity,
        });
      }
    }
  }

  return findings;
}

function validateNetworkRestrictions(ctx) {
  const results = [];

  try {
    docker.run(ctx.imageUri, "echo network-test", {
      network: "none",
      timeout: 15_000,
    });
    results.push({ check: "network-none", pass: true });
  } catch {
    results.push({ check: "network-none", pass: false, reason: "Container failed to run with --network=none" });
  }

  return results;
}

export async function phase(ctx) {
  const output = [];
  const disallowed = ctx.manifest?.policy?.disallowed || [];
  const scanDir = ctx.extractedFs || ctx.manifestPath?.replace(/\/[^/]+$/, "");

  let policyViolations = [];
  let malwareFindings = [];
  let networkResults = [];
  let overallStatus = "pass";

  // Malware detection
  if (scanDir) {
    malwareFindings = scanForMalware(scanDir);
    if (malwareFindings.length > 0) {
      overallStatus = "fail";
      for (const f of malwareFindings) {
        output.push(`! MALWARE [${f.severity}] ${f.desc} in ${f.file}`);
      }
    } else {
      output.push("No malware patterns detected");
    }
  }

  // Disallowed content scan
  if (scanDir && disallowed.length > 0) {
    policyViolations = scanForDisallowed(scanDir, disallowed);
    if (policyViolations.length > 0) {
      if (overallStatus !== "fail") overallStatus = "warn";
      for (const v of policyViolations) {
        output.push(`? Policy violation: "${v.pattern}" in ${v.file}`);
      }
    } else {
      output.push(`${disallowed.length} disallowed patterns checked — clean`);
    }
  } else if (disallowed.length === 0) {
    output.push("? No disallowed patterns declared in policy");
  }

  // Network restriction validation
  try {
    networkResults = validateNetworkRestrictions(ctx);
    for (const r of networkResults) {
      if (r.pass) {
        output.push("Container runs with network restrictions");
      } else {
        output.push(`? ${r.reason}`);
        if (overallStatus !== "fail") overallStatus = "warn";
      }
    }
  } catch {
    output.push("? Could not validate network restrictions");
  }

  ctx.policyResults = {
    malwareFindings,
    policyViolations,
    networkResults,
    disallowed,
  };

  return { status: overallStatus, output, data: ctx.policyResults };
}
