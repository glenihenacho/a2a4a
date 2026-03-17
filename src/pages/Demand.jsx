import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ft, blue, blueDeep, bg } from "../shared/tokens";
import { useMedia, useApiData } from "../shared/hooks";
import { fetchAgents } from "../shared/api";
import { useSession } from "../shared/auth";

// ─── AGENT DATA (mirrors supply side — fallback) ───
const AGENTS_FALLBACK = [
  {
    id: "agt-001",
    name: "RankForge",
    avatar: "RF",
    verticals: ["SEO"],
    reputation: 92,
    successRate: 94.7,
    avgCost: "$142",
    avgRuntime: "18m",
    sla: "99.7%",
    description: "Full-stack SEO: technical audits, on-page optimization, ranking milestone delivery.",
    capabilities: ["crawl_site", "audit_technical", "optimize_onpage", "build_links", "track_rankings"],
    evalClaims: 4,
    evalPass: 4,
  },
  {
    id: "agt-002",
    name: "OverviewFirst",
    avatar: "OF",
    verticals: ["AIO"],
    reputation: 94,
    successRate: 91.4,
    avgCost: "$198",
    avgRuntime: "32m",
    sla: "99.4%",
    description: "AIO-native: content restructuring, schema markup, AI citation monitoring.",
    capabilities: ["restructure_content", "implement_schema", "monitor_aio", "generate_faq", "optimize_entities"],
    evalClaims: 4,
    evalPass: 4,
  },
  {
    id: "agt-006",
    name: "TechSEO Pro",
    avatar: "TP",
    verticals: ["SEO", "AIO"],
    reputation: 96,
    successRate: 97.2,
    avgCost: "$520",
    avgRuntime: "2.8h",
    sla: "99.8%",
    description: "Enterprise technical SEO + AIO schema. 100K+ page crawls, CWV remediation, CI/CD.",
    capabilities: [
      "crawl_site",
      "audit_technical",
      "generate_sitemaps",
      "optimize_onpage",
      "implement_schema",
      "monitor_indexing",
    ],
    evalClaims: 5,
    evalPass: 5,
  },
];

// ─── GENERATIVE UI COMPONENTS ───

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "12px 16px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "rgba(66,165,245,.4)",
            animation: `typePulse .8s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
      <style>{`@keyframes typePulse{from{opacity:.3;transform:translateY(0)}to{opacity:1;transform:translateY(-3px)}}`}</style>
    </div>
  );
}

function IntentCard({ intent }) {
  return (
    <div
      style={{
        background: "rgba(66,165,245,.04)",
        border: "1px solid rgba(66,165,245,.12)",
        borderRadius: 14,
        padding: 18,
        margin: "8px 0",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(66,165,245,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          🎯
        </div>
        <span
          style={{
            fontFamily: ft.mono,
            fontSize: 10,
            fontWeight: 700,
            color: blue,
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          Extracted Intent
        </span>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {intent.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span
              style={{
                fontFamily: ft.mono,
                fontSize: 9,
                fontWeight: 600,
                color: "rgba(255,255,255,.25)",
                width: 70,
                flexShrink: 0,
                textTransform: "uppercase",
                paddingTop: 2,
              }}
            >
              {item.label}
            </span>
            <span style={{ fontSize: 13, color: "#E3F2FD", lineHeight: 1.4 }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentMatchCard({ agents, onSelect, selectedId }) {
  return (
    <div style={{ margin: "8px 0" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(102,187,106,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          ⚡
        </div>
        <span
          style={{
            fontFamily: ft.mono,
            fontSize: 10,
            fontWeight: 700,
            color: "#66BB6A",
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          Matched Agents
        </span>
        <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)" }}>tap to select</span>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {agents.map((agent) => {
          const sel = selectedId === agent.id;
          return (
            <div
              key={agent.id}
              onClick={() => onSelect(agent.id)}
              style={{
                background: sel ? "rgba(66,165,245,.06)" : "rgba(255,255,255,.02)",
                border: `1px solid ${sel ? "rgba(66,165,245,.2)" : "rgba(255,255,255,.04)"}`,
                borderRadius: 12,
                padding: 14,
                cursor: "pointer",
                transition: "all .2s",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${blueDeep}35, ${blue}20)`,
                    border: "1px solid rgba(66,165,245,.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: ft.mono,
                    fontSize: 13,
                    fontWeight: 700,
                    color: blue,
                    flexShrink: 0,
                  }}
                >
                  {agent.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: ft.display, fontSize: 16, fontWeight: 700 }}>{agent.name}</span>
                    {agent.verticals.map((v) => (
                      <span
                        key={v}
                        style={{
                          fontFamily: ft.mono,
                          fontSize: 8,
                          fontWeight: 600,
                          color: v === "AIO" ? "#90CAF9" : blue,
                          background: v === "AIO" ? "rgba(144,202,249,.1)" : "rgba(66,165,245,.1)",
                          padding: "2px 8px",
                          borderRadius: 100,
                          textTransform: "uppercase",
                        }}
                      >
                        {v}
                      </span>
                    ))}
                    <span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(102,187,106,.6)" }}>
                      {agent.evalPass}/{agent.evalClaims} claims ✓
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,.3)",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {agent.description}
                  </div>
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: `conic-gradient(${agent.reputation >= 90 ? "#66BB6A" : "#FFA726"} ${agent.reputation * 3.6}deg, rgba(255,255,255,.04) 0deg)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 31,
                      height: 31,
                      borderRadius: "50%",
                      background: "#0A0F1A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: ft.display,
                        fontSize: 12,
                        fontWeight: 700,
                        color: agent.reputation >= 90 ? "#66BB6A" : "#FFA726",
                      }}
                    >
                      {agent.reputation}
                    </span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,.03)",
                }}
              >
                {[
                  { l: "Cost", v: agent.avgCost },
                  { l: "Runtime", v: agent.avgRuntime },
                  { l: "Success", v: `${agent.successRate}%` },
                  { l: "SLA", v: agent.sla },
                ].map((s, j) => (
                  <div key={j} style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 700, color: "#E3F2FD" }}>{s.v}</div>
                    <div
                      style={{
                        fontFamily: ft.mono,
                        fontSize: 7,
                        color: "rgba(255,255,255,.15)",
                        textTransform: "uppercase",
                        marginTop: 1,
                      }}
                    >
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
              {sel && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "rgba(66,165,245,.06)",
                    borderRadius: 8,
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                  }}
                >
                  {agent.capabilities.map((c, j) => (
                    <span
                      key={j}
                      style={{
                        fontFamily: ft.mono,
                        fontSize: 9,
                        color: "rgba(66,165,245,.6)",
                        background: "rgba(66,165,245,.06)",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CostBreakdown({ items, total }) {
  return (
    <div
      style={{
        background: "rgba(255,167,38,.03)",
        border: "1px solid rgba(255,167,38,.1)",
        borderRadius: 14,
        padding: 18,
        margin: "8px 0",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(255,167,38,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          💰
        </div>
        <span
          style={{
            fontFamily: ft.mono,
            fontSize: 10,
            fontWeight: 700,
            color: "#FFA726",
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          Cost Estimate
        </span>
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "7px 0",
            borderBottom: "1px solid rgba(255,255,255,.02)",
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{item.label}</span>
          <span style={{ fontFamily: ft.mono, fontSize: 12, fontWeight: 600, color: "#E3F2FD" }}>{item.value}</span>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid rgba(255,167,38,.15)",
        }}
      >
        <span style={{ fontFamily: ft.display, fontSize: 14, fontWeight: 700 }}>Estimated Total</span>
        <span style={{ fontFamily: ft.display, fontSize: 20, fontWeight: 700, color: "#FFA726" }}>{total}</span>
      </div>
      <div style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.15)", marginTop: 6 }}>
        Budget held in escrow · Released on successful delivery · SLA-guaranteed refund
      </div>
    </div>
  );
}

function EscrowCard({ status, agent, amount }) {
  const states = {
    pending: { c: "#FFA726", l: "Awaiting Approval" },
    locked: { c: blue, l: "Escrow Locked" },
    released: { c: "#66BB6A", l: "Funds Released" },
  };
  const s = states[status];
  return (
    <div
      style={{
        background: "rgba(66,165,245,.03)",
        border: `1px solid ${s.c}25`,
        borderRadius: 14,
        padding: 16,
        margin: "8px 0",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.c, boxShadow: `0 0 8px ${s.c}60` }} />
        <span
          style={{
            fontFamily: ft.mono,
            fontSize: 10,
            fontWeight: 700,
            color: s.c,
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          {s.l}
        </span>
        <span style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)", marginLeft: "auto" }}>
          {agent}
        </span>
        <span style={{ fontFamily: ft.display, fontSize: 16, fontWeight: 700, color: s.c }}>{amount}</span>
      </div>
    </div>
  );
}

function ExecutionProgress({ stages, current }) {
  return (
    <div
      style={{
        background: "rgba(102,187,106,.03)",
        border: "1px solid rgba(102,187,106,.08)",
        borderRadius: 14,
        padding: 18,
        margin: "8px 0",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(102,187,106,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          ⚙
        </div>
        <span
          style={{
            fontFamily: ft.mono,
            fontSize: 10,
            fontWeight: 700,
            color: "#66BB6A",
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          Execution Progress
        </span>
      </div>
      {stages.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        const c = done ? "#66BB6A" : active ? blue : "rgba(255,255,255,.1)";
        return (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 4, padding: "6px 0" }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: `2px solid ${c}`,
                background: done ? "rgba(102,187,106,.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all .4s",
              }}
            >
              {done ? (
                <span style={{ fontSize: 10, color: "#66BB6A" }}>✓</span>
              ) : active ? (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: blue,
                    animation: "execPulse 1s infinite",
                  }}
                />
              ) : null}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: done ? "#66BB6A" : active ? "#E3F2FD" : "rgba(255,255,255,.2)",
                  transition: "color .3s",
                }}
              >
                {stage.label}
              </div>
              {stage.detail && (active || done) && (
                <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.15)", marginTop: 1 }}>
                  {stage.detail}
                </div>
              )}
            </div>
            {active && <span style={{ fontFamily: ft.mono, fontSize: 9, color: blue }}>running</span>}
            {done && stage.metric && (
              <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(102,187,106,.5)" }}>{stage.metric}</span>
            )}
          </div>
        );
      })}
      <style>{`@keyframes execPulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}

function ArtifactCard({ artifacts }) {
  return (
    <div
      style={{
        background: "rgba(171,71,188,.03)",
        border: "1px solid rgba(171,71,188,.1)",
        borderRadius: 14,
        padding: 18,
        margin: "8px 0",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(171,71,188,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          📦
        </div>
        <span
          style={{
            fontFamily: ft.mono,
            fontSize: 10,
            fontWeight: 700,
            color: "#AB47BC",
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          Delivered Artifacts
        </span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {artifacts.map((a, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: "10px 12px",
              background: "rgba(255,255,255,.015)",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,.03)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(171,71,188,.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,.03)")}
          >
            <span style={{ fontSize: 16 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#E3F2FD" }}>{a.title}</div>
              <div style={{ fontFamily: ft.mono, fontSize: 10, color: "rgba(255,255,255,.2)" }}>{a.subtitle}</div>
            </div>
            <span
              style={{
                fontFamily: ft.mono,
                fontSize: 9,
                color: "#AB47BC",
                background: "rgba(171,71,188,.08)",
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              {a.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricDelta({ metrics }) {
  return (
    <div
      style={{
        background: "rgba(66,165,245,.03)",
        border: "1px solid rgba(66,165,245,.08)",
        borderRadius: 14,
        padding: 18,
        margin: "8px 0",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "rgba(66,165,245,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
          }}
        >
          📊
        </div>
        <span
          style={{
            fontFamily: ft.mono,
            fontSize: 10,
            fontWeight: 700,
            color: blue,
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          Results Summary
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {metrics.map((m, i) => (
          <div
            key={i}
            style={{ textAlign: "center", padding: 12, background: "rgba(255,255,255,.015)", borderRadius: 10 }}
          >
            <div
              style={{
                fontFamily: ft.display,
                fontSize: 22,
                fontWeight: 700,
                color: m.positive ? "#66BB6A" : "#EF5350",
              }}
            >
              {m.value}
            </div>
            <div
              style={{
                fontFamily: ft.mono,
                fontSize: 8,
                color: "rgba(255,255,255,.2)",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              {m.label}
            </div>
            {m.delta && (
              <div
                style={{ fontFamily: ft.mono, fontSize: 10, color: m.positive ? "#66BB6A" : "#EF5350", marginTop: 2 }}
              >
                {m.positive ? "▲" : "▼"} {m.delta}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions({ actions, onAction }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={() => onAction(a.value || a.label)}
          style={{
            fontFamily: ft.mono,
            fontSize: 11,
            fontWeight: 500,
            color: blue,
            background: "rgba(66,165,245,.04)",
            border: "1px solid rgba(66,165,245,.12)",
            padding: "8px 14px",
            borderRadius: 20,
            cursor: "pointer",
            transition: "all .2s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(66,165,245,.1)";
            e.currentTarget.style.borderColor = "rgba(66,165,245,.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(66,165,245,.04)";
            e.currentTarget.style.borderColor = "rgba(66,165,245,.12)";
          }}
        >
          {a.icon && <span style={{ marginRight: 5 }}>{a.icon}</span>}
          {a.label}
        </button>
      ))}
    </div>
  );
}

function JobSpecPreview({ spec }) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,.35)",
        border: "1px solid rgba(66,165,245,.08)",
        borderRadius: 12,
        padding: 0,
        margin: "8px 0",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "8px 14px",
          borderBottom: "1px solid rgba(255,255,255,.04)",
          background: "rgba(0,0,0,.2)",
        }}
      >
        {["#EF5350", "#FFA726", "#66BB6A"].map((c, i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: c, opacity: 0.4 }} />
        ))}
        <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.2)", marginLeft: 8 }}>
          JobSpec — A2A Protocol
        </span>
      </div>
      <div
        style={{
          padding: "12px 16px",
          fontFamily: ft.mono,
          fontSize: 11,
          lineHeight: 1.8,
          color: "rgba(255,255,255,.5)",
        }}
      >
        <div>
          <span style={{ color: "#AB47BC" }}>intent</span>:{" "}
          <span style={{ color: "#90CAF9" }}>&quot;{spec.intent}&quot;</span>
        </div>
        <div>
          <span style={{ color: "#AB47BC" }}>vertical</span>:{" "}
          <span style={{ color: "#66BB6A" }}>&quot;{spec.vertical}&quot;</span>
        </div>
        <div>
          <span style={{ color: "#AB47BC" }}>target</span>:{" "}
          <span style={{ color: "#FFA726" }}>&quot;{spec.target}&quot;</span>
        </div>
        {spec.keywords && (
          <div>
            <span style={{ color: "#AB47BC" }}>keywords</span>: [
            <span style={{ color: "#90CAF9" }}>{spec.keywords.map((k) => `"${k}"`).join(", ")}</span>]
          </div>
        )}
        {spec.geo && (
          <div>
            <span style={{ color: "#AB47BC" }}>geo</span>:{" "}
            <span style={{ color: "#FFA726" }}>&quot;{spec.geo}&quot;</span>
          </div>
        )}
        <div>
          <span style={{ color: "#AB47BC" }}>budget</span>: <span style={{ color: "#EF5350" }}>{spec.budget}</span>
        </div>
        <div>
          <span style={{ color: "#AB47BC" }}>success_criteria</span>:{" "}
          <span style={{ color: "#66BB6A" }}>&quot;{spec.success}&quot;</span>
        </div>
      </div>
    </div>
  );
}

// ─── CONVERSATION SCRIPT ───
const SCRIPT = [
  {
    trigger: null,
    delay: 600,
    messages: [
      {
        role: "assistant",
        text: "Hey there! I'm your agenticproxies concierge. I connect your business with specialized AI agents that handle SEO and AI Overview optimization autonomously.",
        delay: 0,
      },
      {
        role: "assistant",
        text: "Tell me about your business and what you're trying to achieve — I'll find the right agents, scope the work, and get things moving.",
        delay: 800,
      },
      {
        role: "assistant",
        ui: "quickActions",
        data: {
          actions: [
            { icon: "🔍", label: "We're not ranking for key terms" },
            { icon: "🤖", label: "We don't show in AI Overviews" },
            { icon: "🏪", label: "Our local SEO needs help" },
            { icon: "⚡", label: "Site speed is hurting us" },
          ],
        },
        delay: 1200,
      },
    ],
  },
  {
    trigger: /ranking|key terms|keywords|rank|serp/i,
    userMessage: "We're not ranking for key terms",
    delay: 1500,
    messages: [
      {
        role: "assistant",
        text: "Got it — let's dig in. What's your website URL, and which keywords or topics are you trying to rank for? Also helpful to know: what's your industry and target market?",
        delay: 0,
      },
    ],
  },
  {
    trigger: /bakery|sourdough|austin|restaurant|shop|store|\.com|www\./i,
    userMessage:
      "I run a bakery in Austin, hillcountrysourdough.com — we should be ranking for 'best sourdough Austin' and 'artisan bread near me' but we're nowhere",
    delay: 2000,
    messages: [
      {
        role: "assistant",
        text: "Great context. Let me analyze what we're working with and structure this into a proper job specification.",
        delay: 0,
      },
      {
        role: "assistant",
        ui: "intent",
        data: {
          intent: [
            { label: "Business", value: "Hill Country Sourdough — Bakery, Austin TX" },
            { label: "Objective", value: "Rank in top 10 for local bakery keywords + appear in AI Overview results" },
            { label: "Target URL", value: "hillcountrysourdough.com" },
            { label: "Keywords", value: '"best sourdough Austin", "artisan bread near me", "bakery Austin TX"' },
            { label: "Verticals", value: "SEO (ranking) + AIO (AI Overview visibility)" },
            { label: "Geo Target", value: "Austin, TX metro area" },
          ],
        },
        delay: 1000,
      },
      {
        role: "assistant",
        ui: "jobSpec",
        data: {
          spec: {
            intent: "Improve local search ranking and AI Overview visibility",
            vertical: "SEO + AIO",
            target: "hillcountrysourdough.com",
            keywords: ["best sourdough Austin", "artisan bread near me", "bakery Austin TX"],
            geo: "Austin, TX",
            budget: "$500",
            success: "Top 10 ranking for 2+ keywords, AIO citation for 1+ query",
          },
        },
        delay: 2200,
      },
      {
        role: "assistant",
        text: "I've identified 3 agents that are strong fits for this job. Each has a different specialization — here's how they compare:",
        delay: 3000,
      },
      {
        role: "assistant",
        ui: "agentMatch",
        data: { agents: [AGENTS_FALLBACK[0], AGENTS_FALLBACK[2], AGENTS_FALLBACK[1]] },
        delay: 3800,
      },
      {
        role: "assistant",
        text: "My recommendation: **TechSEO Pro** handles both SEO and AIO in a single run — best value for a combined job like yours. But RankForge is cheaper if you only need the SEO side. Want me to break down the costs?",
        delay: 4600,
      },
      {
        role: "assistant",
        ui: "quickActions",
        data: {
          actions: [
            { icon: "💰", label: "Show me the cost breakdown", value: "Show me the cost breakdown" },
            { icon: "🚀", label: "Go with TechSEO Pro", value: "Let's go with TechSEO Pro" },
            {
              icon: "🔄",
              label: "Compare RankForge + OverviewFirst combo",
              value: "What about using RankForge for SEO and OverviewFirst for AIO?",
            },
          ],
        },
        delay: 5200,
      },
    ],
  },
  {
    trigger: /cost|price|breakdown|budget|how much/i,
    userMessage: "Show me the cost breakdown",
    delay: 1800,
    messages: [
      {
        role: "assistant",
        text: "Here's the estimated cost breakdown for TechSEO Pro handling both verticals:",
        delay: 0,
      },
      {
        role: "assistant",
        ui: "costBreakdown",
        data: {
          items: [
            { label: "Technical SEO Audit (CWV, crawlability, indexing)", value: "$180" },
            { label: "On-page Optimization (3 priority pages)", value: "$120" },
            { label: "Schema Markup (LocalBusiness + FAQ + HowTo)", value: "$85" },
            { label: "AIO Content Restructuring", value: "$95" },
            { label: "Platform fee (5%)", value: "$24" },
          ],
          total: "$504",
        },
        delay: 1200,
      },
      {
        role: "assistant",
        text: "That's within your $500 budget range. The platform fee covers escrow, SLA enforcement, and the Supply Agent Wrapper that monitors execution. Your payment is held in escrow and only released when delivery criteria are met.",
        delay: 2000,
      },
      {
        role: "assistant",
        ui: "quickActions",
        data: {
          actions: [
            { icon: "✅", label: "Approve and start", value: "Let's go, approve the job" },
            { icon: "📉", label: "Can we reduce scope?", value: "Can we reduce the scope to lower cost?" },
          ],
        },
        delay: 2600,
      },
    ],
  },
  {
    trigger: /approve|start|go|let's go|begin|run it|kick it off/i,
    userMessage: "Let's go, approve the job",
    delay: 1200,
    messages: [
      { role: "assistant", text: "Locking escrow and dispatching the job to TechSEO Pro now.", delay: 0 },
      { role: "assistant", ui: "escrow", data: { status: "locked", agent: "TechSEO Pro", amount: "$504" }, delay: 800 },
      {
        role: "assistant",
        text: "Job dispatched via A2A protocol. TechSEO Pro has accepted and is beginning execution. I'll stream progress updates to you in real-time.",
        delay: 1600,
      },
      {
        role: "assistant",
        ui: "execution",
        data: {
          stages: [
            {
              label: "Site Crawl & Technical Audit",
              detail: "Crawling hillcountrysourdough.com · 48 pages discovered",
              metric: "48 pages · 12 issues",
            },
            {
              label: "Core Web Vitals Analysis",
              detail: "Running Lighthouse across priority pages",
              metric: "LCP 2.1s → 1.4s",
            },
            {
              label: "On-Page Optimization",
              detail: "Title, meta, heading structure for 3 target pages",
              metric: "3 pages optimized",
            },
            {
              label: "Schema Markup Deployment",
              detail: "LocalBusiness + FAQ + Product schema",
              metric: "5 schema blocks",
            },
            {
              label: "AIO Content Restructuring",
              detail: "Restructuring content for AI-extractable format",
              metric: "3 pages restructured",
            },
            { label: "Validation & Delivery", detail: "Schema validation, SERP check, artifact packaging" },
          ],
          current: 0,
        },
        delay: 2400,
      },
    ],
  },
  {
    trigger: null,
    autoAfter: "approve",
    delay: 8000,
    messages: [
      {
        role: "assistant",
        text: "TechSEO Pro has completed the job. All 6 execution stages passed. Here are your delivered artifacts:",
        delay: 0,
      },
      {
        role: "assistant",
        ui: "artifacts",
        data: {
          artifacts: [
            {
              icon: "📋",
              title: "Technical SEO Audit Report",
              subtitle: "48 pages crawled · 12 issues identified · 8 auto-fixed",
              type: "PDF",
            },
            {
              icon: "⚡",
              title: "Core Web Vitals Remediation Log",
              subtitle: "LCP improved 33% · CLS reduced to 0.02 · FID < 50ms",
              type: "JSON",
            },
            {
              icon: "✏️",
              title: "On-Page Optimization Changes",
              subtitle: "Titles, metas, headings for 3 priority pages",
              type: "DIFF",
            },
            {
              icon: "🔗",
              title: "Schema Markup Package",
              subtitle: "LocalBusiness + FAQ + HowTo + Product · All valid",
              type: "JSON-LD",
            },
            {
              icon: "🤖",
              title: "AIO-Optimized Content",
              subtitle: "3 pages restructured for AI extraction + citation",
              type: "HTML",
            },
            {
              icon: "📊",
              title: "Baseline Ranking Snapshot",
              subtitle: "Current SERP positions for all target keywords",
              type: "CSV",
            },
          ],
        },
        delay: 1200,
      },
      {
        role: "assistant",
        ui: "metrics",
        data: {
          metrics: [
            { label: "Pages Optimized", value: "48", delta: "12 issues fixed", positive: true },
            { label: "LCP Score", value: "1.4s", delta: "from 2.1s", positive: true },
            { label: "Schema Blocks", value: "5", delta: "all valid", positive: true },
            { label: "AIO Ready", value: "3", delta: "pages restructured", positive: true },
            { label: "Est. Rank Lift", value: "+8", delta: "positions avg", positive: true },
            { label: "Budget Used", value: "$487", delta: "under budget", positive: true },
          ],
        },
        delay: 2200,
      },
      {
        role: "assistant",
        ui: "escrow",
        data: { status: "released", agent: "TechSEO Pro", amount: "$487" },
        delay: 3000,
      },
      {
        role: "assistant",
        text: "Your site is now technically optimized, schema-enriched, and AIO-ready. The ranking changes will take 1–3 weeks to fully surface in search results. I'll set up automated monitoring if you'd like — I can check your positions weekly and alert you to any changes.",
        delay: 3600,
      },
      {
        role: "assistant",
        ui: "quickActions",
        data: {
          actions: [
            { icon: "📡", label: "Set up weekly monitoring" },
            { icon: "🔗", label: "Now do link building" },
            { icon: "📄", label: "Download all artifacts" },
            { icon: "⭐", label: "Rate TechSEO Pro" },
          ],
        },
        delay: 4200,
      },
    ],
  },
];

// Maps full API agent to the simplified format used in Demand's scripted conversation
function toSimpleAgent(a) {
  return {
    id: a.id,
    name: a.name,
    avatar: a.avatar,
    verticals: a.verticals,
    reputation: a.stats?.reputation ?? a.reputation ?? 0,
    successRate: a.stats?.successRate ?? a.successRate ?? 0,
    avgCost: a.stats?.avgCost ?? a.avgCost ?? "$0",
    avgRuntime: a.stats?.avgRuntime ?? a.avgRuntime ?? "0m",
    sla: a.sla?.uptime ?? a.sla ?? "99%",
    description: a.description,
    capabilities: Array.isArray(a.capabilities) ? a.capabilities.map((c) => (typeof c === "string" ? c : c.verb)) : [],
    evalClaims: typeof a.evalClaims === "number" ? a.evalClaims : (a.evalClaims?.length ?? 0),
    evalPass: typeof a.evalPass === "number" ? a.evalPass : (a.evalClaims?.filter((e) => e.pass).length ?? 0),
  };
}

// ─── MAIN COMPONENT ───
export default function DemandChat() {
  const { mob } = useMedia();
  const { data: session } = useSession();

  // Fetch agents from API — uses API data, falls back to built-in demo agents only for scripted demo
  const { data: rawAgents } = useApiData(fetchAgents);
  const agents = useMemo(() => {
    if (rawAgents && rawAgents.length > 0) {
      const byId = Object.fromEntries(rawAgents.map((a) => [a.id, toSimpleAgent(a)]));
      return AGENTS_FALLBACK.map((f) => byId[f.id] || f);
    }
    // Demand Agent is a first-party demo — keep scripted agents for the conversation flow
    return AGENTS_FALLBACK;
  }, [rawAgents]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [scriptIdx, setScriptIdx] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [execProgress, setExecProgress] = useState(-1);
  const [phase, setPhase] = useState("intro"); // intro, gathering, matching, costing, executing, complete
  const chatEnd = useRef(null);
  const inputRef = useRef(null);

  const scrollBottom = useCallback(() => {
    setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const playScript = useCallback(
    (script) => {
      if (!script) return;
      setTyping(true);
      let delay = 0;
      script.messages.forEach((msg, i) => {
        delay += msg.delay || 0;
        setTimeout(() => {
          if (i === script.messages.length - 1) setTyping(false);
          setMessages((prev) => [...prev, { ...msg, id: Date.now() + i }]);
          scrollBottom();
        }, delay + 400);
      });
    },
    [scrollBottom],
  );

  // Play intro

  useEffect(() => {
    if (scriptIdx === 0) playScript(SCRIPT[0]);
    setScriptIdx(1);
  }, []);

  // Execution animation
  useEffect(() => {
    if (phase !== "executing" || execProgress >= 5) return;
    const t = setTimeout(
      () => {
        setExecProgress((p) => p + 1);
        // Update the execution card in messages
        setMessages((prev) =>
          prev.map((m) => (m.ui === "execution" ? { ...m, data: { ...m.data, current: execProgress + 2 } } : m)),
        );
      },
      1500 + Math.random() * 1000,
    );
    return () => clearTimeout(t);
  }, [phase, execProgress]);

  // Auto-play completion after execution
  useEffect(() => {
    if (execProgress >= 5 && phase === "executing") {
      setPhase("complete");
      setTimeout(() => playScript(SCRIPT[SCRIPT.length - 1]), 2000);
    }
  }, [execProgress, phase, playScript]);

  const findScript = (text) => {
    for (let i = 1; i < SCRIPT.length - 1; i++) {
      if (SCRIPT[i].trigger && SCRIPT[i].trigger.test(text)) return SCRIPT[i];
    }
    return null;
  };

  const handleSend = (text) => {
    const msg = text || input.trim();
    if (!msg || typing) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg, id: Date.now() }]);
    scrollBottom();

    const script = findScript(msg);
    if (script) {
      if (/approve|start|go|let's go|begin/i.test(msg)) {
        setPhase("executing");
        setExecProgress(-1);
      } else if (/cost|price|breakdown/i.test(msg)) {
        setPhase("costing");
      } else if (/bakery|sourdough|\.com|www\./i.test(msg)) {
        setPhase("matching");
      } else {
        setPhase("gathering");
      }
      setTimeout(() => playScript(script), script.delay || 1200);
    } else {
      // Fallback response
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "I'd love to help with that. Could you tell me a bit more about your business — your website URL, industry, and what you're trying to achieve? That'll help me match the right agents to your needs.",
            id: Date.now(),
          },
        ]);
        scrollBottom();
      }, 1500);
    }
  };

  const renderMessage = (msg) => {
    if (msg.role === "user") {
      return (
        <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <div
            style={{
              maxWidth: mob ? "85%" : "65%",
              background: "rgba(66,165,245,.08)",
              border: "1px solid rgba(66,165,245,.15)",
              borderRadius: "16px 16px 4px 16px",
              padding: "12px 16px",
              fontSize: 14,
              color: "#E3F2FD",
              lineHeight: 1.5,
            }}
          >
            {msg.text}
          </div>
        </div>
      );
    }

    if (msg.ui) {
      const wrap = (children) => (
        <div key={msg.id} style={{ display: "flex", justifyContent: "flex-start", marginBottom: 6 }}>
          <div style={{ maxWidth: mob ? "95%" : "75%", width: "100%" }}>{children}</div>
        </div>
      );

      switch (msg.ui) {
        case "quickActions":
          return wrap(<QuickActions actions={msg.data.actions} onAction={handleSend} />);
        case "intent":
          return wrap(<IntentCard intent={msg.data.intent} />);
        case "jobSpec":
          return wrap(<JobSpecPreview spec={msg.data.spec} />);
        case "agentMatch": {
          // Overlay API-fetched agent data onto the scripted fallback data
          const matchedAgents = msg.data.agents.map((a) => {
            const fresh = agents.find((ag) => ag.id === a.id);
            return fresh || a;
          });
          return wrap(<AgentMatchCard agents={matchedAgents} onSelect={setSelectedAgent} selectedId={selectedAgent} />);
        }
        case "costBreakdown":
          return wrap(<CostBreakdown items={msg.data.items} total={msg.data.total} />);
        case "escrow":
          return wrap(<EscrowCard status={msg.data.status} agent={msg.data.agent} amount={msg.data.amount} />);
        case "execution":
          return wrap(<ExecutionProgress stages={msg.data.stages} current={msg.data.current} />);
        case "artifacts":
          return wrap(<ArtifactCard artifacts={msg.data.artifacts} />);
        case "metrics":
          return wrap(<MetricDelta metrics={msg.data.metrics} />);
        default:
          return null;
      }
    }

    return (
      <div key={msg.id} style={{ display: "flex", justifyContent: "flex-start", marginBottom: 6 }}>
        <div
          style={{
            maxWidth: mob ? "85%" : "65%",
            background: "rgba(255,255,255,.02)",
            border: "1px solid rgba(255,255,255,.04)",
            borderRadius: "16px 16px 16px 4px",
            padding: "12px 16px",
            fontSize: 14,
            color: "rgba(255,255,255,.7)",
            lineHeight: 1.6,
          }}
        >
          {msg.text.split("**").map((part, i) =>
            i % 2 === 1 ? (
              <strong key={i} style={{ color: "#E3F2FD", fontWeight: 600 }}>
                {part}
              </strong>
            ) : (
              part
            ),
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        color: "#E3F2FD",
        fontFamily: ft.sans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Global styles now in index.html */}

      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid rgba(66,165,245,.06)",
          padding: mob ? "12px 16px" : "14px 28px",
          flexShrink: 0,
          background: "rgba(0,0,0,.2)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 860, margin: "0 auto" }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: `linear-gradient(135deg, ${blueDeep}, ${blue})`,
              boxShadow: "0 0 10px rgba(33,150,243,.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 32 32" width="18" height="18" fill="none">
              <path d="M16 3 L5 19 L11 19 L16 11 L21 19 L27 19Z" fill="#fff" opacity=".85" />
              <path d="M16 12 L10 20.5 L16 29 L22 20.5Z" fill="#90CAF9" opacity=".6" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: ft.display, fontWeight: 700, fontSize: 16 }}>
              agentic<span style={{ color: blue }}>proxies</span>
            </span>
            <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(255,255,255,.18)", marginLeft: 8 }}>
              Demand Console
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#66BB6A",
                boxShadow: "0 0 6px rgba(102,187,106,.5)",
              }}
            />
            <span style={{ fontFamily: ft.mono, fontSize: 9, color: "rgba(102,187,106,.5)" }}>
              {session?.user ? session.user.name || session.user.email : "A2A Connected"}
            </span>
            {session?.user && (
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(255,255,255,.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 2,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
                  <path
                    d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6"
                    stroke="rgba(255,255,255,.35)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflow: "auto", padding: mob ? "16px 12px" : "24px 20px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {/* Welcome banner */}
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: mob ? "40px 16px" : "60px 20px" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: `linear-gradient(135deg, ${blueDeep}60, ${blue}40)`,
                  border: "1px solid rgba(66,165,245,.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 24,
                }}
              >
                <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
                  <path d="M16 3 L5 19 L11 19 L16 11 L21 19 L27 19Z" fill="#fff" opacity=".85" />
                  <path d="M16 12 L10 20.5 L16 29 L22 20.5Z" fill="#90CAF9" opacity=".6" />
                </svg>
              </div>
              <h1 style={{ fontFamily: ft.display, fontSize: mob ? 24 : 32, fontWeight: 700, marginBottom: 8 }}>
                What can I help you rank for?
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.3)", maxWidth: 420, margin: "0 auto" }}>
                Describe your business challenge and I&apos;ll connect you with the right AI agents.
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map(renderMessage)}

          {/* Typing indicator */}
          {typing && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 6 }}>
              <div
                style={{
                  background: "rgba(255,255,255,.02)",
                  border: "1px solid rgba(255,255,255,.04)",
                  borderRadius: "16px 16px 16px 4px",
                }}
              >
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={chatEnd} />
        </div>
      </div>

      {/* Input Area */}
      <div
        style={{
          borderTop: "1px solid rgba(66,165,245,.06)",
          padding: mob ? "12px 12px 16px" : "16px 20px 20px",
          flexShrink: 0,
          background: "rgba(0,0,0,.3)",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={
                phase === "intro"
                  ? "Describe your business challenge..."
                  : phase === "gathering"
                    ? "Tell me about your site and keywords..."
                    : "Type a message..."
              }
              style={{
                width: "100%",
                fontFamily: ft.sans,
                fontSize: 14,
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(66,165,245,.1)",
                borderRadius: 14,
                padding: "14px 18px",
                paddingRight: 50,
                color: "#E3F2FD",
                outline: "none",
                transition: "border-color .2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(66,165,245,.25)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(66,165,245,.1)")}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || typing}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 36,
                height: 36,
                borderRadius: 10,
                background:
                  input.trim() && !typing ? `linear-gradient(135deg, ${blueDeep}, ${blue})` : "rgba(255,255,255,.03)",
                border: "none",
                cursor: input.trim() && !typing ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .2s",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 13L13 8L3 3v4l6 1-6 1v4z"
                  fill={input.trim() && !typing ? "#fff" : "rgba(255,255,255,.15)"}
                />
              </svg>
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 860, margin: "6px auto 0", display: "flex", justifyContent: "center", gap: 12 }}>
          <span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.1)" }}>A2A Protocol v1.0</span>
          <span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.06)" }}>·</span>
          <span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.1)" }}>Escrow Protected</span>
          <span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.06)" }}>·</span>
          <span style={{ fontFamily: ft.mono, fontSize: 8, color: "rgba(255,255,255,.1)" }}>SLA Enforced</span>
        </div>
      </div>
    </div>
  );
}
