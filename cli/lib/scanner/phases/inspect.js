import * as docker from "../../docker.js";
import { mkdtempSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function phase(ctx) {
  const output = [];

  let inspectData;
  try {
    inspectData = docker.inspect(ctx.imageUri);
  } catch (err) {
    return { status: "fail", output: [`! Docker inspect failed: ${err.message}`], data: null };
  }

  ctx.inspectData = inspectData;

  output.push(`ID: ${inspectData.id.slice(0, 16)}`);
  output.push(`OS/Arch: ${inspectData.os}/${inspectData.architecture}`);
  output.push(`Entrypoint: ${JSON.stringify(inspectData.entrypoint)}`);
  output.push(`Cmd: ${JSON.stringify(inspectData.cmd)}`);
  output.push(`Workdir: ${inspectData.workdir || "/"}`);
  output.push(`Layers: ${inspectData.layers}`);
  output.push(`Ports: ${inspectData.exposedPorts.length > 0 ? inspectData.exposedPorts.join(", ") : "none"}`);

  if (inspectData.env) {
    const safeEnv = inspectData.env.filter((e) => !e.startsWith("PATH="));
    if (safeEnv.length > 0) {
      output.push(`Env: ${safeEnv.length} vars`);
    }
  }

  const extractDir = mkdtempSync(join(tmpdir(), "ap-extract-"));
  try {
    docker.copyFromImage(ctx.imageUri, "/", extractDir);
    ctx.extractedFs = extractDir;
    output.push(`Filesystem extracted to ${extractDir}`);
  } catch {
    output.push("? Could not extract filesystem — some phases may be limited");
    ctx.extractedFs = null;
  }

  return { status: "pass", output, data: inspectData };
}
