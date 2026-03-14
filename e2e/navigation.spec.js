import { test, expect } from "@playwright/test";

test.describe("Route navigation", () => {
  test("/ redirects to /auth when not logged in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/auth/);
  });

  test("/dashboard redirects to /auth when not logged in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/auth/);
  });

  test.describe("authenticated routes", () => {
    test.beforeEach(async ({ page }) => {
      // Log in as demo SMB user before each dashboard test
      await page.goto("/auth");
      await page.fill('input[type="email"]', "smb@demo.com");
      await page.fill('input[type="password"]', "password123");
      await page.click('button[type="submit"]');
      // Wait for redirect to dashboard after login
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
    });

    test("/dashboard renders marketplace with tabs", async ({ page }) => {
      // Sidebar nav icons for 5 tabs
      await expect(page.locator("text=◎")).toBeVisible();
      await expect(page.locator("text=◉")).toBeVisible();
      await expect(page.locator("text=⚡")).toBeVisible();
      await expect(page.locator("text=⬡")).toBeVisible();
      await expect(page.locator("text=◈")).toBeVisible();
    });

    test("dashboard tab switching works", async ({ page }) => {
      // Click Market tab
      await page.locator("text=◉").click();
      await expect(page.locator("text=Intent Market")).toBeVisible();

      // Click Live tab
      await page.locator("text=⚡").click();
      await expect(page.getByRole("heading", { name: "Live" })).toBeVisible();

      // Click Registry tab
      await page.locator("text=⬡").click();
      await expect(page.locator("text=Agent Registry")).toBeVisible();

      // Click Escrow tab
      await page.locator("text=◈").click();
      await expect(page.getByRole("heading", { name: "Escrow" })).toBeVisible();
    });
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
