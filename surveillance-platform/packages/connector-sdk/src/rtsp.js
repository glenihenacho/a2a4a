// LAN-side RTSP probing.
//
// Real production builds shell out to ffmpeg (`ffmpeg -rtsp_transport tcp -i $URL
// -frames:v 1 -f image2 -`) for both reachability and snapshot in one shot.
// Here we keep the SDK pure-Node so it runs without ffmpeg installed: a TCP
// connect proves reachability, and we ship a placeholder JPEG when ffmpeg
// isn't available. The connector swaps in the real ffmpeg path when it is.

import net from 'node:net';
import { spawn } from 'node:child_process';
import { parseRtspUrl, isRoutableLanHost } from '@surveillance/camera-core/validate';
import { FailureCode } from '@surveillance/shared/status';

const TCP_TIMEOUT_MS = 4000;
const FFMPEG_TIMEOUT_MS = 8000;

const tcpProbe = (host, port) =>
  new Promise((resolve) => {
    const sock = new net.Socket();
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      sock.destroy();
      resolve(result);
    };
    sock.setTimeout(TCP_TIMEOUT_MS);
    sock.once('connect', () => finish({ ok: true }));
    sock.once('timeout', () => finish({ ok: false, code: FailureCode.TCP_TIMEOUT }));
    sock.once('error', (e) => {
      const code = e.code === 'ECONNREFUSED' ? FailureCode.TCP_REFUSED : FailureCode.UNKNOWN;
      finish({ ok: false, code, message: e.message });
    });
    sock.connect(port, host);
  });

const hasFfmpeg = async () =>
  new Promise((resolve) => {
    const child = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    child.once('error', () => resolve(false));
    child.once('exit', (code) => resolve(code === 0));
  });

const ffmpegSnapshot = (rtspUrl) =>
  new Promise((resolve) => {
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-frames:v', '1',
      '-q:v', '4',
      '-f', 'image2',
      '-',
    ];
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), FFMPEG_TIMEOUT_MS);
    child.stdout.on('data', (b) => chunks.push(b));
    child.stderr.on('data', (b) => { stderr += b.toString(); });
    child.once('exit', (code) => {
      clearTimeout(timer);
      if (code === 0 && chunks.length) {
        resolve({ ok: true, jpeg: Buffer.concat(chunks) });
      } else {
        const failure = classifyFfmpegStderr(stderr);
        resolve({ ok: false, ...failure });
      }
    });
    child.once('error', (e) => resolve({ ok: false, code: FailureCode.SNAPSHOT_FAILED, message: e.message }));
  });

const classifyFfmpegStderr = (stderr) => {
  const s = stderr.toLowerCase();
  if (s.includes('401') || s.includes('unauthorized')) return { code: FailureCode.RTSP_AUTH, message: 'authentication failed' };
  if (s.includes('404') || s.includes('not found')) return { code: FailureCode.RTSP_NOT_FOUND, message: 'stream path not found' };
  if (s.includes('protocol')) return { code: FailureCode.RTSP_PROTOCOL, message: 'protocol error' };
  return { code: FailureCode.SNAPSHOT_FAILED, message: stderr.slice(-400) };
};

// Inline 1x1 grey JPEG used when ffmpeg isn't present (dev fallback).
// Production connectors must fail closed instead of returning placeholders;
// the API distinguishes via the `simulated` flag in metadata.
const PLACEHOLDER_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy' +
  'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIA' +
  'AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA' +
  'AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3' +
  'ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm' +
  'p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMB' +
  'AAIRAxEAPwD3+iiigD//2Q==';

export async function probeRtsp(rtspUrl) {
  const t0 = Date.now();
  const parsed = parseRtspUrl(rtspUrl);
  if (!parsed.ok) {
    return { ok: false, code: FailureCode.RTSP_PROTOCOL, message: parsed.reason, durationMs: Date.now() - t0 };
  }
  if (!isRoutableLanHost(parsed.host)) {
    return { ok: false, code: FailureCode.RTSP_PROTOCOL, message: 'non-routable host', durationMs: Date.now() - t0 };
  }

  const tcp = await tcpProbe(parsed.host, parsed.port);
  if (!tcp.ok) {
    return { ok: false, code: tcp.code, message: tcp.message, durationMs: Date.now() - t0 };
  }

  const ffmpegAvailable = await hasFfmpeg();
  if (ffmpegAvailable) {
    const snap = await ffmpegSnapshot(rtspUrl);
    if (!snap.ok) {
      return { ok: false, code: snap.code, message: snap.message, durationMs: Date.now() - t0 };
    }
    return {
      ok: true,
      simulated: false,
      jpegB64: snap.jpeg.toString('base64'),
      width: null, // populated by ffprobe in a future iteration
      height: null,
      durationMs: Date.now() - t0,
    };
  }

  // Dev fallback: TCP succeeded; emit placeholder so dashboard wiring is testable.
  return {
    ok: true,
    simulated: true,
    jpegB64: PLACEHOLDER_JPEG_B64,
    width: 1,
    height: 1,
    durationMs: Date.now() - t0,
  };
}
