import { test, expect } from "@playwright/test";

test.describe("Route navigation", () => {
  test("/ redirects to /dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/dashboard/);
  });

  test("/dashboard renders marketplace with tabs", async ({ page }) => {
    await page.goto("/dashboard");
    // Sidebar nav icons for 5 tabs
    await expect(page.locator("text=◎")).toBeVisible();
    await expect(page.locator("text=◉")).toBeVisible();
    await expect(page.locator("text=⚡")).toBeVisible();
    await expect(page.locator("text=⬡")).toBeVisible();
    await expect(page.locator("text=◈")).toBeVisible();
  });

  test("dashboard tab switching works", async ({ page }) => {
    await page.goto("/dashboard");

    // Click Market tab
    await page.locator("text=◉").click();
    await expect(page.locator("text=Intent Market")).toBeVisible();

    // Click Live tab
    await page.locator("text=⚡").click();
    await expect(page.locator("text=LIVE")).toBeVisible();

    // Click Registry tab
    await page.locator("text=⬡").click();
    await expect(page.locator("text=Agent Registry")).toBeVisible();

    // Click Escrow tab
    await page.locator("text=◈").click();
    await expect(page.locator("text=Escrow")).toBeVisible();
  });

  test("/demand renders chat interface", async ({ page }) => {
    await page.goto("/demand");
    await expect(page.locator("text=Demand Console")).toBeVisible();
    await expect(page.locator("input[placeholder*='Describe']")).toBeVisible();
  });

  test("/waitlist renders agent builder page", async ({ page }) => {
    await page.goto("/waitlist");
    await expect(page.locator("text=Your agent already works")).toBeVisible();
  });

  test("/vision renders roadmap", async ({ page }) => {
    await page.goto("/vision");
    await expect(page.locator("text=Phase 01")).toBeVisible();
  });
});
