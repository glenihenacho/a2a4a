import React, { useEffect, useState } from 'react';
import { Panel, Label, Button, Input, StatusPill } from '@surveillance/ui';
import { ft, color } from '@surveillance/ui/tokens';
import { RtspTemplates } from '@surveillance/camera-core/templates';
import { api } from '../api.js';

export function CamerasPanel() {
  const [connectors, setConnectors] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [form, setForm] = useState({ connector_id: '', label: '', rtsp_url: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    try {
      const [c, cam] = await Promise.all([api.listConnectors(), api.listCameras()]);
      setConnectors(c.connectors);
      setCameras(cam.cameras);
      if (!form.connector_id && c.connectors[0]) {
        setForm((f) => ({ ...f, connector_id: c.connectors[0].id }));
      }
    } catch {}
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, []);

  // Step 3: dashboard submits RTSP URL.
  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.createCamera(form);
      setForm((f) => ({ ...f, label: '', rtsp_url: '' }));
      refresh();
    } catch (e2) {
      setError(e2.body?.reason || e2.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fillTemplate = (vendor) => {
    const t = RtspTemplates.find((x) => x.vendor === vendor);
    if (t) setForm((f) => ({ ...f, rtsp_url: t.template }));
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Panel>
        <Label>Step 3 · Submit RTSP URL</Label>
        <h2 style={{ fontFamily: ft.display, fontSize: 24, margin: '8px 0 16px' }}>
          Onboard a camera
        </h2>
        {connectors.length === 0 ? (
          <div style={{ color: color.orange, fontFamily: ft.mono, fontSize: 12 }}>
            Pair a connector before submitting a camera.
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
            <div>
              <Label>Connector</Label>
              <select
                value={form.connector_id}
                onChange={(e) => setForm({ ...form, connector_id: e.target.value })}
                style={{
                  width: '100%',
                  fontFamily: ft.mono,
                  fontSize: 13,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,.3)',
                  border: `1px solid ${color.borderSoft}`,
                  color: color.text,
                  marginTop: 6,
                }}
              >
                {connectors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.hostname} ({c.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Label</Label>
              <Input
                placeholder="Front door"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
                style={{ marginTop: 6 }}
              />
            </div>
            <div>
              <Label>RTSP URL</Label>
              <Input
                placeholder="rtsp://user:pw@192.168.1.50:554/Streaming/Channels/101"
                value={form.rtsp_url}
                onChange={(e) => setForm({ ...form, rtsp_url: e.target.value })}
                required
                style={{ marginTop: 6 }}
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RtspTemplates.map((t) => (
                  <button
                    type="button"
                    key={t.vendor}
                    onClick={() => fillTemplate(t.vendor)}
                    style={{
                      fontFamily: ft.mono,
                      fontSize: 10,
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      padding: '4px 8px',
                      borderRadius: 100,
                      border: `1px solid ${color.borderSoft}`,
                      background: 'transparent',
                      color: color.textDim,
                      cursor: 'pointer',
                    }}
                  >
                    {t.vendor}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Queuing…' : 'Queue validation →'}
              </Button>
            </div>
            {error && (
              <div style={{ color: color.red, fontFamily: ft.mono, fontSize: 12 }}>{error}</div>
            )}
          </form>
        )}
      </Panel>

      <Panel>
        <Label>Cameras</Label>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {cameras.length === 0 && (
            <div style={{ color: color.textDim, fontFamily: ft.mono, fontSize: 12 }}>
              No cameras yet.
            </div>
          )}
          {cameras.map((cam) => (
            <CameraRow key={cam.id} cam={cam} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

// Step 9: dashboard displays preview snapshot once status flips to validated.
function CameraRow({ cam }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr auto',
        gap: 14,
        alignItems: 'center',
        padding: 12,
        border: `1px solid ${color.borderSoft}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          width: 160,
          height: 90,
          background: 'rgba(0,0,0,.5)',
          border: `1px solid ${color.borderSoft}`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {cam.snapshot_url ? (
          <img
            src={`${cam.snapshot_url}?t=${cam.last_validated_at}`}
            alt={cam.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ fontFamily: ft.mono, fontSize: 10, color: color.textFaint }}>
            no preview
          </div>
        )}
      </div>
      <div>
        <div style={{ fontFamily: ft.display, fontSize: 18, fontWeight: 600 }}>{cam.label}</div>
        <div style={{ fontFamily: ft.mono, fontSize: 11, color: color.textDim, marginTop: 2 }}>
          {cam.rtsp_url_masked}
        </div>
        {cam.last_failure_code && (
          <div style={{ fontFamily: ft.mono, fontSize: 11, color: color.red, marginTop: 4 }}>
            {cam.last_failure_code}: {cam.last_error_message}
          </div>
        )}
        {cam.width && cam.height && (
          <div style={{ fontFamily: ft.mono, fontSize: 11, color: color.textDim, marginTop: 4 }}>
            {cam.width}×{cam.height}
          </div>
        )}
      </div>
      <StatusPill status={cam.status} />
    </div>
  );
}
