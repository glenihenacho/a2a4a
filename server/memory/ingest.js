// ─── SKILL INGESTION ───
// Skills are the sole source of capabilities and intent patterns.
// This module parses skill definitions and derives both capability
// records and intent domains from them.

import { upsertCapability } from "./registry.js";

/**
 * Derive intent domains from a skill's triggers and description.
 */
function deriveIntentDomains(skillDef) {
  const domains = new Set();

  if (skillDef.triggers && Array.isArray(skillDef.triggers)) {
    for (const trigger of skillDef.triggers) {
      if (typeof trigger === "string") {
        domains.add(trigger.toLowerCase().trim());
      } else if (trigger.domain) {
        domains.add(trigger.domain.toLowerCase().trim());
      }
    }
  }

  if (skillDef.intentDomains && Array.isArray(skillDef.intentDomains)) {
    for (const d of skillDef.intentDomains) {
      domains.add(d.toLowerCase().trim());
    }
  }

  if (skillDef.tags && Array.isArray(skillDef.tags)) {
    for (const tag of skillDef.tags) {
      domains.add(tag.toLowerCase().trim());
    }
  }

  if (domains.size === 0 && skillDef.description) {
    const words = skillDef.description
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    for (const w of words.slice(0, 5)) {
      domains.add(w);
    }
  }

  return [...domains];
}

/**
 * Derive preconditions from a skill definition.
 */
function derivePreconditions(skillDef) {
  const preconditions = {
    requires: [],
    env: {},
    scope: [],
  };

  if (skillDef.requires && Array.isArray(skillDef.requires)) {
    preconditions.requires = skillDef.requires;
  }

  if (skillDef.fileLayout && Array.isArray(skillDef.fileLayout)) {
    preconditions.requires = [
      ...preconditions.requires,
      ...skillDef.fileLayout.map((f) => `file:${f}`),
    ];
  }

  if (skillDef.env && typeof skillDef.env === "object") {
    preconditions.env = skillDef.env;
  }

  if (skillDef.scope && Array.isArray(skillDef.scope)) {
    preconditions.scope = skillDef.scope;
  }

  if (skillDef.handler) {
    preconditions.handlerRef = skillDef.handler;
  }

  return preconditions;
}

/**
 * Ingest a single skill definition into the capability registry.
 * Derives capability fields and intent domains from the skill.
 *
 * Returns { capabilityId, derivedDomains, isNew, capability }
 */
export async function ingestSkill(db, schema, skillDef) {
  if (!skillDef.name) {
    throw new Error("Skill definition must have a name");
  }

  const sourceKey = `skill:${skillDef.name}`;
  const intentDomains = deriveIntentDomains(skillDef);
  const preconditions = derivePreconditions(skillDef);

  const capData = {
    name: skillDef.name,
    sourceKey,
    providerType: "skill",
    status: skillDef.status || "draft",
    intentDomains,
    inputSchema: skillDef.inputSchema || null,
    outputSchema: skillDef.outputSchema || null,
    preconditions,
    resourceRequirements: skillDef.resourceRequirements || null,
    securityScope: skillDef.securityScope || null,
    costModel: skillDef.costModel || null,
    latencyProfile: skillDef.latencyProfile || null,
    qualityProfile: skillDef.qualityProfile || null,
    failureModes: skillDef.failureModes || null,
    dependencies: skillDef.dependencies || null,
    embedding: skillDef.embedding || null,
  };

  const capability = await upsertCapability(db, schema, capData);
  const isNew = !capability.isUpdate;

  return {
    capabilityId: capability.id,
    derivedDomains: intentDomains,
    isNew,
    capability,
  };
}

/**
 * Ingest a batch of skill definitions.
 * Returns summary of all ingestions.
 */
export async function ingestSkillBatch(db, schema, skillDefs) {
  const results = [];
  const errors = [];

  for (const skillDef of skillDefs) {
    try {
      const result = await ingestSkill(db, schema, skillDef);
      results.push(result);
    } catch (err) {
      errors.push({ name: skillDef.name, error: err.message });
    }
  }

  return {
    total: skillDefs.length,
    ingested: results.length,
    failed: errors.length,
    results,
    errors,
  };
}
