import { writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { scaffoldManifest } from "../manifest.js";
import { ok, fail, info, c } from "../output.js";

function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

export async function run(positional, flags) {
  const dir = resolve(positional[0] || process.cwd());
  const dest = join(dir, "agent.manifest.json");

  if (existsSync(dest) && !flags.force) {
    fail(`agent.manifest.json already exists in ${dir}`);
    info("Use --force to overwrite");
    return;
  }

  if (flags.json || flags.y || flags.yes) {
    const manifest = scaffoldManifest({
      name: flags.name || "my-agent",
      verticals: flags.verticals ? flags.verticals.split(",") : ["SEO"],
      description: flags.description || "An AI agent for SEO/AIO optimization",
      entrypoint: flags.entrypoint || "agent/main.py",
      image: flags.image || "",
    });
    writeFileSync(dest, JSON.stringify(manifest, null, 2) + "\n");
    ok(`Created ${dest}`);
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log(`\n${c.bold}Scaffold agent.manifest.json${c.reset}\n`);

    const name = (await prompt(rl, `${c.cyan}Agent name${c.reset} (my-agent): `)).trim() || "my-agent";
    const desc = (await prompt(rl, `${c.cyan}Description${c.reset}: `)).trim() || "An AI agent for SEO/AIO optimization";
    const vertInput = (await prompt(rl, `${c.cyan}Verticals${c.reset} (SEO,AIO): `)).trim() || "SEO";
    const verticals = vertInput.split(",").map((v) => v.trim().toUpperCase()).filter((v) => v === "SEO" || v === "AIO");
    if (verticals.length === 0) verticals.push("SEO");
    const entrypoint = (await prompt(rl, `${c.cyan}Entrypoint${c.reset} (agent/main.py): `)).trim() || "agent/main.py";
    const image = (await prompt(rl, `${c.cyan}Docker image${c.reset} (optional): `)).trim();

    const manifest = scaffoldManifest({ name, description: desc, verticals, entrypoint, image });
    writeFileSync(dest, JSON.stringify(manifest, null, 2) + "\n");
    ok(`Created ${dest}`);
    info("Edit the manifest to declare your capabilities, SLA, and policy.");
  } finally {
    rl.close();
  }
}
