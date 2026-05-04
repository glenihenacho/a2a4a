import React, { useEffect, useState } from 'react';
import { Panel, Label, StatusPill } from '@surveillance/ui';
import { ft, color } from '@surveillance/ui/tokens';
import { api } from '../api.js';

export function ConnectorsPanel() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const { connectors } = await api.listConnectors();
        if (!cancelled) setRows(connectors);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Panel>
      <Label>Connectors</Label>
      <h2 style={{ fontFamily: ft.display, fontSize: 24, margin: '8px 0 16px' }}>
        Live device fleet
      </h2>
      {rows.length === 0 && (
        <div style={{ color: color.textDim, fontFamily: ft.mono, fontSize: 12 }}>
          No connectors paired yet.
        </div>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
              gap: 12,
              alignItems: 'center',
              padding: '10px 14px',
              border: `1px solid ${color.borderSoft}`,
              borderRadius: 10,
              fontFamily: ft.mono,
              fontSize: 12,
            }}
          >
            <div style={{ color: color.text }}>{r.hostname}</div>
            <div style={{ color: color.textDim }}>{r.platform}</div>
            <div style={{ color: color.textDim }}>v{r.version}</div>
            <div style={{ color: color.textDim }}>
              {r.last_seen_at ? new Date(r.last_seen_at).toLocaleTimeString() : '—'}
            </div>
            <StatusPill status={r.status} />
          </div>
        ))}
      </div>
    </Panel>
  );
}
