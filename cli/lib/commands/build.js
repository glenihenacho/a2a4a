import { resolve } from "node:path";
import { loadManifest } from "../manifest.js";
import * as docker from "../docker.js";
import { ok, fail, info, c, spinner } from "../output.js";

export async function run(positional, flags) {
  const dir = resolve(positional[0] || process.cwd());
  const manifest = loadManifest(dir);

  if (!manifest.found || manifest.errors.length > 0) {
    fail("Valid agent.manifest.json required — run `ap init` first");
    if (manifest.errors.length > 0) {
      for (const err of manifest.errors) info(`  ${err}`);
    }
    return;
  }

  if (!docker.isDockerAvailable()) {
    fail("Docker is not available — install Docker or start the daemon");
    return;
  }

  const dockerCfg = manifest.data.docker;
  if (!dockerCfg?.build) {
    fail("No docker.build config in manifest — add dockerfile and context");
    return;
  }

  const dockerfile = resolve(dir, dockerCfg.build.dockerfile || "./Dockerfile");
  const context = resolve(dir, dockerCfg.build.context || ".");
  const tag = dockerCfg.image || manifest.data.name.toLowerCase().replace(/\s+/g, "-");

  const sp = spinner(`Building ${tag}`);

  try {
    docker.build(dockerfile, context, tag);
    sp.stop();
    ok(`Built image: ${c.bold}${tag}${c.reset}`);

    const digest = docker.getDigest(tag);
    const size = docker.getSize(tag);
    if (digest) info(`Digest: ${digest}`);
    if (size) info(`Size: ${(size / 1024 / 1024).toFixed(1)} MB`);
  } catch (err) {
    sp.stop();
    fail(`Build failed: ${err.message}`);
  }
}
