import React from 'react';
import { ft, color, statusColor } from './tokens.js';

export { ft, color, statusColor };

export const Panel = ({ children, style, ...rest }) => (
  <div
    {...rest}
    style={{
      background: color.panel,
      border: `1px solid ${color.border}`,
      borderRadius: 14,
      padding: 20,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Label = ({ children, style }) => (
  <div
    style={{
      fontFamily: ft.mono,
      fontSize: 10,
      fontWeight: 700,
      color: color.blue,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      ...style,
    }}
  >
    {children}
  </div>
);

export const StatusPill = ({ status }) => (
  <span
    style={{
      fontFamily: ft.mono,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      color: statusColor[status] || color.textDim,
      border: `1px solid ${statusColor[status] || color.borderSoft}`,
      padding: '3px 8px',
      borderRadius: 100,
      background: 'rgba(0,0,0,.3)',
    }}
  >
    {status}
  </span>
);

export const Button = ({ children, variant = 'primary', style, ...rest }) => {
  const styles = {
    primary: { background: color.blue, color: '#001018', border: `1px solid ${color.blue}` },
    ghost: { background: 'transparent', color: color.text, border: `1px solid ${color.borderSoft}` },
    danger: { background: 'transparent', color: color.red, border: `1px solid ${color.red}` },
  };
  return (
    <button
      {...rest}
      style={{
        fontFamily: ft.mono,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        padding: '10px 16px',
        borderRadius: 10,
        cursor: 'pointer',
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export const Input = ({ style, ...rest }) => (
  <input
    {...rest}
    style={{
      width: '100%',
      fontFamily: ft.mono,
      fontSize: 13,
      padding: '10px 12px',
      borderRadius: 8,
      background: 'rgba(0,0,0,.3)',
      border: `1px solid ${color.borderSoft}`,
      color: color.text,
      outline: 'none',
      ...style,
    }}
  />
);
