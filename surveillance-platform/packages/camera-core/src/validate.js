// Pure functions — no network. URL/credential/host shape checks only.
// Real network validation lives in the connector (see packages/connector-sdk).

export const parseRtspUrl = (raw) => {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: 'malformed_url' };
  }
  if (u.protocol !== 'rtsp:' && u.protocol !== 'rtsps:') {
    return { ok: false, reason: 'wrong_scheme' };
  }
  if (!u.hostname) return { ok: false, reason: 'missing_host' };
  const port = u.port ? Number(u.port) : u.protocol === 'rtsps:' ? 322 : 554;
  return {
    ok: true,
    scheme: u.protocol.replace(':', ''),
    host: u.hostname,
    port,
    user: u.username || null,
    pass: u.password || null,
    path: u.pathname + (u.search || ''),
  };
};

// Refuse loopback / link-local / IPv4 multicast at submission time so we don't
// dispatch a doomed command. The connector also enforces this — defence in depth.
export const isRoutableLanHost = (host) => {
  if (!host) return false;
  if (host === 'localhost') return false;
  if (/^127\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;
  if (/^0\./.test(host)) return false;
  return true;
};

export const validateRtspSubmission = (raw) => {
  const parsed = parseRtspUrl(raw);
  if (!parsed.ok) return parsed;
  if (!isRoutableLanHost(parsed.host)) {
    return { ok: false, reason: 'non_routable_host' };
  }
  return parsed;
};
