import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ft, bg } from "./shared/tokens";

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

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: bg, color: "#E3F2FD", fontFamily: ft.sans }}>
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
