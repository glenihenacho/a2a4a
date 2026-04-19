import { WRAPPER_SPEC } from "../../../shared/constants.js";

export async function phase(ctx) {
  const output = [];

  const toolAllowlist = ctx.manifest?.toolRequirements || ctx.tools?.detected || [];
  const budgetCap = ctx.manifest?.sla?.maxCost || "$100/run";

  const wrapperConfig = {
    version: "1.0",
    agentName: ctx.manifest?.name || "unknown",
    agentVersion: ctx.manifest?.version || "0.0.0",
    verticals: ctx.manifest?.verticals || [],

    formatTranslation: {
      inputMapping: WRAPPER_SPEC.input.map((f) => ({
        field: f.field,
        type: f.type,
        mapped: true,
      })),
      outputMapping: WRAPPER_SPEC.output.map((f) => ({
        field: f.field,
        type: f.type,
        mapped: true,
      })),
    },

    budgetEnforcement: {
      hardCap: budgetCap,
      perToolLimits: toolAllowlist.reduce((acc, t) => {
        acc[t] = "auto";
        return acc;
      }, {}),
      alertThreshold: 0.8,
    },

    toolAllowlist: {
      allowed: toolAllowlist,
      proxyEnabled: true,
      auditLogging: true,
    },

    telemetry: {
      enabled: true,
      events: ["start", "checkpoint", "tool_call", "artifact", "complete", "error"],
      format: "structured_json",
    },

    checkpointing: {
      enabled: true,
      strategy: "milestone",
      maxCheckpoints: 10,
    },

    artifactSchema: {
      version: "1.0",
      requiredFields: ["type", "content", "mime_type"],
      maxSizeBytes: 50 * 1024 * 1024,
    },
  };

  ctx.wrapperConfig = wrapperConfig;

  output.push(`Agent: ${wrapperConfig.agentName} v${wrapperConfig.agentVersion}`);
  output.push(`Format translation: ${WRAPPER_SPEC.input.length} input / ${WRAPPER_SPEC.output.length} output fields`);
  output.push(`Budget enforcement: ${budgetCap} hard cap`);
  output.push(`Tool allowlist: ${toolAllowlist.length} tools`);
  output.push(`Telemetry: ${wrapperConfig.telemetry.events.length} event types`);
  output.push(`Checkpointing: ${wrapperConfig.checkpointing.strategy} strategy`);

  for (const resp of WRAPPER_SPEC.responsibilities) {
    output.push(`${resp.icon} ${resp.label}`);
  }

  return { status: "pass", output, data: wrapperConfig };
}
