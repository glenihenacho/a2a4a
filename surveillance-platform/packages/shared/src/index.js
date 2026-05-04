export * from './status.js';
export * from './schemas.js';

export const maskRtspUrl = (raw) => {
  try {
    const u = new URL(raw);
    if (u.username) u.username = '***';
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return raw;
  }
};
