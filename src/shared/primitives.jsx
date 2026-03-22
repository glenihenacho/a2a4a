import { ft, blue } from "./tokens";

// ─── PRIMITIVES ───

export function Badge({ children, color, bg }) {
  return (
    <span
      style={{
        fontFamily: ft.mono,
        fontSize: 10,
        fontWeight: 600,
        color,
        background: bg,
        padding: "3px 10px",
        borderRadius: 100,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

export function VBadge({ v }) {
  const c = { SEO: { c: "#42A5F5", b: "rgba(66,165,245,.1)" }, AIO: { c: "#90CAF9", b: "rgba(144,202,249,.1)" } };
  const { c: col, b: bgc } = c[v] || c.SEO;
  return (
    <Badge color={col} bg={bgc}>
      {v}
    </Badge>
  );
}

export function ScoreBar({ value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,.05)" }}>
        <div
          style={{ width: `${value}%`, height: "100%", borderRadius: 2, background: color, transition: "width .5s" }}
        />
      </div>
      <span style={{ fontFamily: ft.mono, fontSize: 11, color: "rgba(255,255,255,.45)" }}>{value}</span>
    </div>
  );
}

export function Card({ children, style: s = {}, mob }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.02)",
        border: "1px solid rgba(66,165,245,.07)",
        borderRadius: mob ? 12 : 14,
        padding: mob ? 16 : 24,
        ...s,
      }}
    >
      {children}
    </div>
  );
}

export function ScrollX({ children }) {
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", margin: "0 -4px", padding: "0 4px" }}>
      {children}
    </div>
  );
}

// ─── CHARTS ───

export function Sparkline({ data, width = 120, height = 36, color = blue }) {
  if (!data || data.length === 0) {
    return <svg width={width} height={height} style={{ display: "block" }} />;
  }
  const max = Math.max(...data),
    min = Math.min(...data),
    range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1 || 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(" ");
  const uid = `sp-${color.replace("#", "")}-${width}`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#${uid})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BarChart({ data, labels, keys, colors, height = 180, mob }) {
  if (!data || data.length === 0) {
    return <div style={{ height: mob ? 140 : height }} />;
  }
  const max = Math.max(...data.map((d) => keys.reduce((s, k) => s + d[k], 0))) || 1;
  const h = mob ? 140 : height;
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-around",
          height: h,
          position: "relative",
          width: "100%",
        }}
      >
        {[0, 0.5, 1].map((p) => (
          <div
            key={p}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: p * h,
              borderTop: "1px solid rgba(255,255,255,.03)",
              pointerEvents: "none",
            }}
          />
        ))}
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              zIndex: 1,
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column-reverse",
                width: mob ? 20 : 30,
                borderRadius: "3px 3px 0 0",
                overflow: "hidden",
              }}
            >
              {keys.map((k, ki) => (
                <div
                  key={k}
                  style={{
                    height: Math.max(2, (d[k] / max) * (h - 16)),
                    background: colors[ki],
                    transition: "height .4s",
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        {keys.map((k, i) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i] }} />
            <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.25)" }}>
              {k === "clearing" ? "Clearing" : "Milestones"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ segments, size = 100 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = size * 0.36,
    cx = size / 2,
    cy = size / 2,
    sw = size * 0.1,
    circ = 2 * Math.PI * r;
  const offsets = segments.reduce((acc, seg, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + segments[i - 1].value / total);
    return acc;
  }, []);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {segments.map((seg, i) => {
        const pct = seg.value / total,
          dashLen = circ * pct,
          dashOff = circ * offsets[i];
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw}
            strokeDasharray={`${dashLen} ${circ - dashLen}`}
            strokeDashoffset={-dashOff}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
