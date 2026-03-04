import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ft, blue, blueDeep, bg } from "./shared/tokens";
import { useSession, authClient } from "./shared/auth";

const MarketplaceApp = lazy(() => import("./pages/Dashboard"));
const DemandChat = lazy(() => import("./pages/Demand"));
const SupplyWaitlist = lazy(() => import("./pages/Waitlist"));
const Vision = lazy(() => import("./pages/Vision"));
const Auth = lazy(() => import("./pages/Auth"));

function Loading() {
  return (
    <div
      style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div style={{ fontFamily: ft.mono, fontSize: 12, color: "rgba(255,255,255,.3)", letterSpacing: ".1em" }}>
        LOADING
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "Platform" },
  { to: "/demand", label: "Demand" },
  { to: "/waitlist", label: "Supply" },
  { to: "/vision", label: "Vision" },
];

function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: session } = useSession();

  // Hide top nav on pages that have their own full nav or on auth page
  if (pathname === "/waitlist" || pathname === "/vision" || pathname === "/auth") return null;

  return (
    <nav
      style={{
        height: 40,
        background: "rgba(6,10,18,.95)",
        borderBottom: "1px solid rgba(66,165,245,.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        flexShrink: 0,
        position: "relative",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            style={{
              fontFamily: ft.mono,
              fontSize: 11,
              fontWeight: 600,
              color: active ? blue : "rgba(227,242,253,.3)",
              textDecoration: "none",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              padding: "4px 0",
              borderBottom: active ? `2px solid ${blue}` : "2px solid transparent",
              transition: "color .2s, border-color .2s",
            }}
          >
            {item.label}
          </Link>
        );
      })}

      {/* Auth button */}
      <div style={{ position: "absolute", right: 16, display: "flex", alignItems: "center", gap: 10 }}>
        {session?.user ? (
          <>
            <span
              style={{
                fontFamily: ft.mono,
                fontSize: 10,
                color: "rgba(255,255,255,.35)",
                letterSpacing: ".06em",
              }}
            >
              {session.user.name}
              <span
                style={{
                  marginLeft: 6,
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  background: session.user.role === "builder" ? "rgba(171,71,188,.12)" : "rgba(66,165,245,.1)",
                  color: session.user.role === "builder" ? "#AB47BC" : blue,
                }}
              >
                {session.user.role}
              </span>
            </span>
            <button
              onClick={async () => {
                await authClient.signOut();
                navigate("/auth");
              }}
              style={{
                fontFamily: ft.mono,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,.3)",
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.06)",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            style={{
              fontFamily: ft.mono,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: blue,
              textDecoration: "none",
              background: "rgba(66,165,245,.06)",
              border: "1px solid rgba(66,165,245,.12)",
              borderRadius: 6,
              padding: "4px 10px",
            }}
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: bg, color: "#E3F2FD", fontFamily: ft.sans }}>
      <TopNav />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<MarketplaceApp />} />
          <Route path="/demand" element={<DemandChat />} />
          <Route path="/waitlist" element={<SupplyWaitlist />} />
          <Route path="/vision" element={<Vision />} />
        </Routes>
      </Suspense>
    </div>
  );
}
