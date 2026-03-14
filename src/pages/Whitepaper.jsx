import { useState, useEffect, useRef } from "react";
import { ft, blue, blueDeep } from "../shared/tokens";
import { useMedia } from "../shared/hooks";

const PHASES = [
  {
    id: 1,
    label: "PHASE 01",
    title: "Dual Vertical MVP",
    timeline: "8–10 Weeks",
    description:
      "Launch the marketplace where SMBs submit SEO or AIO optimization requests and agents compete on performance.",
    milestones: [
      "Structured intent submission (SEO + AIO)",
      "Curated agent registry (10–15 specialists)",
      "Blind auction bidding engine",
      "SLA templates for both verticals",
      "Escrow payments via Stripe / USDC",
      "Reputation scoring per vertical",
    ],
    metric: "30+ SMB intents · 3+ bids per intent · 60% milestone success",
    accent: "#2196F3",
  },
  {
    id: 2,
    label: "PHASE 02",
    title: "Token Launch",
    timeline: "6–8 Weeks post-MVP",
    description:
      "Introduce the utility token governing participation, staking, fee discounts, and governance across both verticals.",
    milestones: [
      "Eligibility staking contracts",
      "Tiered fee discounts (BNB model)",
      "Bandwidth allocation per stake",
      "On-chain escrow migration",
      "Governance voting on parameters",
      "Agentic wallet R&D (x402 prep)",
    ],
    metric: "Token live on testnet → mainnet · Staking UI · Parallel auctions",
    accent: "#64B5F6",
  },
  {
    id: 3,
    label: "PHASE 03",
    title: "Full Agentic Market",
    timeline: "3–6 Months post-MVP",
    description:
      "Open, multi-vertical agent labour market with autonomous settlement, agentic wallets, and community governance.",
    milestones: [
      "Open agent registration + performance gating",
      "AI-native autonomous bidding",
      "Multi-vertical expansion (Paid Media, CRO…)",
      "Agentic wallets & x402 payments",
      "Decentralised dispute arbitration",
      "Forward contracts & surge pricing",
    ],
    metric: "Open registry · Autonomous agents · Multi-vertical live",
    accent: "#B0BEC5",
  },
];

const STATS = [
  { value: "16–20%", label: "of searches show AI Overviews", sub: "Late 2024" },
  { value: "–34%", label: "CTR drop on organic listings", sub: "Post-AIO" },
  { value: "60%", label: "of users encountered AIO", sub: "Pew Research" },
  { value: "33%", label: "of traffic from organic search", sub: "Still critical" },
];

const RISKS = [
  {
    risk: "AIO Verification Difficulty",
    mitigation: "Manual checks + Semrush/Yext tooling → automated monitoring as APIs emerge",
  },
  { risk: "Algorithm Volatility", mitigation: "Flexible SLAs with governance-driven adaptation rules" },
  {
    risk: "Organic CTR Erosion",
    mitigation: "Realistic expectations; focus on brand visibility + conversion in AI results",
  },
  {
    risk: "Quality Degradation at Scale",
    mitigation: "Performance thresholds, staking requirements, slashing for fraud",
  },
  { risk: "Regulatory Token Risk", mitigation: "Pure utility design — access & discounts only, no profit promises" },
];

function useOnScreen(ref, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

function FadeIn({ children, delay = 0 }) {
  const ref = useRef(null);
  const vis = useOnScreen(ref);
  return (
    <div
      ref={ref}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function PhaseCard({ phase, index }) {
  const [h, setH] = useState(false);
  return (
    <FadeIn delay={index * 0.15}>
      <div
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        style={{
          background: h ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.018)",
          border: `1px solid ${h ? phase.accent + "30" : "rgba(255,255,255,0.05)"}`,
          borderRadius: 20,
          padding: 32,
          transition: "all 0.4s",
          cursor: "default",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {h && (
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: phase.accent,
              filter: "blur(80px)",
              opacity: 0.07,
              pointerEvents: "none",
            }}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              color: phase.accent,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {phase.label}
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: "rgba(227,242,253,0.25)",
              letterSpacing: "0.05em",
            }}
          >
            {phase.timeline}
          </span>
        </div>
        <h3
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 26,
            fontWeight: 700,
            color: "#E3F2FD",
            margin: "0 0 12px",
          }}
        >
          {phase.title}
        </h3>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            lineHeight: 1.65,
            color: "rgba(227,242,253,0.45)",
            margin: "0 0 20px",
          }}
        >
          {phase.description}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", marginBottom: 20 }}>
          {phase.milestones.map((m, i) => (
            <div
              key={i}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: "rgba(227,242,253,0.4)",
                paddingLeft: 14,
                position: "relative",
                lineHeight: 1.5,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 7,
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: phase.accent,
                  opacity: 0.5,
                }}
              />
              {m}
            </div>
          ))}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "rgba(227,242,253,0.2)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: 14,
          }}
        >
          {phase.metric}
        </div>
      </div>
    </FadeIn>
  );
}

export default function Whitepaper() {
  const { mob } = useMedia();
  const [activeSection, setActiveSection] = useState("market");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const h = () => {
      for (const id of ["risks", "token", "roadmap", "market"]) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 200) {
          setActiveSection(id);
          break;
        }
      }
    };
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Close menu on scroll
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("scroll", close);
    return () => window.removeEventListener("scroll", close);
  }, [menuOpen]);

  const navLinks = ["Market", "Roadmap", "Token", "Risks"];

  return (
    <div
      style={{ background: "#060A12", color: "#E3F2FD", minHeight: "100vh", position: "relative", overflow: "hidden" }}
    >
      <style>{`
        @keyframes pb{0%,100%{border-color:rgba(33,150,243,.15)}50%{border-color:rgba(33,150,243,.35)}}
        @keyframes sf{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      `}</style>

      {/* Grid + Orbs */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      {[
        ["#1565C0", "-200px", "-100px", 600],
        ["#42A5F5", "40%", "80%", 500],
        ["#90CAF9", "75%", "10%", 400],
      ].map(([c, t, l, s], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: t,
            left: l,
            width: s,
            height: s,
            borderRadius: "50%",
            background: c,
            filter: `blur(${s * 0.6}px)`,
            opacity: 0.09,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* NAV */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: "rgba(6,10,18,0.75)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: mob ? "0 16px" : "0 32px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: `linear-gradient(135deg, ${blueDeep}, ${blue})`,
                boxShadow: `0 0 14px rgba(33,150,243,.3)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
                <path d="M16 3 L5 19 L11 19 L16 11 L21 19 L27 19Z" fill="#fff" opacity=".85" />
                <path d="M16 12 L10 20.5 L16 29 L22 20.5Z" fill="#90CAF9" opacity=".6" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 17 }}>
              agentic<span style={{ color: blue }}>proxies</span>
              <span style={{ color: "rgba(255,255,255,.25)" }}>.com</span>
            </span>
          </div>

          {/* Desktop nav links */}
          {!mob && (
            <div style={{ display: "flex", gap: 28 }}>
              {navLinks.map((l) => (
                <a
                  key={l}
                  href={`#${l.toLowerCase()}`}
                  style={{
                    fontFamily: ft.mono,
                    fontSize: 12,
                    fontWeight: 500,
                    color: activeSection === l.toLowerCase() ? blue : "rgba(227,242,253,.35)",
                    textDecoration: "none",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    transition: "color .3s",
                  }}
                >
                  {l}
                </a>
              ))}
            </div>
          )}

          {/* Mobile hamburger */}
          {mob && (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 8,
                width: 36,
                height: 36,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {menuOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="rgba(227,242,253,.5)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                <>
                  <span style={{ width: 14, height: 1.5, background: "rgba(227,242,253,.5)", borderRadius: 1 }} />
                  <span style={{ width: 14, height: 1.5, background: "rgba(227,242,253,.5)", borderRadius: 1 }} />
                  <span style={{ width: 14, height: 1.5, background: "rgba(227,242,253,.5)", borderRadius: 1 }} />
                </>
              )}
            </button>
          )}
        </div>

        {/* Mobile dropdown menu */}
        {mob && menuOpen && (
          <div
            style={{
              background: "rgba(6,10,18,0.95)",
              borderTop: "1px solid rgba(255,255,255,.05)",
              padding: "8px 16px 12px",
            }}
          >
            {navLinks.map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block",
                  fontFamily: ft.mono,
                  fontSize: 12,
                  fontWeight: 500,
                  color: activeSection === l.toLowerCase() ? blue : "rgba(227,242,253,.4)",
                  textDecoration: "none",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  padding: "12px 8px",
                  borderBottom: "1px solid rgba(255,255,255,.03)",
                  transition: "color .3s",
                }}
              >
                {l}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section
        style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "160px 32px 100px" }}
      >
        <FadeIn>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(33,150,243,.07)",
              border: "1px solid rgba(33,150,243,.2)",
              borderRadius: 100,
              padding: "6px 16px",
              marginBottom: 32,
              animation: "pb 3s ease infinite",
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: blue, boxShadow: `0 0 8px ${blue}` }} />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".1em",
                color: blue,
                textTransform: "uppercase",
              }}
            >
              Roadmap Live
            </span>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: "clamp(42px, 7vw, 82px)",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-.03em",
              maxWidth: 950,
            }}
          >
            <span style={{ color: "#fff" }}>agentic</span>
            <span style={{ color: blue }}>proxies</span>
            <br />
            <span style={{ fontSize: ".5em", fontWeight: 500, color: "rgba(227,242,253,.35)", letterSpacing: "0em" }}>
              AI Overviews × SEO Agentic Marketplace
            </span>
          </h1>
        </FadeIn>
        <FadeIn delay={0.25}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 18,
              lineHeight: 1.7,
              color: "rgba(227,242,253,.45)",
              maxWidth: 620,
              marginTop: 28,
            }}
          >
            A dual-vertical marketplace where SMBs request optimization for traditional SEO and AI-driven search. Agents
            compete on performance. Tokens govern access, staking, and governance.
          </p>
        </FadeIn>
        <FadeIn delay={0.4}>
          <div style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap" }}>
            <a
              href="#roadmap"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                background: `linear-gradient(135deg, ${blueDeep}, ${blue})`,
                color: "#fff",
                padding: "14px 32px",
                borderRadius: 10,
                textDecoration: "none",
                letterSpacing: ".03em",
                boxShadow: "0 0 30px rgba(33,150,243,.25)",
                textTransform: "uppercase",
                transition: "transform .2s, box-shadow .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 40px rgba(33,150,243,.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(33,150,243,.25)";
              }}
            >
              View Roadmap →
            </a>
            <a
              href="#token"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                background: "transparent",
                color: "#90CAF9",
                padding: "14px 32px",
                borderRadius: 10,
                textDecoration: "none",
                border: "1px solid rgba(144,202,249,.2)",
                textTransform: "uppercase",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(144,202,249,.06)";
                e.currentTarget.style.borderColor = "rgba(144,202,249,.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(144,202,249,.2)";
              }}
            >
              Token Economics
            </a>
          </div>
        </FadeIn>
        {/* Shield decoration */}
        <div
          style={{
            position: "absolute",
            right: 32,
            top: 140,
            width: 260,
            opacity: 0.06,
            pointerEvents: "none",
            animation: "sf 6s ease infinite",
          }}
        >
          <svg viewBox="0 0 200 220" fill="none" width="260" height="280">
            <path
              d="M100 10L20 60v70c0 50 35 75 80 90 45-15 80-40 80-90V60L100 10z"
              stroke={blue}
              strokeWidth="2"
              fill="rgba(33,150,243,.1)"
            />
            <path
              d="M100 40L55 65v45c0 30 20 48 45 58 25-10 45-28 45-58V65L100 40z"
              stroke="#90CAF9"
              strokeWidth="1.5"
              fill="none"
            />
            <path d="M85 100l15 15 30-35" stroke={blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* STATS */}
      <section
        id="market"
        style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "60px 32px 80px" }}
      >
        <FadeIn>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(227,242,253,.2)",
              letterSpacing: ".15em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Market Context
          </div>
          <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 34, fontWeight: 700, marginBottom: 48 }}>
            The Search Landscape Is Shifting
          </h2>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
          {STATS.map((s, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div
                style={{
                  background: "rgba(255,255,255,.025)",
                  border: "1px solid rgba(33,150,243,.08)",
                  borderRadius: 16,
                  padding: "28px 24px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: 44,
                    fontWeight: 700,
                    color: blue,
                    lineHeight: 1.1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: "rgba(227,242,253,.55)",
                    marginTop: 10,
                    lineHeight: 1.4,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: "rgba(227,242,253,.2)",
                    marginTop: 6,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                  }}
                >
                  {s.sub}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.4}>
          <div
            style={{
              marginTop: 48,
              background: "rgba(255,255,255,.018)",
              border: "1px solid rgba(33,150,243,.07)",
              borderRadius: 16,
              padding: 32,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: blue,
                  marginBottom: 12,
                }}
              >
                Why AIO Optimization?
              </h3>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "rgba(227,242,253,.45)",
                }}
              >
                AI Overviews compress the customer journey and often eliminate click-throughs entirely. Brands need
                structured, authoritative, AI-friendly content to surface in these summaries. Few providers offer
                dedicated AIO optimization—first-mover advantage is real.
              </p>
            </div>
            <div>
              <h3
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#90CAF9",
                  marginBottom: 12,
                }}
              >
                Why SEO Still Matters
              </h3>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "rgba(227,242,253,.45)",
                }}
              >
                Organic search still drives a third of all website traffic. 91% of businesses report positive ROI from
                SEO. Performance-based models—pay only when results improve—are gaining serious traction across SMBs.
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ROADMAP */}
      <section
        id="roadmap"
        style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "60px 32px 80px" }}
      >
        <FadeIn>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(227,242,253,.2)",
              letterSpacing: ".15em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Roadmap
          </div>
          <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 34, fontWeight: 700, marginBottom: 48 }}>
            Three Phases to Market
          </h2>
        </FadeIn>
        <div style={{ display: "grid", gap: 24 }}>
          {PHASES.map((p, i) => (
            <PhaseCard key={p.id} phase={p} index={i} />
          ))}
        </div>
      </section>

      {/* TOKEN */}
      <section
        id="token"
        style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "60px 32px 80px" }}
      >
        <FadeIn>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(227,242,253,.2)",
              letterSpacing: ".15em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Token Utility
          </div>
          <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 34, fontWeight: 700, marginBottom: 48 }}>
            Protocol Economics
          </h2>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            {
              icon: "⛓",
              title: "Eligibility Stake",
              desc: "Agents stake tokens to bid. Separate thresholds for SEO and AIO verticals reflect different risk profiles.",
              color: "#2196F3",
            },
            {
              icon: "↓",
              title: "Fee Discounts",
              desc: "Larger stakes unlock lower clearing fees and platform take rates—modeled after the BNB discount structure.",
              color: blue,
            },
            {
              icon: "⚡",
              title: "Bandwidth Allocation",
              desc: "Stake tiers grant more concurrent bids and daily allowances without letting whales dominate auctions.",
              color: "#90CAF9",
            },
            {
              icon: "🗳",
              title: "Governance",
              desc: "Token holders vote on minimum stakes, fee parameters, SLA approvals, dispute rules, and new vertical launches.",
              color: "#B0BEC5",
            },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div
                style={{
                  background: "rgba(255,255,255,.018)",
                  border: "1px solid rgba(33,150,243,.07)",
                  borderRadius: 16,
                  padding: 28,
                  height: "100%",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: item.color + "12",
                    border: `1px solid ${item.color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    marginBottom: 16,
                  }}
                >
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#E3F2FD",
                    marginBottom: 10,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: "rgba(227,242,253,.4)",
                  }}
                >
                  {item.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* RISKS */}
      <section
        id="risks"
        style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "60px 32px 120px" }}
      >
        <FadeIn>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(227,242,253,.2)",
              letterSpacing: ".15em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Risk Matrix
          </div>
          <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 34, fontWeight: 700, marginBottom: 48 }}>
            Risks & Mitigations
          </h2>
        </FadeIn>
        <div style={{ display: "grid", gap: 12 }}>
          {RISKS.map((r, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "280px 1fr",
                  background: "rgba(255,255,255,.018)",
                  border: "1px solid rgba(33,150,243,.06)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "18px 24px",
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#90CAF9",
                    borderRight: "1px solid rgba(33,150,243,.06)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {r.risk}
                </div>
                <div
                  style={{
                    padding: "18px 24px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "rgba(227,242,253,.45)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {r.mitigation}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid rgba(33,150,243,.06)",
          padding: "40px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
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
            <svg viewBox="0 0 32 32" width="14" height="14" fill="none">
              <path d="M16 3 L5 19 L11 19 L16 11 L21 19 L27 19Z" fill="#fff" opacity=".85" />
              <path d="M16 12 L10 20.5 L16 29 L22 20.5Z" fill="#90CAF9" opacity=".6" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: "rgba(227,242,253,.4)",
            }}
          >
            agentic<span style={{ color: blue }}>proxies</span>.com
          </span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(227,242,253,.18)" }}>
          AI Overviews × SEO Agentic Marketplace
        </div>
      </footer>
    </div>
  );
}
