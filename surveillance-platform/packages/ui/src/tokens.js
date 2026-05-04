export const ft = {
  display: "'Rajdhani', sans-serif",
  sans: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export const color = {
  bg: '#060A12',
  panel: 'rgba(255,255,255,.03)',
  border: 'rgba(66,165,245,.12)',
  borderSoft: 'rgba(255,255,255,.06)',
  text: '#E3F2FD',
  textDim: 'rgba(255,255,255,.55)',
  textFaint: 'rgba(255,255,255,.3)',
  blue: '#42A5F5',
  blueDeep: '#1565C0',
  green: '#66BB6A',
  orange: '#FFA726',
  red: '#EF5350',
  purple: '#AB47BC',
};

export const statusColor = {
  pending: color.orange,
  online: color.green,
  offline: color.textFaint,
  revoked: color.red,
  draft: color.textDim,
  validating: color.orange,
  validated: color.green,
  unreachable: color.red,
  queued: color.orange,
  claimed: color.blue,
  succeeded: color.green,
  failed: color.red,
  expired: color.textFaint,
};
