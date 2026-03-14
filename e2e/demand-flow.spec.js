import { test, expect } from "@playwright/test";

test.describe("Demand Agent flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demand");
    // Wait for intro messages to appear
    await expect(page.locator("text=agenticproxies concierge")).toBeVisible({ timeout: 5000 });
  });

  test("intro messages and quick actions appear", async ({ page }) => {
    await expect(page.locator("text=Tell me about your business")).toBeVisible({ timeout: 5000 });
    // Quick action buttons should be visible
    await expect(page.locator("button", { hasText: "not ranking" })).toBeVisible({ timeout: 5000 });
  });

  test("clicking quick action triggers gathering phase", async ({ page }) => {
    // Wait for quick actions
    const btn = page.locator("button", { hasText: "not ranking" });
    await expect(btn).toBeVisible({ timeout: 5000 });
    await btn.click();

    // Should show user message and agent response
    await expect(page.locator("text=what's your website URL")).toBeVisible({ timeout: 5000 });
  });

  test("entering business details triggers matching phase", async ({ page }) => {
    // Trigger gathering
    const btn = page.locator("button", { hasText: "not ranking" });
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();

    // Wait for agent response
    await expect(page.locator("text=what's your website URL")).toBeVisible({ timeout: 10000 });

    // Type business details
    const input = page.locator("input[placeholder*='Tell me']");
    await input.fill("I run a bakery in Austin, hillcountrysourdough.com");
    await input.press("Enter");

    // Should show intent card and agent matches
    await expect(page.locator("text=Extracted Intent")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=TechSEO Pro")).toBeVisible({ timeout: 15000 });
  });

  test("cost breakdown appears on request", async ({ page }) => {
    // Fast-track through gathering + matching
    const rankBtn = page.locator("button", { hasText: "not ranking" });
    await expect(rankBtn).toBeVisible({ timeout: 10000 });
    await rankBtn.click();
    await expect(page.locator("text=what's your website URL")).toBeVisible({ timeout: 10000 });

    const input = page.locator("input[placeholder*='Tell me']");
    await input.fill("bakery in Austin, hillcountrysourdough.com");
    await input.press("Enter");

    // Wait for matching phase to complete before looking for quick actions
    await expect(page.locator("text=Extracted Intent")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=TechSEO Pro")).toBeVisible({ timeout: 15000 });

    // Wait for cost breakdown quick action (appears after agent recommendation text)
    const costBtn = page.locator("button", { hasText: "cost breakdown" });
    await expect(costBtn).toBeVisible({ timeout: 25000 });
    await costBtn.click();

    // Cost breakdown card should appear
    await expect(page.locator("text=Cost Estimate")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=$504")).toBeVisible({ timeout: 15000 });
  });

  test("approving job triggers execution", async ({ page }) => {
    // Fast-track through to approval
    const rankBtn = page.locator("button", { hasText: "not ranking" });
    await expect(rankBtn).toBeVisible({ timeout: 10000 });
    await rankBtn.click();
    await expect(page.locator("text=what's your website URL")).toBeVisible({ timeout: 10000 });

    const input = page.locator("input[placeholder*='Tell me']");
    await input.fill("bakery in Austin, hillcountrysourdough.com");
    await input.press("Enter");

    // Wait for matching phase to complete
    await expect(page.locator("text=Extracted Intent")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=TechSEO Pro")).toBeVisible({ timeout: 15000 });

    const costBtn = page.locator("button", { hasText: "cost breakdown" });
    await expect(costBtn).toBeVisible({ timeout: 25000 });
    await costBtn.click();

    // Wait for approve button
    const approveBtn = page.locator("button", { hasText: "Approve" });
    await expect(approveBtn).toBeVisible({ timeout: 20000 });
    await approveBtn.click();

    // Escrow should lock and execution should start
    await expect(page.locator("text=Escrow Locked")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Execution Progress")).toBeVisible({ timeout: 15000 });
  });
});
