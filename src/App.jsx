import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ft, blue, blueDeep, bg } from "./shared/tokens";

const MarketplaceApp = lazy(() => import("./pages/Dashboard"));
const DemandChat = lazy(() => import("./pages/Demand"));
const SupplyWaitlist = lazy(() => import("./pages/Waitlist"));
const Vision = lazy(() => import("./pages/Vision"));

function Loading() {
  return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: ft.mono, fontSize: 12, color: "rgba(255,255,255,.3)", letterSpacing: ".1em" }}>LOADING</div>
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
  // Hide top nav on pages that have their own full nav
  if (pathname === "/waitlist" || pathname === "/vision") return null;

  return (
    <nav style={{
      height: 40,
      background: "rgba(6,10,18,.95)",
      borderBottom: "1px solid rgba(66,165,245,.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      flexShrink: 0,
    }}>
      {NAV_ITEMS.map(item => {
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
          <Route path="/dashboard" element={<MarketplaceApp />} />
          <Route path="/demand" element={<DemandChat />} />
          <Route path="/waitlist" element={<SupplyWaitlist />} />
          <Route path="/vision" element={<Vision />} />
        </Routes>
      </Suspense>
    </div>
  );
}
