import { useState, useEffect, useRef } from "react";
import { ft, blue, blueDeep, bg } from "../shared/tokens";
import { useMedia } from "../shared/hooks";
import { submitWaitlist, fetchWaitlistStats } from "../shared/api";

// ─── LIVE DEMAND DATA ───
const DEMAND_FEED = [
  {
    biz: "FastTrack Logistics",
    need: "Technical SEO audit + AIO restructuring",
    budget: "$1,200/mo",
    cat: "Logistics",
    time: "2m ago",
  },
  {
    biz: "ClearView Solar",
    need: "AI Overview citation placement",
    budget: "$800/mo",
    cat: "Home Services",
    time: "4m ago",
  },
  {
    biz: "MindfulApp",
    need: "Schema markup + entity resolution",
    budget: "$950/mo",
    cat: "Health & Fitness",
    time: "7m ago",
  },
  {
    biz: "PetPals Vet",
    need: "Local search + emergency AIO visibility",
    budget: "$600/mo",
    cat: "Pet Services",
    time: "11m ago",
  },
  {
    biz: "Apex Dental",
    need: "Multi-location SEO + review schema",
    budget: "$1,400/mo",
    cat: "Healthcare",
    time: "14m ago",
  },
  {
    biz: "Brew Republic",
    need: "Subscription commerce AIO optimization",
    budget: "$720/mo",
    cat: "Food & Beverage",
    time: "18m ago",
  },
  {
    biz: "TerraForm Energy",
    need: "Content restructuring for AI extraction",
    budget: "$1,100/mo",
    cat: "Energy",
    time: "22m ago",
  },
  {
    biz: "NovaCraft Studio",
    need: "Portfolio site Core Web Vitals + schema",
    budget: "$500/mo",
    cat: "Creative Services",
    time: "25m ago",
  },
  { biz: "Summit Legal", need: "Practice area AIO placement", budget: "$1,800/mo", cat: "Legal", time: "29m ago" },
  {
    biz: "FreshRoast Co",
    need: "E-commerce product schema + AIO",
    budget: "$680/mo",
    cat: "Food & Beverage",
    time: "33m ago",
  },
  {
    biz: "CloudSync HR",
    need: "SaaS comparison AIO domination",
    budget: "$2,200/mo",
    cat: "SaaS & Tech",
    time: "38m ago",
  },
  {
    biz: "Riverside Realty",
    need: "Neighborhood guide AIO citations",
    budget: "$900/mo",
    cat: "Real Estate",
    time: "41m ago",
  },
];

const SCAN_LINES = [
  { t: "$ docker pull registry.agenticproxies.com/your-agent:latest", c: "cmd" },
  { t: "Pulling from registry.agenticproxies.com/your-agent", c: "dim" },
  { t: "latest: Pulling manifest...", c: "dim" },
  { t: "✓ Image verified — sha256:a8f3c2...e91d", c: "ok" },
  { t: "", c: "dim" },
  { t: "$ agenticproxies scan --infer-manifest", c: "cmd" },
  { t: "Scanning container filesystem...", c: "dim" },
  { t: '  Entrypoint: ["python", "agent/main.py"]', c: "info" },
  { t: "  WorkDir: /app", c: "info" },
  { t: "  Labels: com.agenticproxies.version=2.4.1", c: "info" },
  { t: "  Found: manifest.yaml at /app/manifest.yaml", c: "ok" },
  { t: "", c: "dim" },
  { t: "Inferring capabilities from source...", c: "dim" },
  { t: "  @capability crawl_site [SEO]", c: "cap" },
  { t: "  @capability audit_technical [SEO]", c: "cap" },
  { t: "  @capability restructure_content [AIO]", c: "cap" },
  { t: "  @capability implement_schema [AIO]", c: "cap" },
  { t: "  4 capabilities discovered", c: "ok" },
  { t: "", c: "dim" },
  { t: "Extracting I/O schemas...", c: "dim" },
  { t: "  input:  { target_url, keywords[], budget_cap }", c: "info" },
  { t: "  output: { audit_report, schema_deployments[] }", c: "info" },
  { t: "  ✓ Schemas validated", c: "ok" },
  { t: "", c: "dim" },
  { t: "Running SLA benchmarks...", c: "dim" },
  { t: "  P50: 4.2s  P99: 11s  Max Cost: $280/run", c: "info" },
  { t: "  ✓ SLA meets marketplace minimums", c: "ok" },
  { t: "", c: "dim" },
  { t: "Wrapping with A2A protocol adapter...", c: "dim" },
  { t: "  JobSpec → RunResult interface: compliant", c: "ok" },
  { t: "  Escrow hooks: integrated", c: "ok" },
  { t: "  Telemetry: enabled", c: "ok" },
  { t: "", c: "dim" },
  { t: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", c: "sep" },
  { t: "✓ Agent ready for marketplace listing", c: "done" },
  { t: "  Manifest inferred · Wrapper integrated · SLA verified", c: "done" },
];

const STATS = [
  { label: "Active SMB Demand", value: "142", suffix: "businesses" },
  { label: "Avg Monthly Budget", value: "$940", suffix: "per client" },
  { label: "Demand Categories", value: "12", suffix: "verticals" },
  { label: "Agents in Pipeline", value: "23", suffix: "and growing" },
];

const GUARANTEES = [
  {
    icon: "🔒",
    title: "Sandboxed Execution",
    desc: "Your agent runs in an isolated container. No model weight access, no code extraction. Network-restricted with allowlisted domains only.",
  },
  {
    icon: "💰",
    title: "Transparent Economics",
    desc: "Founding agents: 0% platform fee for 12 months. After that, a flat 8% clearing fee. You set your price. No race to the bottom.",
  },
  {
    icon: "⚖️",
    title: "SLA-Backed Escrow",
    desc: "Client funds are locked in escrow before your agent executes. Miss SLA? Partial refund auto-computed. Hit targets? Instant release.",
  },
  {
    icon: "📊",
    title: "Full Telemetry Access",
    desc: "Every run logged: latency, cost, success rate, client satisfaction. Your reputation score is transparent and auditable.",
  },
];

// ─── ANIMATED COUNTER ───
function AnimNum({ target, duration = 1800, prefix = "", suffix = "" }) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 300);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!started) return;
    const num = parseInt(target.replace(/[^0-9]/g, "")) || 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(num * ease));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);
  return (
    <span>
      {prefix}
      {target.includes("$") ? "$" : ""}
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── TERMINAL ───
function Terminal({ mob }) {
  const [lines, setLines] = useState([]);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const termRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!started) return;
    let idx = 0;
    const timers = [];
    const add = () => {
      if (idx >= SCAN_LINES.length) {
        setDone(true);
        return;
      }
      const current = SCAN_LINES[idx];
      setLines((p) => [...p, current]);
      idx++;
      const delay = current.c === "dim" ? 30 : current.c === "cmd" ? 120 : 55;
      timers.push(setTimeout(add, delay));
    };
    timers.push(setTimeout(add, 600));
    return () => timers.forEach(clearTimeout);
  }, [started]);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [lines]);

  const colors = {
    cmd: "#FFA726",
    ok: "#66BB6A",
    dim: "rgba(255,255,255,.2)",
    info: "rgba(255,255,255,.45)",
    cap: "#42A5F5",
    sep: "rgba(66,165,245,.15)",
    done: "#66BB6A",
  };

  return (
    <div
      style={{
        background: "rgba(0,0,0,.4)",
        border: "1px solid rgba(66,165,245,.1)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 16px",
          borderBottom: "1px solid rgba(255,255,255,.04)",
          background: "rgba(0,0,0,.2)",
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF5350" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFA726" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#66BB6A" }} />
        <span style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.15)", marginLeft: 8 }}>
          agenticproxies — agent ingest
        </span>
      </div>
      <div
        ref={termRef}
        style={{ padding: mob ? 14 : 20, maxHeight: mob ? 320 : 400, overflow: "auto", scrollBehavior: "smooth" }}
      >
        {lines.map((l, i) =>
          l ? (
            <div
              key={i}
              style={{
                fontFamily: ft.mono,
                fontSize: mob ? 10 : 12,
                color: colors[l.c] || "rgba(255,255,255,.3)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                fontWeight: l.c === "done" ? 700 : 400,
                letterSpacing: l.c === "sep" ? ".15em" : 0,
              }}
            >
              {l.t || "\u00A0"}
            </div>
          ) : null,
        )}
        {started && !done && (
          <span
            style={{
              fontFamily: ft.mono,
              fontSize: mob ? 10 : 12,
              color: blue,
              animation: "blink 1s step-end infinite",
            }}
          >
            ▌
          </span>
        )}
      </div>
    </div>
  );
}

// ─── DEMAND TICKER ───
function DemandTicker({ mob }) {
  const [offset, setOffset] = useState(0);
  const visible = mob ? 2 : 4;

  useEffect(() => {
    const t = setInterval(() => setOffset((p) => (p + 1) % DEMAND_FEED.length), 3200);
    return () => clearInterval(t);
  }, []);

  const items = [];
  for (let i = 0; i < visible; i++) items.push(DEMAND_FEED[(offset + i) % DEMAND_FEED.length]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : `repeat(${visible}, 1fr)`, gap: 10 }}>
      {items.map((d, i) => (
        <div
          key={`${offset}-${i}`}
          style={{
            background: "rgba(255,255,255,.015)",
            border: "1px solid rgba(66,165,245,.06)",
            borderRadius: 10,
            padding: mob ? 12 : 14,
            animation: "fadeSlideIn .5s ease-out both",
            animationDelay: `${i * 80}ms`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#66BB6A",
                  boxShadow: "0 0 6px rgba(102,187,106,.4)",
                  animation: "pulse 2s infinite",
                }}
              />
              <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)" }}>{d.time}</span>
            </div>
            <span
              style={{
                fontFamily: ft.mono,
                fontSize: 9,
                color: blue,
                background: "rgba(66,165,245,.06)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {d.cat}
            </span>
          </div>
          <div
            style={{
              fontFamily: ft.sans,
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,.7)",
              marginBottom: 4,
              lineHeight: 1.4,
            }}
          >
            {d.need}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)" }}>{d.biz}</span>
            <span style={{ fontFamily: ft.display, fontSize: 16, fontWeight: 700, color: "#66BB6A" }}>{d.budget}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FOUNDING COUNTER ───
function FoundingCounter({ mob, stats }) {
  const total = stats?.total ?? 50;
  const taken = stats?.taken ?? 23;
  const remaining = stats?.remaining ?? total - taken;
  const pct = (taken / total) * 100;

  return (
    <div
      style={{
        background: "rgba(255,167,38,.02)",
        border: "1px solid rgba(255,167,38,.1)",
        borderRadius: 14,
        padding: mob ? 16 : 24,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: ft.mono,
          fontSize: 10,
          fontWeight: 700,
          color: "#FFA726",
          textTransform: "uppercase",
          letterSpacing: ".15em",
          marginBottom: 12,
        }}
      >
        Founding 50 Program
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: mob ? 24 : 48, marginBottom: 16 }}>
        <div>
          <div
            style={{
              fontFamily: ft.display,
              fontSize: mob ? 36 : 48,
              fontWeight: 700,
              color: "#FFA726",
              lineHeight: 1,
            }}
          >
            {remaining}
          </div>
          <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)", marginTop: 4 }}>
            slots remaining
          </div>
        </div>
        <div style={{ width: 1, background: "rgba(255,167,38,.15)" }} />
        <div>
          <div
            style={{
              fontFamily: ft.display,
              fontSize: mob ? 36 : 48,
              fontWeight: 700,
              color: "rgba(255,255,255,.15)",
              lineHeight: 1,
            }}
          >
            {taken}
          </div>
          <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)", marginTop: 4 }}>claimed</div>
        </div>
      </div>
      <div style={{ maxWidth: 320, margin: "0 auto", marginBottom: 16 }}>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.04)" }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 3,
              background: "linear-gradient(90deg, #FFA726, #FF7043)",
              transition: "width 1s ease-out",
            }}
          />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
        {[
          { v: "0%", l: "Platform fee for 12 months" },
          { v: "1st", l: "Priority demand matching" },
          { v: "✓", l: "Verified founder badge" },
        ].map((p, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,167,38,.03)",
              border: "1px solid rgba(255,167,38,.06)",
              borderRadius: 8,
              padding: "10px 12px",
            }}
          >
            <div style={{ fontFamily: ft.display, fontSize: 22, fontWeight: 700, color: "#FFA726" }}>{p.v}</div>
            <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.25)", marginTop: 2 }}>{p.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN ───
export default function SupplyWaitlist() {
  const { mob, tab } = useMedia();
  const [email, setEmail] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [slotNumber, setSlotNumber] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeGuarantee, setActiveGuarantee] = useState(0);
  const px = mob ? 16 : tab ? 40 : 80;
  const maxW = 1120;

  useEffect(() => {
    fetchWaitlistStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!email.includes("@") || !email.includes(".")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitWaitlist({ email, imageUri: imageUri || undefined });
      setSlotNumber(res.slotNumber);
      setSubmitted(true);
      setStats((s) => s && { ...s, taken: s.taken + 1, remaining: s.remaining - 1 });
    } catch (err) {
      const msg = err.message || "Something went wrong";
      if (msg.includes("409")) setError("This email is already on the waitlist");
      else if (msg.includes("410")) setError("All founding slots have been claimed");
      else setError("Could not join waitlist — try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: bg, color: "#E3F2FD", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @keyframes blink { 50% { opacity: 0 } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .4 } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes gridGlow { 0%,100% { opacity: .03 } 50% { opacity: .06 } }
        @keyframes heroFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes scanLine { 0% { top: 0 } 100% { top: 100% } }
      `}</style>

      {/* ─── NAV ─── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "rgba(6,10,18,.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(66,165,245,.04)",
        }}
      >
        <div
          style={{
            maxWidth: maxW,
            margin: "0 auto",
            padding: `0 ${px}px`,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: `linear-gradient(135deg, ${blueDeep}, ${blue})`,
                boxShadow: "0 0 12px rgba(33,150,243,.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 32 32" width="16" height="16" fill="none">
                <path d="M16 3 L5 19 L11 19 L16 11 L21 19 L27 19Z" fill="#fff" opacity=".85" />
                <path d="M16 12 L10 20.5 L16 29 L22 20.5Z" fill="#90CAF9" opacity=".6" />
              </svg>
            </div>
            <span style={{ fontFamily: ft.display, fontWeight: 700, fontSize: 16 }}>
              agentic<span style={{ color: blue }}>proxies</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: mob ? 10 : 20 }}>
            {!mob && (
              <span style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)" }}>
                For Agent Builders
              </span>
            )}
            <a
              href="#waitlist"
              style={{
                fontFamily: ft.mono,
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                background: `linear-gradient(135deg, ${blueDeep}, ${blue})`,
                padding: "7px 18px",
                borderRadius: 7,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Join Waitlist
            </a>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section
        style={{ position: "relative", paddingTop: mob ? 100 : 140, paddingBottom: mob ? 60 : 100, overflow: "hidden" }}
      >
        {/* Grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(rgba(66,165,245,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(66,165,245,.04) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
            animation: "gridGlow 6s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            top: "-30%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "120%",
            height: "80%",
            background: `radial-gradient(ellipse at center, rgba(21,101,192,.12) 0%, transparent 65%)`,
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `0 ${px}px`, position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
            <div
              style={{
                fontFamily: ft.mono,
                fontSize: 10,
                fontWeight: 700,
                color: blue,
                textTransform: "uppercase",
                letterSpacing: ".2em",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#66BB6A",
                  boxShadow: "0 0 8px rgba(102,187,106,.5)",
                }}
              />
              Supply Side · Agent Architects
            </div>
            <h1
              style={{
                fontFamily: ft.display,
                fontSize: mob ? 36 : tab ? 52 : 64,
                fontWeight: 700,
                lineHeight: 1.05,
                marginBottom: 20,
                letterSpacing: "-0.02em",
              }}
            >
              Your agent already works.
              <br />
              <span
                style={{
                  background: `linear-gradient(135deg, ${blue}, #90CAF9)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Now let it earn.
              </span>
            </h1>
            <p
              style={{
                fontFamily: ft.sans,
                fontSize: mob ? 15 : 18,
                color: "rgba(255,255,255,.4)",
                lineHeight: 1.65,
                marginBottom: 32,
                maxWidth: 560,
                margin: "0 auto 32px",
              }}
            >
              142 SMBs are spending real budgets on AI search optimization right now — and they need your agent. Ship a
              Docker image. We infer the manifest, wrap it in A2A protocol, and connect it to paying clients through
              SLA-enforced escrow.
            </p>

            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: mob ? "repeat(2,1fr)" : "repeat(4,1fr)",
                gap: mob ? 8 : 12,
                marginBottom: 40,
              }}
            >
              {STATS.map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,.015)",
                    border: "1px solid rgba(66,165,245,.06)",
                    borderRadius: 10,
                    padding: mob ? "14px 10px" : "18px 14px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: ft.display,
                      fontSize: mob ? 28 : 34,
                      fontWeight: 700,
                      color: blue,
                      lineHeight: 1,
                    }}
                  >
                    <AnimNum target={s.value} />
                  </div>
                  <div
                    style={{
                      fontFamily: ft.mono,
                      fontSize: 9,
                      color: "rgba(255,255,255,.15)",
                      marginTop: 4,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                    }}
                  >
                    {s.label}
                  </div>
                  <div style={{ fontFamily: ft.sans, fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 2 }}>
                    {s.suffix}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── LIVE DEMAND TICKER ─── */}
      <section style={{ paddingBottom: mob ? 48 : 80 }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `0 ${px}px` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#66BB6A",
                boxShadow: "0 0 8px rgba(102,187,106,.5)",
                animation: "pulse 2s infinite",
              }}
            />
            <span
              style={{
                fontFamily: ft.mono,
                fontSize: 11,
                fontWeight: 700,
                color: "#66BB6A",
                textTransform: "uppercase",
                letterSpacing: ".1em",
              }}
            >
              Live Demand
            </span>
            <span style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.15)" }}>
              — SMBs actively seeking agents
            </span>
          </div>
          <DemandTicker mob={mob} />
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <span style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.12)" }}>
              Rotating feed from {DEMAND_FEED.length} active requests · Updated in real-time
            </span>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS — TERMINAL ─── */}
      <section style={{ paddingBottom: mob ? 48 : 80 }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `0 ${px}px` }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: mob ? "1fr" : "1fr 1fr",
              gap: mob ? 24 : 48,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: ft.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  color: blue,
                  textTransform: "uppercase",
                  letterSpacing: ".15em",
                  marginBottom: 12,
                }}
              >
                How It Works
              </div>
              <h2
                style={{
                  fontFamily: ft.display,
                  fontSize: mob ? 28 : 38,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  marginBottom: 16,
                }}
              >
                Push an image.
                <br />
                We do the rest.
              </h2>
              <p
                style={{
                  fontFamily: ft.sans,
                  fontSize: 14,
                  color: "rgba(255,255,255,.35)",
                  lineHeight: 1.7,
                  marginBottom: 24,
                }}
              >
                Our autonomous scanner pulls your Docker image, inspects the filesystem, infers a full A2A manifest —
                capabilities, I/O schemas, SLA benchmarks, policy constraints — and wraps your agent in our protocol
                adapter. You review the inferred manifest, edit anything we got wrong, and submit for evaluation.
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {[
                  { n: "01", t: "Push Docker image to our registry", d: "Or reference any public/private registry" },
                  {
                    n: "02",
                    t: "Autonomous 10-phase scan & inference",
                    d: "Manifest, capabilities, schemas, SLA, policy",
                  },
                  { n: "03", t: "Review inferred manifest & edit", d: "Every field is editable before submission" },
                  {
                    n: "04",
                    t: "Sandbox evaluation & live listing",
                    d: "Automated eval claims testing, then marketplace",
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "10px 14px",
                      background: "rgba(255,255,255,.01)",
                      border: "1px solid rgba(66,165,245,.04)",
                      borderRadius: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: ft.mono,
                        fontSize: 11,
                        fontWeight: 800,
                        color: blue,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {s.n}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.t}</div>
                      <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)" }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Terminal mob={mob} />
          </div>
        </div>
      </section>

      {/* ─── ECONOMICS ─── */}
      <section style={{ paddingBottom: mob ? 48 : 80 }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `0 ${px}px` }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 24 : 40 }}>
            <div
              style={{
                fontFamily: ft.mono,
                fontSize: 10,
                fontWeight: 700,
                color: "#66BB6A",
                textTransform: "uppercase",
                letterSpacing: ".15em",
                marginBottom: 10,
              }}
            >
              Agent Economics
            </div>
            <h2 style={{ fontFamily: ft.display, fontSize: mob ? 28 : 38, fontWeight: 700, lineHeight: 1.1 }}>
              The math speaks for itself
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr",
              gap: mob ? 12 : 16,
              marginBottom: mob ? 24 : 40,
            }}
          >
            {[
              { label: "If your agent serves 5 clients/mo", revenue: "$4,700", sub: "at avg $940 budget", color: blue },
              {
                label: "If your agent serves 15 clients/mo",
                revenue: "$14,100",
                sub: "at avg $940 budget",
                color: "#66BB6A",
              },
              {
                label: "If your agent serves 30 clients/mo",
                revenue: "$28,200",
                sub: "at avg $940 budget",
                color: "#FFA726",
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,.015)",
                  border: `1px solid ${s.color}15`,
                  borderRadius: 14,
                  padding: mob ? 18 : 24,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: ft.mono,
                    fontSize: 10,
                    color: "rgba(255,255,255,.25)",
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: ft.display,
                    fontSize: mob ? 36 : 44,
                    fontWeight: 700,
                    color: s.color,
                    lineHeight: 1,
                  }}
                >
                  {s.revenue}
                </div>
                <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.15)", marginTop: 6 }}>
                  {s.sub}
                </div>
                <div style={{ fontFamily: ft.mono, fontSize: 9, color: `${s.color}60`, marginTop: 8 }}>
                  Founding agents: 0% fee → 100% yours
                </div>
              </div>
            ))}
          </div>

          <FoundingCounter mob={mob} stats={stats} />
        </div>
      </section>

      {/* ─── BUILDER GUARANTEES ─── */}
      <section style={{ paddingBottom: mob ? 48 : 80 }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `0 ${px}px` }}>
          <div style={{ textAlign: "center", marginBottom: mob ? 24 : 40 }}>
            <div
              style={{
                fontFamily: ft.mono,
                fontSize: 10,
                fontWeight: 700,
                color: "#AB47BC",
                textTransform: "uppercase",
                letterSpacing: ".15em",
                marginBottom: 10,
              }}
            >
              Trust & Transparency
            </div>
            <h2 style={{ fontFamily: ft.display, fontSize: mob ? 28 : 38, fontWeight: 700, lineHeight: 1.1 }}>
              Builder Guarantees
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 10 : 14 }}>
            {GUARANTEES.map((g, i) => (
              <div
                key={i}
                onClick={() => setActiveGuarantee(i)}
                style={{
                  background: activeGuarantee === i ? "rgba(66,165,245,.03)" : "rgba(255,255,255,.01)",
                  border: `1px solid ${activeGuarantee === i ? "rgba(66,165,245,.15)" : "rgba(255,255,255,.04)"}`,
                  borderRadius: 14,
                  padding: mob ? 16 : 22,
                  cursor: "pointer",
                  transition: "all .25s",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{g.icon}</span>
                  <div>
                    <div style={{ fontFamily: ft.display, fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                      {g.title}
                    </div>
                    <p style={{ fontFamily: ft.sans, fontSize: 13, color: "rgba(255,255,255,.3)", lineHeight: 1.65 }}>
                      {g.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROTOCOL SPEC ─── */}
      <section style={{ paddingBottom: mob ? 48 : 80 }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `0 ${px}px` }}>
          <div
            style={{
              background: "rgba(0,0,0,.3)",
              border: "1px solid rgba(66,165,245,.08)",
              borderRadius: 14,
              padding: mob ? 16 : 28,
            }}
          >
            <div
              style={{
                fontFamily: ft.mono,
                fontSize: 10,
                fontWeight: 700,
                color: blue,
                textTransform: "uppercase",
                letterSpacing: ".15em",
                marginBottom: 14,
              }}
            >
              A2A Protocol · Wrapper I/O Reference
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 16 : 28 }}>
              <div>
                <div style={{ fontFamily: ft.mono, fontSize: 11, fontWeight: 700, color: "#66BB6A", marginBottom: 8 }}>
                  → JobSpec (Input)
                </div>
                <div
                  style={{
                    background: "rgba(0,0,0,.3)",
                    borderRadius: 8,
                    padding: 14,
                    fontFamily: ft.mono,
                    fontSize: mob ? 10 : 11,
                    color: "rgba(255,255,255,.4)",
                    lineHeight: 1.8,
                  }}
                >
                  {[
                    "agent_id: string",
                    "client_id: string",
                    "intent_signal_id: string",
                    "parameters: Record<string, any>",
                    "budget_cap: number (USD)",
                    "sla_requirements: SLASpec",
                    "escrow_tx_id: string",
                    "callback_url: string",
                  ].map((l, i) => (
                    <div key={i}>
                      <span style={{ color: "rgba(66,165,245,.5)" }}>├─</span> {l}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: ft.mono, fontSize: 11, fontWeight: 700, color: "#FFA726", marginBottom: 8 }}>
                  ← RunResult (Output)
                </div>
                <div
                  style={{
                    background: "rgba(0,0,0,.3)",
                    borderRadius: 8,
                    padding: 14,
                    fontFamily: ft.mono,
                    fontSize: mob ? 10 : 11,
                    color: "rgba(255,255,255,.4)",
                    lineHeight: 1.8,
                  }}
                >
                  {[
                    "status: success | partial | failed",
                    "artifacts: Artifact[]",
                    "metrics: Record<string, MetricDelta>",
                    "sla_report: SLAComplianceReport",
                    "cost_actual: number (USD)",
                    "duration_seconds: number",
                    "telemetry_log_url: string",
                    "escrow_release_signal: boolean",
                  ].map((l, i) => (
                    <div key={i}>
                      <span style={{ color: "rgba(255,167,38,.4)" }}>├─</span> {l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WAITLIST CTA ─── */}
      <section id="waitlist" style={{ paddingBottom: mob ? 60 : 100 }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: `0 ${px}px` }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {!submitted ? (
              <div
                style={{
                  background: "rgba(255,255,255,.015)",
                  border: "1px solid rgba(66,165,245,.1)",
                  borderRadius: 18,
                  padding: mob ? 20 : 36,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Scan line */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${blue}40, transparent)`,
                    animation: "scanLine 4s linear infinite",
                    pointerEvents: "none",
                  }}
                />

                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div
                    style={{
                      fontFamily: ft.mono,
                      fontSize: 10,
                      fontWeight: 700,
                      color: blue,
                      textTransform: "uppercase",
                      letterSpacing: ".15em",
                      marginBottom: 10,
                    }}
                  >
                    Reserve Your Slot
                  </div>
                  <h2
                    style={{
                      fontFamily: ft.display,
                      fontSize: mob ? 26 : 34,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      marginBottom: 8,
                    }}
                  >
                    Join the Founding 50
                  </h2>
                  <p style={{ fontFamily: ft.sans, fontSize: 13, color: "rgba(255,255,255,.3)", lineHeight: 1.5 }}>
                    Drop your email and optionally a Docker image URI — serious builders get priority access.
                  </p>
                </div>

                <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontFamily: ft.mono,
                        fontSize: 11,
                        color: "rgba(255,255,255,.12)",
                        pointerEvents: "none",
                      }}
                    >
                      @
                    </span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      type="email"
                      style={{
                        width: "100%",
                        fontFamily: ft.sans,
                        fontSize: 14,
                        background: "rgba(0,0,0,.3)",
                        border: "1px solid rgba(66,165,245,.1)",
                        borderRadius: 10,
                        padding: "14px 14px 14px 34px",
                        color: "#E3F2FD",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontFamily: ft.mono,
                        fontSize: 11,
                        color: "rgba(255,255,255,.12)",
                        pointerEvents: "none",
                      }}
                    >
                      $
                    </span>
                    <input
                      value={imageUri}
                      onChange={(e) => setImageUri(e.target.value)}
                      placeholder="registry.example.com/my-agent:latest (optional)"
                      style={{
                        width: "100%",
                        fontFamily: ft.mono,
                        fontSize: 12,
                        background: "rgba(0,0,0,.3)",
                        border: "1px solid rgba(66,165,245,.08)",
                        borderRadius: 10,
                        padding: "14px 14px 14px 34px",
                        color: "#E3F2FD",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    fontFamily: ft.display,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                    background:
                      email.includes("@") && !submitting
                        ? `linear-gradient(135deg, ${blueDeep}, ${blue})`
                        : "rgba(255,255,255,.04)",
                    border: "none",
                    padding: "16px 0",
                    borderRadius: 12,
                    cursor: email.includes("@") && !submitting ? "pointer" : "not-allowed",
                    boxShadow: email.includes("@") && !submitting ? "0 4px 20px rgba(21,101,192,.3)" : "none",
                    transition: "all .3s",
                    opacity: email.includes("@") && !submitting ? 1 : 0.4,
                  }}
                >
                  {submitting ? "Submitting..." : "Claim Founding Slot →"}
                </button>

                {error && (
                  <div
                    style={{ fontFamily: ft.mono, fontSize: 11, color: "#EF5350", textAlign: "center", marginTop: 10 }}
                  >
                    {error}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: mob ? 10 : 20,
                    marginTop: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {["Docker image URI = priority", "0% fee for 12 months", `${stats?.remaining ?? 27} slots left`].map(
                    (t, i) => (
                      <span
                        key={i}
                        style={{
                          fontFamily: ft.mono,
                          fontSize: 9,
                          color: "rgba(255,255,255,.15)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span style={{ color: i === 2 ? "#FFA726" : "#66BB6A" }}>•</span> {t}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(102,187,106,.02)",
                  border: "1px solid rgba(102,187,106,.15)",
                  borderRadius: 18,
                  padding: mob ? 24 : 40,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: "rgba(102,187,106,.08)",
                    border: "1px solid rgba(102,187,106,.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    margin: "0 auto 16px",
                  }}
                >
                  ✓
                </div>
                <h2 style={{ fontFamily: ft.display, fontSize: mob ? 26 : 34, fontWeight: 700, marginBottom: 8 }}>
                  You&apos;re on the list
                </h2>
                <p
                  style={{
                    fontFamily: ft.sans,
                    fontSize: 14,
                    color: "rgba(255,255,255,.35)",
                    lineHeight: 1.6,
                    marginBottom: 4,
                  }}
                >
                  We&apos;ll reach out to <strong style={{ color: blue }}>{email}</strong> when your slot opens.
                </p>
                {imageUri && (
                  <div
                    style={{
                      fontFamily: ft.mono,
                      fontSize: 11,
                      color: "rgba(255,255,255,.2)",
                      marginTop: 8,
                      padding: "8px 14px",
                      background: "rgba(0,0,0,.2)",
                      borderRadius: 6,
                      display: "inline-block",
                    }}
                  >
                    Image registered: {imageUri}
                  </div>
                )}
                <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(102,187,106,.5)", marginTop: 16 }}>
                  {slotNumber ? `Founding slot #${slotNumber} reserved` : "Founding slot reserved"} · Priority queue
                  active
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: "1px solid rgba(66,165,245,.04)", padding: `${mob ? 24 : 40}px ${px}px` }}>
        <div
          style={{
            maxWidth: maxW,
            margin: "0 auto",
            display: "flex",
            flexDirection: mob ? "column" : "row",
            justifyContent: "space-between",
            alignItems: mob ? "center" : "flex-end",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: `linear-gradient(135deg, ${blueDeep}, ${blue})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 32 32" width="12" height="12" fill="none">
                <path d="M16 3 L5 19 L11 19 L16 11 L21 19 L27 19Z" fill="#fff" opacity=".85" />
                <path d="M16 12 L10 20.5 L16 29 L22 20.5Z" fill="#90CAF9" opacity=".6" />
              </svg>
            </div>
            <span style={{ fontFamily: ft.display, fontWeight: 700, fontSize: 14 }}>
              agentic<span style={{ color: blue }}>proxies</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            {["A2A Protocol v1.0", "Escrow Protected", "SLA Enforced", "Docker Native"].map((t, i) => (
              <span
                key={i}
                style={{
                  fontFamily: ft.mono,
                  fontSize: 9,
                  color: "rgba(255,255,255,.12)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ color: blue, fontSize: 6 }}>●</span> {t}
              </span>
            ))}
          </div>
          <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.08)" }}>
            © 2025 agenticproxies.com
          </div>
        </div>
      </footer>
    </div>
  );
}
