import { SCAN_PHASES, WRAPPER_SPEC, MALWARE_PATTERNS } from "../cli/shared/constants.js";
import { validateManifest } from "../cli/shared/schemas.js";

const REQUIRED_INPUT_FIELDS = ["target_url", "budget_cap"];
const REQUIRED_OUTPUT_FIELDS = ["status"];

function runManifestPhase(manifest) {
  const output = [];
  if (!manifest) {
    return { id: "manifest", status: "warn", output: ["No manifest provided"], data: null, durationMs: 0 };
  }

  const start = Date.now();
  const result = validateManifest(manifest);

  if (!result.valid) {
    output.push("Manifest validation errors:");
    for (const err of result.errors) output.push(`  ${err}`);
    return { id: "manifest", status: "warn", output, data: manifest, durationMs: Date.now() - start };
  }

  output.push(`Name: ${result.data.name}`);
  output.push(`Version: ${result.data.version}`);
  output.push(`Verticals: ${result.data.verticals.join(", ")}`);
  output.push(`Capabilities: ${result.data.capabilities.length} declared`);
  return { id: "manifest", status: "pass", output, data: result.data, durationMs: Date.now() - start };
}

function runCapabilitiesPhase(manifest) {
  const output = [];
  const start = Date.now();
  const caps = manifest?.capabilities || [];

  if (caps.length === 0) {
    return { id: "capabilities", status: "warn", output: ["No capabilities declared in manifest"], data: [], durationMs: Date.now() - start };
  }

  for (const cap of caps) {
    const issues = [];
    if (!cap.name) issues.push("missing name");
    if (!cap.domain) issues.push("missing domain");
    if (!cap.triggers || cap.triggers.length === 0) issues.push("no triggers");
    if (issues.length > 0) {
      output.push(`? ${cap.name || "unnamed"}: ${issues.join(", ")}`);
    } else {
      output.push(`${cap.name} [${cap.domain}] — ${cap.triggers.length} triggers`);
    }
  }

  const hasIssues = output.some((l) => l.startsWith("?"));
  return { id: "capabilities", status: hasIssues ? "warn" : "pass", output, data: caps, durationMs: Date.now() - start };
}

function runSchemasPhase(manifest) {
  const output = [];
  const warnings = [];
  const start = Date.now();

  const inputSchema = manifest?.inputSchema;
  const outputSchema = manifest?.outputSchema;

  if (!inputSchema || !outputSchema) {
    output.push("No I/O schemas declared — using defaults");
    return { id: "schemas", status: "warn", output, data: { inferred: true }, durationMs: Date.now() - start };
  }

  output.push(`Input v${inputSchema.version}: { ${inputSchema.fields.join(", ")} }`);
  output.push(`Output v${outputSchema.version}: { ${outputSchema.fields.join(", ")} }`);

  for (const req of REQUIRED_INPUT_FIELDS) {
    if (!inputSchema.fields.some((f) => f.replace("[]", "") === req)) {
      warnings.push(`Input missing recommended field: ${req}`);
    }
  }
  for (const req of REQUIRED_OUTPUT_FIELDS) {
    if (!outputSchema.fields.some((f) => f.replace("[]", "") === req)) {
      warnings.push(`Output missing recommended field: ${req}`);
    }
  }

  output.push(`WRAPPER_SPEC: ${WRAPPER_SPEC.input.length} input / ${WRAPPER_SPEC.output.length} output fields`);
  output.push(...warnings.map((w) => `? ${w}`));

  return { id: "schemas", status: warnings.length > 0 ? "warn" : "pass", output, data: { inputSchema, outputSchema }, durationMs: Date.now() - start };
}

function runToolsPhase(manifest) {
  const output = [];
  const start = Date.now();
  const declared = manifest?.toolRequirements || [];

  if (declared.length === 0) {
    output.push("No tool dependencies declared");
    return { id: "tools", status: "pass", output, data: { declared: [], detected: [] }, durationMs: Date.now() - start };
  }

  for (const t of declared) {
    output.push(t);
  }
  output.push(`${declared.length} tools declared`);

  return { id: "tools", status: "pass", output, data: { declared, detected: [] }, durationMs: Date.now() - start };
}

function collectManifestText(manifest) {
  const parts = [];
  if (manifest.name) parts.push(manifest.name);
  if (manifest.description) parts.push(manifest.description);
  if (manifest.entrypoint) parts.push(manifest.entrypoint);
  for (const cap of manifest.capabilities || []) {
    if (cap.name) parts.push(cap.name);
    if (cap.description) parts.push(cap.description);
    for (const t of cap.triggers || []) parts.push(t);
    for (const t of cap.tags || []) parts.push(t);
  }
  for (const t of manifest.toolRequirements || []) parts.push(t);
  if (manifest.policy?.sandbox) parts.push(manifest.policy.sandbox);
  if (manifest.policy?.dataRetention) parts.push(manifest.policy.dataRetention);
  for (const d of manifest.policy?.disallowed || []) parts.push(d);
  for (const e of manifest.evalClaims || []) {
    if (e.metric) parts.push(e.metric);
    if (e.target) parts.push(e.target);
  }
  return parts.join("\n");
}

function runPolicyPhase(manifest) {
  const output = [];
  const start = Date.now();
  const disallowed = manifest?.policy?.disallowed || [];
  let overallStatus = "pass";
  const malwareFindings = [];

  const text = collectManifestText(manifest);
  for (const mp of MALWARE_PATTERNS) {
    if (mp.pattern.test(text)) {
      malwareFindings.push({ id: mp.id, severity: mp.severity, desc: mp.desc });
      output.push(`! MALWARE [${mp.severity}] ${mp.desc} (${mp.id})`);
      if (mp.severity === "critical") overallStatus = "fail";
      else if (overallStatus !== "fail") overallStatus = "warn";
    }
  }

  if (malwareFindings.length === 0) {
    output.push("No malware patterns detected in manifest");
  }

  if (disallowed.length > 0) {
    output.push(`${disallowed.length} disallowed patterns declared`);
    for (const d of disallowed) output.push(`  ${d}`);
  } else {
    output.push("? No disallowed patterns declared in policy");
    if (overallStatus === "pass") overallStatus = "warn";
  }

  if (manifest?.policy?.sandbox) output.push(`Sandbox: ${manifest.policy.sandbox}`);
  if (manifest?.policy?.dataRetention) output.push(`Data retention: ${manifest.policy.dataRetention}`);
  output.push("Network restriction test deferred (requires Docker)");

  return { id: "policy", status: overallStatus, output, data: { malwareFindings, disallowed }, durationMs: Date.now() - start };
}

function runWrapPhase(manifest) {
  const output = [];
  const start = Date.now();
  const tools = manifest?.toolRequirements || [];
  const budgetCap = manifest?.sla?.maxCost || "$100/run";

  const wrapperConfig = {
    version: "1.0",
    agentName: manifest?.name || "unknown",
    agentVersion: manifest?.version || "0.0.0",
    verticals: manifest?.verticals || [],
    formatTranslation: {
      inputMapping: WRAPPER_SPEC.input.map((f) => ({ field: f.field, type: f.type, mapped: true })),
      outputMapping: WRAPPER_SPEC.output.map((f) => ({ field: f.field, type: f.type, mapped: true })),
    },
    budgetEnforcement: { hardCap: budgetCap, perToolLimits: {}, alertThreshold: 0.8 },
    toolAllowlist: { allowed: tools, proxyEnabled: true, auditLogging: true },
    telemetry: { enabled: true, events: ["start", "checkpoint", "tool_call", "artifact", "complete", "error"] },
    checkpointing: { enabled: true, strategy: "milestone", maxCheckpoints: 10 },
    artifactSchema: { version: "1.0", requiredFields: ["type", "content", "mime_type"], maxSizeBytes: 50 * 1024 * 1024 },
  };

  output.push(`Agent: ${wrapperConfig.agentName} v${wrapperConfig.agentVersion}`);
  output.push(`Budget: ${budgetCap}`);
  output.push(`Tools: ${tools.length}`);
  for (const r of WRAPPER_SPEC.responsibilities) {
    output.push(`${r.icon} ${r.label}`);
  }

  return { id: "wrap", status: "pass", output, data: wrapperConfig, durationMs: Date.now() - start };
}

const DOCKER_PHASES = new Set(["pull", "inspect", "sla", "eval"]);

export function runServerScan(manifest) {
  const phases = [];

  for (const sp of SCAN_PHASES) {
    if (DOCKER_PHASES.has(sp.id)) {
      phases.push({
        id: sp.id,
        status: "skip",
        output: [`Skipped — requires Docker (use CLI: ap scan)`],
        data: null,
        durationMs: 0,
      });
      continue;
    }

    switch (sp.id) {
      case "manifest":
        phases.push(runManifestPhase(manifest));
        break;
      case "capabilities":
        phases.push(runCapabilitiesPhase(manifest));
        break;
      case "schemas":
        phases.push(runSchemasPhase(manifest));
        break;
      case "tools":
        phases.push(runToolsPhase(manifest));
        break;
      case "policy":
        phases.push(runPolicyPhase(manifest));
        break;
      case "wrap":
        phases.push(runWrapPhase(manifest));
        break;
      default:
        phases.push({ id: sp.id, status: "skip", output: ["Unknown phase"], data: null, durationMs: 0 });
    }
  }

  const summary = {
    total: phases.length,
    pass: phases.filter((p) => p.status === "pass").length,
    warn: phases.filter((p) => p.status === "warn").length,
    fail: phases.filter((p) => p.status === "fail").length,
    skip: phases.filter((p) => p.status === "skip").length,
    overallStatus: phases.some((p) => p.status === "fail")
      ? "fail"
      : phases.some((p) => p.status === "warn")
        ? "warn"
        : "pass",
  };

  return { phases, summary };
}

export function startScanWorker(db, schema) {
  if (!db) return;

  const POLL_INTERVAL = 5_000;

  async function processPendingScans() {
    try {
      const { eq } = await import("drizzle-orm");
      const pending = await db
        .select()
        .from(schema.agentScans)
        .where(eq(schema.agentScans.status, "pending"))
        .limit(1);

      if (pending.length === 0) return;

      const scan = pending[0];

      await db
        .update(schema.agentScans)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(schema.agentScans.id, scan.id));

      const agent = await db
        .select()
        .from(schema.agents)
        .where(eq(schema.agents.id, scan.agentId))
        .then((r) => r[0]);

      if (!agent) {
        await db
          .update(schema.agentScans)
          .set({ status: "failed", phases: [{ id: "manifest", status: "fail", output: ["Agent not found"] }], completedAt: new Date() })
          .where(eq(schema.agentScans.id, scan.id));
        return;
      }

      const manifest = {
        name: agent.name,
        version: agent.version,
        description: agent.description,
        verticals: agent.verticals,
        capabilities: agent.capabilities,
        inputSchema: agent.inputSchema,
        outputSchema: agent.outputSchema,
        toolRequirements: agent.toolRequirements,
        sla: agent.sla,
        policy: agent.policy,
        evalClaims: agent.evalClaims,
      };

      const result = runServerScan(manifest);

      const newStatus = result.summary.overallStatus === "fail" ? "suspended" : "evaluation";

      await db
        .update(schema.agentScans)
        .set({
          status: "completed",
          phases: result.phases,
          summary: result.summary,
          completedAt: new Date(),
        })
        .where(eq(schema.agentScans.id, scan.id));

      await db
        .update(schema.agents)
        .set({ status: newStatus, scanReport: result })
        .where(eq(schema.agents.id, scan.agentId));
    } catch (err) {
      console.error("Scan worker error:", err.message);
    }
  }

  const interval = setInterval(processPendingScans, POLL_INTERVAL);
  processPendingScans();

  return () => clearInterval(interval);
}
