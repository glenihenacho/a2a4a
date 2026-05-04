import React, { useEffect, useRef, useState } from 'react';
import { Panel, Label, Button } from '@surveillance/ui';
import { ft, color } from '@surveillance/ui/tokens';
import { api } from '../api.js';

// Steps 1 + 2: dashboard creates a pairing code and polls until the connector
// claims it.
export function PairingPanel({ onPaired }) {
  const [pairing, setPairing] = useState(null);
  const [claimed, setClaimed] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const start = async () => {
    setError(null);
    setClaimed(null);
    try {
      const p = await api.createPairing();
      setPairing(p);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    if (!pairing || claimed) return;
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getPairing(pairing.pairing_id);
        if (status.claimed) {
          setClaimed(status);
          clearInterval(pollRef.current);
        }
      } catch {
        // transient — keep polling
      }
    }, 1500);
    return () => clearInterval(pollRef.current);
  }, [pairing, claimed]);

  return (
    <Panel>
      <Label>Step 1 · Pair a connector</Label>
      <h2 style={{ fontFamily: ft.display, fontSize: 28, margin: '8px 0 4px' }}>
        Bring an on-prem connector online
      </h2>
      <p style={{ color: color.textDim, marginTop: 0 }}>
        Generate a 6-character code, enter it on the customer's connector device, and we'll
        light up here once it dials home.
      </p>

      {!pairing && (
        <div style={{ marginTop: 16 }}>
          <Button onClick={start}>Generate pairing code</Button>
        </div>
      )}

      {pairing && (
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Label>Pairing code</Label>
            <div
              style={{
                fontFamily: ft.mono,
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: '.2em',
                padding: '20px 16px',
                background: 'rgba(0,0,0,.4)',
                border: `1px solid ${color.border}`,
                borderRadius: 12,
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              {pairing.code}
            </div>
            <div style={{ marginTop: 8, fontFamily: ft.mono, fontSize: 11, color: color.textDim }}>
              expires {new Date(pairing.expires_at).toLocaleTimeString()}
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <div
              style={{
                marginTop: 6,
                padding: 16,
                border: `1px solid ${color.borderSoft}`,
                borderRadius: 12,
                fontFamily: ft.mono,
                fontSize: 13,
                minHeight: 132,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {claimed ? (
                <>
                  <div style={{ color: color.green }}>✓ Connector paired</div>
                  <div style={{ color: color.textDim, fontSize: 11 }}>
                    connector_id: {claimed.connector_id}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Button onClick={onPaired}>Submit a camera →</Button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: color.orange }}>● Waiting for connector to claim…</div>
                  <div style={{ color: color.textDim, fontSize: 11 }}>
                    Run the connector and enter the code above.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, color: color.red, fontFamily: ft.mono, fontSize: 12 }}>
          {error}
        </div>
      )}
    </Panel>
  );
}
