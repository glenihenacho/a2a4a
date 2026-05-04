import { z } from 'zod';
import {
  ConnectorStatus,
  CameraStatus,
  CommandKind,
  CommandStatus,
  FailureCode,
} from './status.js';

const enumOf = (obj) => z.enum(Object.values(obj));

// --- Pairing -----------------------------------------------------------------

export const PairingCodeCreateRes = z.object({
  code: z.string().regex(/^[A-Z0-9]{6}$/),
  pairing_id: z.string().uuid(),
  expires_at: z.string().datetime(),
});

export const PairingClaimReq = z.object({
  code: z.string().regex(/^[A-Z0-9]{6}$/),
  hostname: z.string().min(1).max(255),
  platform: z.string().min(1).max(64),
  version: z.string().min(1).max(32),
});

export const PairingClaimRes = z.object({
  connector_id: z.string().uuid(),
  connector_token: z.string().min(32),
  api_url: z.string().url(),
  poll_interval_ms: z.number().int().positive(),
});

// --- Connector ---------------------------------------------------------------

export const Connector = z.object({
  id: z.string().uuid(),
  hostname: z.string(),
  platform: z.string(),
  version: z.string(),
  status: enumOf(ConnectorStatus),
  last_seen_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

// --- Camera ------------------------------------------------------------------

export const RtspUrl = z
  .string()
  .min(1)
  .max(2048)
  .refine((s) => /^rtsp(s)?:\/\//i.test(s), 'must start with rtsp:// or rtsps://');

export const CameraCreateReq = z.object({
  connector_id: z.string().uuid(),
  label: z.string().min(1).max(120),
  rtsp_url: RtspUrl,
});

export const Camera = z.object({
  id: z.string().uuid(),
  connector_id: z.string().uuid(),
  label: z.string(),
  // We never echo credentials back to the dashboard verbatim.
  rtsp_url_masked: z.string(),
  status: enumOf(CameraStatus),
  last_validated_at: z.string().datetime().nullable(),
  last_failure_code: enumOf(FailureCode).nullable(),
  snapshot_url: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  created_at: z.string().datetime(),
});

// --- Commands ----------------------------------------------------------------

export const CommandPayloadValidateRtsp = z.object({
  camera_id: z.string().uuid(),
  rtsp_url: RtspUrl,
});

export const Command = z.object({
  id: z.string().uuid(),
  connector_id: z.string().uuid(),
  kind: enumOf(CommandKind),
  status: enumOf(CommandStatus),
  payload: z.record(z.any()),
  created_at: z.string().datetime(),
  claimed_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
});

export const CommandResultReq = z.object({
  status: z.enum([CommandStatus.SUCCEEDED, CommandStatus.FAILED]),
  // For validate_rtsp: stream metadata + base64 JPEG.
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  snapshot_b64: z.string().optional(),
  failure_code: enumOf(FailureCode).optional(),
  error_message: z.string().max(2000).optional(),
  duration_ms: z.number().int().nonnegative().optional(),
});
