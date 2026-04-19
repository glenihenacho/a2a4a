import { execSync, spawn } from "node:child_process";

function exec(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: opts.timeout || 120_000, ...opts });
  } catch (err) {
    const msg = err.stderr?.trim() || err.stdout?.trim() || err.message;
    throw new Error(msg);
  }
}

export function isDockerAvailable() {
  try {
    exec("docker info", { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

export function pull(imageUri) {
  const output = exec(`docker pull ${imageUri}`, { timeout: 300_000 });
  return output.trim();
}

export function build(dockerfile, context, tag) {
  const output = exec(`docker build -f ${dockerfile} -t ${tag} ${context}`, { timeout: 600_000 });
  return output.trim();
}

export function inspect(imageUri) {
  const raw = exec(`docker inspect ${imageUri}`);
  const data = JSON.parse(raw);
  if (!data || !data[0]) throw new Error(`No inspection data for ${imageUri}`);
  const img = data[0];

  return {
    id: img.Id,
    created: img.Created,
    size: img.Size,
    architecture: img.Architecture,
    os: img.Os,
    entrypoint: img.Config?.Entrypoint,
    cmd: img.Config?.Cmd,
    workdir: img.Config?.WorkingDir,
    env: img.Config?.Env,
    exposedPorts: img.Config?.ExposedPorts ? Object.keys(img.Config.ExposedPorts) : [],
    labels: img.Config?.Labels || {},
    layers: img.RootFS?.Layers?.length || 0,
    digest: img.RepoDigests?.[0] || null,
  };
}

export function getDigest(imageUri) {
  try {
    const raw = exec(`docker inspect --format='{{index .RepoDigests 0}}' ${imageUri}`);
    return raw.trim().replace(/'/g, "");
  } catch {
    return null;
  }
}

export function getSize(imageUri) {
  try {
    const raw = exec(`docker inspect --format='{{.Size}}' ${imageUri}`);
    return parseInt(raw.trim().replace(/'/g, ""), 10);
  } catch {
    return null;
  }
}

export function copyFromImage(imageUri, srcPath, destPath) {
  const containerName = `ap-extract-${Date.now()}`;
  try {
    exec(`docker create --name ${containerName} ${imageUri}`);
    exec(`docker cp ${containerName}:${srcPath} ${destPath}`);
  } finally {
    try {
      exec(`docker rm ${containerName}`);
    } catch { /* ignore cleanup errors */ }
  }
}

export function run(imageUri, cmd, opts = {}) {
  const networkFlag = opts.network === "none" ? "--network=none" : "";
  const memFlag = opts.memory ? `--memory=${opts.memory}` : "";
  const cpuFlag = opts.cpus ? `--cpus=${opts.cpus}` : "";
  const envFlags = (opts.env || []).map((e) => `-e ${e}`).join(" ");
  const timeout = opts.timeout || 120_000;

  const fullCmd = `docker run --rm ${networkFlag} ${memFlag} ${cpuFlag} ${envFlags} ${imageUri} ${cmd || ""}`.replace(/\s+/g, " ").trim();

  const start = Date.now();
  const output = exec(fullCmd, { timeout });
  const duration = Date.now() - start;

  return { output: output.trim(), durationMs: duration };
}

export function tag(imageUri, newTag) {
  exec(`docker tag ${imageUri} ${newTag}`);
}

export function push(imageUri) {
  const output = exec(`docker push ${imageUri}`, { timeout: 300_000 });
  return output.trim();
}

export function streamRun(imageUri, cmd, opts = {}) {
  const args = ["run", "--rm"];
  if (opts.network === "none") args.push("--network=none");
  if (opts.memory) args.push(`--memory=${opts.memory}`);
  if (opts.cpus) args.push(`--cpus=${opts.cpus}`);
  if (opts.env) opts.env.forEach((e) => args.push("-e", e));
  args.push(imageUri);
  if (cmd) args.push(...cmd.split(" "));

  return spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
}
