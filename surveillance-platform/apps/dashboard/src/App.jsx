import React, { useState } from 'react';
import { ft, color } from '@surveillance/ui/tokens';
import { PairingPanel } from './pages/Pairing.jsx';
import { ConnectorsPanel } from './pages/Connectors.jsx';
import { CamerasPanel } from './pages/Cameras.jsx';

const tabs = [
  { id: 'pairing', label: 'Pair Connector' },
  { id: 'connectors', label: 'Connectors' },
  { id: 'cameras', label: 'Cameras' },
];

export default function App() {
  const [tab, setTab] = useState('pairing');
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${color.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <div style={{ fontFamily: ft.display, fontSize: 22, fontWeight: 700, letterSpacing: '.04em' }}>
          SURVEILLANCE · CONTROL PLANE
        </div>
        <nav style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                fontFamily: ft.mono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                padding: '8px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                background: tab === t.id ? color.blue : 'transparent',
                color: tab === t.id ? '#001018' : color.text,
                border: `1px solid ${tab === t.id ? color.blue : color.borderSoft}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main style={{ flex: 1, padding: 24, maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        {tab === 'pairing' && <PairingPanel onPaired={() => setTab('cameras')} />}
        {tab === 'connectors' && <ConnectorsPanel />}
        {tab === 'cameras' && <CamerasPanel />}
      </main>
    </div>
  );
}
