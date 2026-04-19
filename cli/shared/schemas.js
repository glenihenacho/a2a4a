import { z } from "zod";

const capabilitySchema = z.object({
  name: z.string().min(1),
  domain: z.enum(["SEO", "AIO"]),
  description: z.string().min(1),
  triggers: z.array(z.string()).min(1),
  tags: z.array(z.string()).default([]),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
});

const dockerSchema = z.object({
  image: z.string().optional(),
  build: z
    .object({
      dockerfile: z.string().default("./Dockerfile"),
      context: z.string().default("."),
    })
    .optional(),
});

const slaSchema = z.object({
  latencyP50: z.string(),
  latencyP99: z.string(),
  maxCost: z.string(),
  uptime: z.string().optional(),
  retryPolicy: z.string().optional(),
  supportWindow: z.string().optional(),
});

const policySchema = z.object({
  disallowed: z.array(z.string()).default([]),
  dataRetention: z.string().optional(),
  sandbox: z.string().optional(),
});

const evalClaimSchema = z.object({
  metric: z.string(),
  target: z.string(),
  achieved: z.string().optional(),
  pass: z.boolean().optional(),
});

const ioSchema = z.object({
  fields: z.array(z.string()),
  version: z.string().default("1.0"),
});

export const manifestSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1),
  verticals: z.array(z.enum(["SEO", "AIO"])).min(1),
  entrypoint: z.string().optional(),
  capabilities: z.array(capabilitySchema).min(1),
  inputSchema: ioSchema,
  outputSchema: ioSchema,
  toolRequirements: z.array(z.string()).default([]),
  sla: slaSchema,
  policy: policySchema.default({}),
  evalClaims: z.array(evalClaimSchema).default([]),
  docker: dockerSchema.optional(),
});

export function validateManifest(data) {
  const result = manifestSchema.safeParse(data);
  if (!result.success) {
    return { valid: false, errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  return { valid: true, data: result.data, errors: [] };
}
