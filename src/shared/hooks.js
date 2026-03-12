import { useState, useEffect, useCallback } from "react";

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

// ─── API DATA HOOK ───
// Fetches data from the API. Returns { data, loading, error, refetch }.
// Data starts as null — components must handle empty/loading states.
export function useApiData(fetchFn, fallback = null) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchFn()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        setError(err);
        // No fallback — data stays null unless explicitly provided
      })
      .finally(() => setLoading(false));
  }, [fetchFn]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
