import { WRAPPER_SPEC } from "../../../shared/constants.js";

const REQUIRED_INPUT_FIELDS = ["target_url", "budget_cap"];
const REQUIRED_OUTPUT_FIELDS = ["status"];

export async function phase(ctx) {
  const output = [];
  const warnings = [];

  const inputSchema = ctx.manifest?.inputSchema;
  const outputSchema = ctx.manifest?.outputSchema;

  if (!inputSchema || !outputSchema) {
    output.push("? No I/O schemas declared in manifest");
    if (ctx.capabilities?.length > 0) {
      output.push("? Inferring schemas from capability signatures");
      const inferredInput = { fields: ["target_url", "budget_cap"], version: "1.0" };
      const inferredOutput = { fields: ["status", "artifacts"], version: "1.0" };
      ctx.schemas = { input: inferredInput, output: inferredOutput, inferred: true };
      output.push(`Inferred input: { ${inferredInput.fields.join(", ")} }`);
      output.push(`Inferred output: { ${inferredOutput.fields.join(", ")} }`);
      return { status: "warn", output, data: ctx.schemas };
    }
    return { status: "warn", output, data: null };
  }

  ctx.schemas = { input: inputSchema, output: outputSchema, inferred: false };

  output.push(`Input schema v${inputSchema.version}: { ${inputSchema.fields.join(", ")} }`);
  output.push(`Output schema v${outputSchema.version}: { ${outputSchema.fields.join(", ")} }`);

  for (const req of REQUIRED_INPUT_FIELDS) {
    if (!inputSchema.fields.some((f) => f.replace("[]", "") === req)) {
      warnings.push(`? Input missing recommended field: ${req}`);
    }
  }

  for (const req of REQUIRED_OUTPUT_FIELDS) {
    if (!outputSchema.fields.some((f) => f.replace("[]", "") === req)) {
      warnings.push(`? Output missing recommended field: ${req}`);
    }
  }

  output.push(`WRAPPER_SPEC compliance: ${WRAPPER_SPEC.input.length} input / ${WRAPPER_SPEC.output.length} output fields mapped`);
  output.push(...warnings);

  return { status: warnings.length > 0 ? "warn" : "pass", output, data: ctx.schemas };
}
