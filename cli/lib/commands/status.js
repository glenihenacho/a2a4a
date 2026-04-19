import { get } from "../remote.js";
import { ok, fail, info, heading, json as jsonOut, c, table, fmtStatus } from "../output.js";
import { isAuthenticated } from "../session.js";

export async function run(positional, flags) {
  if (!isAuthenticated()) {
    fail("Not authenticated — run: ap login <email> <password>");
    return;
  }

  const agentId = positional[0];

  if (agentId) {
    const data = await get(`/api/cli/status/${agentId}`);
    if (flags.json) {
      jsonOut(data);
      return;
    }

    heading(`${data.name} (${data.id})`);
    console.log(`  Status:     ${fmtStatus(data.status)}`);
    console.log(`  Verticals:  ${c.cyan}${(data.verticals || []).join(", ")}${c.reset}`);
    console.log(`  Reputation: ${c.bold}${data.reputation}${c.reset}`);
    console.log(`  Runs:       ${data.totalRuns}  Success: ${data.successRate}%`);
    console.log(`  Avg Cost:   ${data.avgCost}  Avg Runtime: ${data.avgRuntime}`);
    if (data.imageUri) console.log(`  Image:      ${c.dim}${data.imageUri}${c.reset}`);
    if (data.imageDigest) console.log(`  Digest:     ${c.dim}${data.imageDigest}${c.reset}`);
    return;
  }

  const agents = await get("/api/agents");
  const list = Array.isArray(agents) ? agents : [];

  if (list.length === 0) {
    info("No agents found. Publish one with: ap publish");
    return;
  }

  if (flags.json) {
    jsonOut(list);
    return;
  }

  table(list, [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "status", label: "Status", fmt: fmtStatus },
    { key: "verticals", label: "Verticals", fmt: (v) => (Array.isArray(v) ? v.join(",") : v) },
    { key: "reputation", label: "Rep" },
    { key: "totalRuns", label: "Runs" },
  ]);
}
