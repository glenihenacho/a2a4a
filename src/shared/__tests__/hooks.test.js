import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMedia } from "../hooks";

describe("useMedia", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1200 });
  });

  it("returns { w, mob, tab, desk } shape", () => {
    const { result } = renderHook(() => useMedia());
    expect(result.current).toHaveProperty("w");
    expect(result.current).toHaveProperty("mob");
    expect(result.current).toHaveProperty("tab");
    expect(result.current).toHaveProperty("desk");
  });

  it("reports desktop at 1200px", () => {
    const { result } = renderHook(() => useMedia());
    expect(result.current.desk).toBe(true);
    expect(result.current.mob).toBe(false);
    expect(result.current.tab).toBe(false);
  });

  it("reports mobile at 500px", () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useMedia());
    expect(result.current.mob).toBe(true);
    expect(result.current.tab).toBe(false);
    expect(result.current.desk).toBe(false);
  });

  it("reports tablet at 800px", () => {
    window.innerWidth = 800;
    const { result } = renderHook(() => useMedia());
    expect(result.current.tab).toBe(true);
    expect(result.current.mob).toBe(false);
    expect(result.current.desk).toBe(false);
  });

  it("responds to resize events", () => {
    const { result } = renderHook(() => useMedia());
    expect(result.current.desk).toBe(true);

    act(() => {
      window.innerWidth = 600;
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.mob).toBe(true);
    expect(result.current.desk).toBe(false);
  });
});
