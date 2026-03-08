import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ft, bg } from "./shared/tokens";
import { useSession } from "./shared/auth";

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

function RequireAuth({ children }) {
  const { data: session, isPending } = useSession();
  if (isPending) return <Loading />;
  if (!session?.user) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: bg, color: "#E3F2FD", fontFamily: ft.sans }}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <MarketplaceApp />
              </RequireAuth>
            }
          />
          <Route path="/demand" element={<DemandChat />} />
          <Route path="/waitlist" element={<SupplyWaitlist />} />
          <Route path="/vision" element={<Vision />} />
        </Routes>
      </Suspense>
    </div>
  );
}
