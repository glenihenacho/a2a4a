// Vendor-keyed RTSP URL templates. {{user}}/{{pass}}/{{host}}/{{port}}/{{channel}}/{{stream}}
// Stream values: "main" (high-res) or "sub" (low-res preview).
//
// These are operator hints for the dashboard's "URL builder" UI — the API
// itself doesn't care which template was used, just the final URL.

export const RtspTemplates = [
  {
    vendor: 'hikvision',
    label: 'Hikvision (main + sub)',
    template: 'rtsp://{{user}}:{{pass}}@{{host}}:{{port}}/Streaming/Channels/{{channel}}{{stream_digit}}',
    defaults: { port: 554, channel: 1, stream: 'main' },
    notes: 'stream_digit: main=01, sub=02. Typical: /Streaming/Channels/101.',
  },
  {
    vendor: 'dahua',
    label: 'Dahua / Amcrest',
    template: 'rtsp://{{user}}:{{pass}}@{{host}}:{{port}}/cam/realmonitor?channel={{channel}}&subtype={{subtype}}',
    defaults: { port: 554, channel: 1, stream: 'main' },
    notes: 'subtype: main=0, sub=1.',
  },
  {
    vendor: 'axis',
    label: 'Axis',
    template: 'rtsp://{{user}}:{{pass}}@{{host}}:{{port}}/axis-media/media.amp',
    defaults: { port: 554 },
    notes: 'Single stream URL; resolution negotiated via params.',
  },
  {
    vendor: 'reolink',
    label: 'Reolink',
    template: 'rtsp://{{user}}:{{pass}}@{{host}}:{{port}}/h264Preview_{{channel_padded}}_{{stream}}',
    defaults: { port: 554, channel: 1, stream: 'main' },
    notes: 'channel_padded: zero-padded 2-digit channel (01, 02...).',
  },
  {
    vendor: 'ubiquiti',
    label: 'Ubiquiti UniFi Protect',
    template: 'rtsps://{{host}}:7441/{{stream_token}}',
    defaults: { port: 7441 },
    notes: 'stream_token issued by Protect controller. RTSPS only.',
  },
  {
    vendor: 'generic_onvif',
    label: 'Generic ONVIF',
    template: 'rtsp://{{user}}:{{pass}}@{{host}}:{{port}}/onvif/profile1',
    defaults: { port: 554 },
    notes: 'Probe via ONVIF first to discover the actual stream URI.',
  },
];

export const findTemplate = (vendor) =>
  RtspTemplates.find((t) => t.vendor === vendor) || null;
