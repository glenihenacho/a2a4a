#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SESSION_FILE = join(homedir(), ".ap-session");
const BASE = process.env.AP_API_URL || "http://localhost:3001";

// ─── ANSI COLORS ───

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

// ─── SESSION ───

function loadSession() {
  if (existsSync(SESSION_FILE)) {
    return readFileSync(SESSION_FILE, "utf-8").trim();
  }
  return null;
}

function saveSession(cookie) {
  writeFileSync(SESSION_FILE, cookie, "utf-8");
}

function clearSession() {
  if (existsSync(SESSION_FILE)) writeFileSync(SESSION_FILE, "", "utf-8");
}

// ─── HTTP ───

async function request(method, path, body) {
  const cookie = loadSession();
  const headers = {};
  if (cookie) headers["Cookie"] = cookie;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) saveSession(setCookie.split(";")[0]);

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok && res.status !== 302) {
    const msg = typeof data === "object" ? data.error || JSON.stringify(data) : data;
    throw new Error(`${res.status} ${msg}`);
  }

  return data;
}

const get = (path) => request("GET", path);
const post = (path, body) => request("POST", path, body);
const del = (path) => request("DELETE", path);

// ─── OUTPUT ───

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function printTable(rows, columns) {
  if (!rows || rows.length === 0) {
    console.log(`${c.dim}(no results)${c.reset}`);
    return;
  }

  const widths = {};
  for (const col of columns) {
    widths[col.key] = col.label.length;
    for (const row of rows) {
      const val = String(col.fmt ? col.fmt(row[col.key], row) : row[col.key] ?? "");
      widths[col.key] = Math.max(widths[col.key], val.length);
    }
  }

  const header = columns.map((col) => col.label.padEnd(widths[col.key])).join("  ");
  console.log(`${c.bold}${header}${c.reset}`);
  console.log(columns.map((col) => "─".repeat(widths[col.key])).join("──"));

  for (const row of rows) {
    const line = columns
      .map((col) => {
        const raw = row[col.key];
        const val = String(col.fmt ? col.fmt(raw, row) : raw ?? "");
        return val.padEnd(widths[col.key]);
      })
      .join("  ");
    console.log(line);
  }
}

function statusColor(status) {
  if (status === "live" || status === "completed" || status === "released" || status === "success") return c.green;
  if (status === "evaluation" || status === "pending" || status === "locked" || status === "canary") return c.yellow;
  if (status === "suspended" || status === "failed" || status === "error" || status === "refunded") return c.red;
  return c.dim;
}

function fmtStatus(s) {
  return `${statusColor(s)}${s}${c.reset}`;
}

// ─── FLAG PARSING ───

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq > 0) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        flags[arg.slice(2)] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

// ─── COMMANDS ───

const commands = {};

// ─── Auth ───

commands.login = async (args) => {
  const [email, password] = args;
  if (!email || !password) return usage("login <email> <password>");
  await post("/api/auth/sign-in/email", { email, password });
  console.log(`${c.green}✓${c.reset} Logged in as ${c.bold}${email}${c.reset}`);
};

commands.signup = async (args) => {
  const [email, password, role] = args;
  if (!email || !password) return usage("signup <email> <password> [role]");
  await post("/api/auth/sign-up/email", {
    email,
    password,
    name: email.split("@")[0],
    role: role || "smb",
  });
  console.log(`${c.green}✓${c.reset} Account created: ${c.bold}${email}${c.reset} (${role || "smb"})`);
};

commands.me = async () => {
  const data = await get("/api/me");
  if (!data) {
    console.log(`${c.dim}Not logged in${c.reset}`);
  } else {
    console.log(`${c.bold}${data.name || data.email}${c.reset}  role=${c.cyan}${data.role}${c.reset}  id=${c.dim}${data.id}${c.reset}`);
  }
};

commands.logout = async () => {
  clearSession();
  console.log(`${c.green}✓${c.reset} Session cleared`);
};

// ─── Agents ───

commands.agents = async (args) => {
  const [sub, ...rest] = args;

  switch (sub) {
    case "list": {
      const data = await get("/api/agents");
      const agents = Array.isArray(data) ? data : [];
      printTable(agents, [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "status", label: "Status", fmt: fmtStatus },
        { key: "verticals", label: "Verticals", fmt: (v) => (Array.isArray(v) ? v.join(",") : v) },
        { key: "reputation", label: "Rep" },
        { key: "successRate", label: "Success%" },
        { key: "totalRuns", label: "Runs" },
      ]);
      break;
    }
    case "get": {
      if (!rest[0]) return usage("agents get <id>");
      const data = await get(`/api/agents/${rest[0]}`);
      printJson(data);
      break;
    }
    case "create": {
      if (!rest[0]) return usage("agents create <json-file>");
      const body = JSON.parse(readFileSync(rest[0], "utf-8"));
      const data = await post("/api/agents", body);
      console.log(`${c.green}✓${c.reset} Agent created: ${c.bold}${data.id}${c.reset}`);
      break;
    }
    default:
      usage("agents <list|get|create>");
  }
};

// ─── Agent Ops ───

commands.ops = async (args) => {
  const [sub, agentId, ...rest] = args;
  const { flags, positional } = parseFlags(rest);

  if (!sub) return usage("ops <add|remove|update|review|suggest|optimize|test|shadow|compile|history> <agentId>");

  switch (sub) {
    case "add":
      if (!agentId) return usage("ops add <agentId>");
      printJson(await post(`/api/agent-ops/${agentId}/add`, {}));
      break;

    case "remove":
      if (!agentId) return usage("ops remove <agentId>");
      printJson(await post(`/api/agent-ops/${agentId}/remove`, {}));
      break;

    case "update": {
      if (!agentId) return usage("ops update <agentId> <json>");
      const updates = positional[0] ? JSON.parse(positional[0]) : {};
      printJson(await post(`/api/agent-ops/${agentId}/update`, { updates }));
      break;
    }

    case "review":
      if (!agentId) return usage("ops review <agentId>");
      printJson(await get(`/api/agent-ops/${agentId}/review`));
      break;

    case "suggest":
      if (!agentId) return usage("ops suggest <agentId>");
      printJson(await post(`/api/agent-ops/${agentId}/suggest`, {}));
      break;

    case "optimize":
      if (!agentId) return usage("ops optimize <agentId>");
      printJson(await post(`/api/agent-ops/${agentId}/optimize`, {}));
      break;

    case "test": {
      if (!agentId) return usage("ops test <agentId> [--capability=<id>] [--payload=<json>]");
      const body = {};
      if (flags.capability) body.capabilityId = flags.capability;
      if (flags.payload) body.testPayload = JSON.parse(flags.payload);
      printJson(await post(`/api/agent-ops/${agentId}/test`, body));
      break;
    }

    case "shadow": {
      const action = positional[0];
      if (!agentId || !action) return usage("ops shadow <agentId> <start|add|remove|list|run> [--competitor=<id>]");
      const body = { action };
      if (flags.competitor) body.competitorAgentId = flags.competitor;
      printJson(await post(`/api/agent-ops/${agentId}/shadow`, body));
      break;
    }

    case "compile": {
      if (!agentId) return usage("ops compile <agentId> --capability=<id> --version=<id>");
      if (!flags.capability || !flags.version) return usage("ops compile <agentId> --capability=<id> --version=<id>");
      printJson(await post(`/api/agent-ops/${agentId}/compile`, {
        capabilityId: flags.capability,
        versionId: flags.version,
      }));
      break;
    }

    case "history": {
      if (!agentId) return usage("ops history <agentId>");
      const ops = await get(`/api/agent-ops/${agentId}/operations`);
      printTable(Array.isArray(ops) ? ops : [], [
        { key: "id", label: "ID" },
        { key: "operation", label: "Op" },
        { key: "status", label: "Status", fmt: fmtStatus },
        { key: "durationMs", label: "Duration", fmt: (v) => v ? `${v}ms` : "" },
        { key: "costCents", label: "Cost", fmt: (v) => v ? `${v}¢` : "" },
        { key: "createdAt", label: "Created", fmt: (v) => v ? new Date(v).toLocaleString() : "" },
      ]);
      break;
    }

    default:
      usage("ops <add|remove|update|review|suggest|optimize|test|shadow|compile|history>");
  }
};

// ─── Subscriptions ───

commands.sub = async (args) => {
  const [sub, ...rest] = args;

  switch (sub) {
    case "status":
      printJson(await get("/api/agent-ops/subscription"));
      break;

    case "upgrade": {
      const tier = rest[0];
      if (!tier || !["pro", "scale"].includes(tier)) return usage("sub upgrade <pro|scale>");
      const data = await post("/api/agent-ops/subscription", { tier });
      console.log(`${c.green}✓${c.reset} Subscription: ${c.bold}${tier}${c.reset}`);
      printJson(data);
      break;
    }

    case "cancel": {
      await del("/api/agent-ops/subscription");
      console.log(`${c.green}✓${c.reset} Subscription canceled`);
      break;
    }

    case "gates":
      printJson(await get("/api/agent-ops/tier-gates"));
      break;

    default:
      usage("sub <status|upgrade|cancel|gates>");
  }
};

// ─── Capabilities ───

commands.caps = async (args) => {
  const [sub, ...rest] = args;
  const { flags } = parseFlags(rest);

  switch (sub) {
    case "list": {
      let path = "/api/capabilities";
      const params = [];
      if (flags.agent) params.push(`agentId=${flags.agent}`);
      if (flags.status) params.push(`status=${flags.status}`);
      if (params.length) path += `?${params.join("&")}`;
      const data = await get(path);
      const caps = Array.isArray(data) ? data : [];
      printTable(caps, [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "status", label: "Status", fmt: fmtStatus },
        { key: "providerType", label: "Type" },
        { key: "agentId", label: "Agent" },
        { key: "intentDomains", label: "Domains", fmt: (v) => (Array.isArray(v) ? v.slice(0, 3).join(",") : "") },
      ]);
      break;
    }
    case "get": {
      if (!rest[0]) return usage("caps get <id>");
      printJson(await get(`/api/capabilities/${rest[0]}`));
      break;
    }
    case "ingest": {
      if (!rest[0]) return usage("caps ingest <json-file>");
      const body = JSON.parse(readFileSync(rest[0], "utf-8"));
      const data = await post("/api/skills/ingest", body);
      console.log(`${c.green}✓${c.reset} Capability ingested: ${c.bold}${data.capabilityId}${c.reset}`);
      break;
    }
    default:
      usage("caps <list|get|ingest>");
  }
};

// ─── Execution ───

commands.exec = async (args) => {
  const [sub, ...rest] = args;

  switch (sub) {
    case "create": {
      if (!rest[0]) return usage("exec create <json>");
      const body = JSON.parse(rest[0]);
      printJson(await post("/api/execution-intents", body));
      break;
    }
    case "list": {
      const data = await get("/api/execution-intents");
      const intents = Array.isArray(data) ? data : [];
      printTable(intents, [
        { key: "id", label: "ID" },
        { key: "goal", label: "Goal", fmt: (v) => (v || "").slice(0, 40) },
        { key: "domain", label: "Domain" },
        { key: "status", label: "Status", fmt: fmtStatus },
      ]);
      break;
    }
    case "run": {
      if (!rest[0]) return usage("exec run <intentId>");
      printJson(await post(`/api/execution-intents/${rest[0]}/execute`, {}));
      break;
    }
    case "outcomes": {
      if (!rest[0]) return usage("exec outcomes <capabilityId>");
      printJson(await get(`/api/outcomes/summary/${rest[0]}`));
      break;
    }
    default:
      usage("exec <create|list|run|outcomes>");
  }
};

// ─── Escrow ───

commands.escrow = async (args) => {
  const [sub, ...rest] = args;

  switch (sub) {
    case "list": {
      const data = await get("/api/escrow");
      const records = Array.isArray(data) ? data : [];
      printTable(records, [
        { key: "id", label: "ID" },
        { key: "jobId", label: "Job" },
        { key: "state", label: "State", fmt: fmtStatus },
        { key: "amountCents", label: "Amount", fmt: (v) => v ? `$${(v / 100).toFixed(2)}` : "" },
      ]);
      break;
    }
    case "get":
      if (!rest[0]) return usage("escrow get <id>");
      printJson(await get(`/api/escrow/${rest[0]}`));
      break;
    case "lock":
      if (!rest[0]) return usage("escrow lock <id>");
      printJson(await post(`/api/escrow/${rest[0]}/lock`, {}));
      break;
    case "release":
      if (!rest[0]) return usage("escrow release <id>");
      printJson(await post(`/api/escrow/${rest[0]}/release`, {}));
      break;
    case "refund": {
      if (!rest[0] || !rest[1]) return usage("escrow refund <id> <json>");
      printJson(await post(`/api/escrow/${rest[0]}/refund`, JSON.parse(rest[1])));
      break;
    }
    case "preview": {
      if (!rest[0]) return usage("escrow preview <json>");
      printJson(await post("/api/escrow/preview-refund", JSON.parse(rest[0])));
      break;
    }
    default:
      usage("escrow <list|get|lock|release|refund|preview>");
  }
};

// ─── System ───

commands.health = async () => {
  printJson(await get("/api/health"));
};

commands.metrics = async () => {
  printJson(await get("/api/metrics"));
};

// ─── USAGE / DISPATCH ───

function usage(specific) {
  if (specific) {
    console.log(`${c.yellow}Usage:${c.reset} node bin/admin.js ${specific}`);
    return;
  }

  console.log(`
${c.bold}AgenticProxies Admin CLI${c.reset}

${c.cyan}Auth${c.reset}
  login <email> <password>        Log in and save session
  signup <email> <password> [role] Create account (smb|builder)
  me                              Show current user
  logout                          Clear session

${c.cyan}Agents${c.reset}
  agents list                     List all agents
  agents get <id>                 Get agent details
  agents create <json-file>       Create agent from JSON file

${c.cyan}Agent Operations${c.reset}
  ops add <agentId>               Add agent to roster
  ops remove <agentId>            Remove agent
  ops update <agentId> <json>     Update agent config
  ops review <agentId>            Review cost efficiency
  ops suggest <agentId>           Suggest improvements (pro)
  ops optimize <agentId>          Auto-optimize (pro)
  ops test <agentId> [flags]      Sandbox test (scale)
  ops shadow <agentId> <action>   Shadow competitors (scale)
  ops compile <agentId> [flags]   Promote to production (scale)
  ops history <agentId>           Operation history

${c.cyan}Subscriptions${c.reset}
  sub status                      Current tier
  sub upgrade <pro|scale>         Upgrade subscription
  sub cancel                      Cancel subscription
  sub gates                       Tier gate map

${c.cyan}Capabilities${c.reset}
  caps list [--agent=id]          List capabilities
  caps get <id>                   Get capability + versions
  caps ingest <json-file>         Ingest skill from JSON

${c.cyan}Execution${c.reset}
  exec create <json>              Create execution intent
  exec list                       List intents
  exec run <intentId>             Execute routed capability
  exec outcomes <capId>           Outcome summary

${c.cyan}Escrow${c.reset}
  escrow list                     List escrow records
  escrow get <id>                 Get escrow details
  escrow lock <id>                Lock escrow
  escrow release <id>             Release funds
  escrow refund <id> <json>       Tiered refund
  escrow preview <json>           Preview refund calc

${c.cyan}System${c.reset}
  health                          Health check
  metrics                         Platform metrics

${c.dim}Env: AP_API_URL=${BASE}${c.reset}
`);
}

// ─── MAIN ───

const [,, group, ...args] = process.argv;

if (!group || group === "help" || group === "--help") {
  usage();
  process.exit(0);
}

const handler = commands[group];
if (!handler) {
  console.error(`${c.red}Unknown command:${c.reset} ${group}`);
  usage();
  process.exit(1);
}

try {
  await handler(args);
} catch (err) {
  console.error(`${c.red}Error:${c.reset} ${err.message}`);
  if (err.message.includes("401")) {
    console.error(`${c.dim}Try: node bin/cli.js login <email> <password>${c.reset}`);
  }
  process.exit(1);
}
