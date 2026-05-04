# RTSP URL cheat sheet

Vendor-keyed URL formats. The dashboard's URL builder fills these in
automatically — this doc is for ops reference and customer hand-offs.

| Vendor | Main stream | Sub stream |
|---|---|---|
| Hikvision / Hikvision OEM | `rtsp://user:pw@host:554/Streaming/Channels/101` | `…/102` |
| Dahua / Amcrest | `rtsp://user:pw@host:554/cam/realmonitor?channel=1&subtype=0` | `subtype=1` |
| Axis | `rtsp://user:pw@host:554/axis-media/media.amp` | (params) |
| Reolink | `rtsp://user:pw@host:554/h264Preview_01_main` | `_sub` |
| Ubiquiti UniFi Protect | `rtsps://host:7441/<stream-token>` | (one URL per profile) |
| Generic ONVIF | Probe via ONVIF first, then use the discovered stream URI |

## Picking main vs sub

- Use **sub stream** for the validation snapshot — it's lower res and most
  cameras serve it more reliably. We're not training a model from this
  frame, we're proving connectivity.
- Use **main stream** for the actual recording / detection pipeline once
  the camera is validated.

## Common gotchas

- Passwords with `@`, `:`, `/`, or `?` must be **percent-encoded** in the
  URL. The URL builder UI handles this for you.
- Some Hikvision firmware blocks RTSP unless you tick "Open RTSP" in the
  camera's web UI under *Configuration → Network → Advanced*.
- Reolink E1 / Argus battery cams don't expose RTSP at all — they need the
  vendor's RTMP gateway. Out of scope for v1.
