// Status contracts shared by API, dashboard, and connector.
// Single source of truth — any new state must be added here first.

export const ConnectorStatus = Object.freeze({
  PENDING: 'pending',     // pairing code issued, not yet claimed
  ONLINE: 'online',       // claimed and seen within heartbeat window
  OFFLINE: 'offline',     // claimed but past heartbeat window
  REVOKED: 'revoked',     // operator-revoked
});

export const CameraStatus = Object.freeze({
  DRAFT: 'draft',                     // submitted, no validation attempt yet
  VALIDATING: 'validating',           // command in flight
  VALIDATED: 'validated',             // RTSP reachable + snapshot captured
  UNREACHABLE: 'unreachable',         // network/auth/codec failure
  REVOKED: 'revoked',                 // operator-disabled
});

export const CommandKind = Object.freeze({
  VALIDATE_RTSP: 'validate_rtsp',
  CAPTURE_SNAPSHOT: 'capture_snapshot',
  PROBE_ONVIF: 'probe_onvif', // reserved
});

export const CommandStatus = Object.freeze({
  QUEUED: 'queued',
  CLAIMED: 'claimed',     // connector picked it up
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  EXPIRED: 'expired',
});

export const FailureCode = Object.freeze({
  TCP_REFUSED: 'tcp_refused',
  TCP_TIMEOUT: 'tcp_timeout',
  RTSP_AUTH: 'rtsp_auth',
  RTSP_NOT_FOUND: 'rtsp_not_found',
  RTSP_PROTOCOL: 'rtsp_protocol',
  SNAPSHOT_FAILED: 'snapshot_failed',
  UNKNOWN: 'unknown',
});
