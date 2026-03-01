import { useState, useEffect } from "react";

// ─── RESPONSIVE HOOK ───
// Returns breakpoint booleans: mob (<768), tab (768–1023), desk (>=1024)
export function useMedia() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { w, mob: w < 768, tab: w >= 768 && w < 1024, desk: w >= 1024 };
}
