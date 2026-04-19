#!/usr/bin/env node

import { c, fail } from "../lib/output.js";

const COMMANDS = {
  init: () => import("../lib/commands/init.js"),
  inspect: () => import("../lib/commands/inspect.js"),
  build: () => import("../lib/commands/build.js"),
  scan: () => import("../lib/commands/scan.js"),
  publish: () => import("../lib/commands/publish.js"),
  test: () => import("../lib/commands/test.js"),
  status: () => import("../lib/commands/status.js"),
  login: () => import("../lib/commands/login.js"),
  logout: () => import("../lib/commands/logout.js"),
};

function usage() {
  console.log(`
${c.bold}ap${c.reset} — AgenticProxies Builder CLI

${c.cyan}Setup${c.reset}
  init                              Scaffold agent.manifest.json
  inspect                           Analyze repo (no Docker needed)

${c.cyan}Build & Scan${c.reset}
  build                             Docker build from manifest config
  scan [imageUri]                   Full 10-phase pipeline
    --phases=pull,inspect            Run specific phases only
    --skip=sla,eval                  Skip phases
    --json                           JSON output

${c.cyan}Deploy${c.reset}
  publish                           Scan → push → register on marketplace
  test [--capability=name]          Local sandbox execution
  status [agentId]                  Query marketplace status

${c.cyan}Auth${c.reset}
  login <email> <password>          Authenticate
  logout                            Clear session

${c.dim}Env: AP_API_URL (default: http://localhost:3001)${c.reset}
`);
}

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

const [,, command, ...rawArgs] = process.argv;

if (!command || command === "help" || command === "--help" || command === "-h") {
  usage();
  process.exit(0);
}

const loader = COMMANDS[command];
if (!loader) {
  fail(`Unknown command: ${command}`);
  usage();
  process.exit(1);
}

try {
  const mod = await loader();
  const { flags, positional } = parseFlags(rawArgs);
  await mod.run(positional, flags);
} catch (err) {
  fail(err.message);
  if (err.status === 401) {
    console.error(`${c.dim}Try: ap login <email> <password>${c.reset}`);
  }
  process.exit(1);
}
