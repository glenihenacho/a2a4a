import crypto from 'node:crypto';

export const newId = () => crypto.randomUUID();

// Avoid I/O/O0 confusion in human-typed pairing codes.
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newPairingCode = () => {
  const buf = crypto.randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHA[buf[i] % ALPHA.length];
  return out;
};

export const newConnectorToken = () =>
  crypto.randomBytes(32).toString('base64url');

export const sha256 = (s) =>
  crypto.createHash('sha256').update(s).digest('hex');

export const isoNow = () => new Date().toISOString();

export const isoIn = (seconds) =>
  new Date(Date.now() + seconds * 1000).toISOString();
