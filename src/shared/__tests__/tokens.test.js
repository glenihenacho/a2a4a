import { describe, it, expect } from "vitest";
import { ft, blue, blueDeep, bg, green, orange, purple, pink, red, lightBlue, textPrimary } from "../tokens";

describe("tokens", () => {
  it("exports ft with display, sans, mono keys", () => {
    expect(ft).toHaveProperty("display");
    expect(ft).toHaveProperty("sans");
    expect(ft).toHaveProperty("mono");
    expect(ft.display).toContain("Rajdhani");
    expect(ft.sans).toContain("DM Sans");
    expect(ft.mono).toContain("JetBrains Mono");
  });

  it("exports expected color constants as hex strings", () => {
    const colors = { blue, blueDeep, bg, green, orange, purple, pink, red, lightBlue, textPrimary };
    Object.entries(colors).forEach(([name, value]) => {
      expect(value, `${name} should be a string`).toBeTypeOf("string");
      expect(value, `${name} should start with #`).toMatch(/^#/);
    });
  });

  it("has correct background color", () => {
    expect(bg).toBe("#060A12");
  });

  it("has correct primary blue", () => {
    expect(blue).toBe("#42A5F5");
  });
});
