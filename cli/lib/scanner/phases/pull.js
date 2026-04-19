import * as docker from "../../docker.js";

export async function phase(ctx) {
  const output = [];

  if (!docker.isDockerAvailable()) {
    return { status: "fail", output: ["! Docker is not available — install Docker or start the daemon"], data: null };
  }

  const uri = ctx.imageUri;
  const isLocal = !uri.includes("/") || uri.startsWith("./") || uri.startsWith("file:");

  if (isLocal && ctx.manifest?.docker?.build) {
    const { dockerfile, context: buildCtx } = ctx.manifest.docker.build;
    output.push(`Building from ${dockerfile} in ${buildCtx}`);
    try {
      docker.build(dockerfile, buildCtx, uri);
      output.push(`Built image: ${uri}`);
    } catch (err) {
      return { status: "fail", output: [...output, `! Build failed: ${err.message}`], data: null };
    }
  } else {
    output.push(`Pulling ${uri}`);
    try {
      docker.pull(uri);
      output.push(`Pulled successfully`);
    } catch (err) {
      return { status: "fail", output: [...output, `! Pull failed: ${err.message}`], data: null };
    }
  }

  const digest = docker.getDigest(uri);
  const size = docker.getSize(uri);

  if (digest) output.push(`Digest: ${digest}`);
  if (size) output.push(`Size: ${(size / 1024 / 1024).toFixed(1)} MB`);

  ctx.imageDigest = digest;
  ctx.imageSizeBytes = size;

  return { status: "pass", output, data: { digest, size } };
}
