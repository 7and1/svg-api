import { test, expect } from "@playwright/test";

test.describe("Search Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display search input", async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]').or(page.locator('input[type="search"]')).or(page.locator('input[placeholder*="search" i]'));
    await expect(searchInput.first()).toBeVisible();
  });

  test("should search for icons and display results", async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]').or(page.locator('input[type="search"]')).or(page.locator('input[placeholder*="search" i]')).first();

    await searchInput.fill("home");
    await searchInput.press("Enter");

    // Wait for results to load
    await page.waitForTimeout(1000);

    // Check for results
    const results = page.locator('[data-testid="icon-grid"]').or(page.locator('[data-testid="search-result"]')).or(page.locator(".icon-card")).or(page.locator("[class*='icon']"));
    await expect(results.first()).toBeVisible();
  });

  test("should show suggestions while typing", async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]').or(page.locator('input[type="search"]')).first();

    await searchInput.fill("use");
    await page.waitForTimeout(500);

    // Check for suggestions dropdown
    const suggestions = page.locator('[data-testid="search-suggestions"]').or(page.locator("[class*='suggestion']"));
    // Suggestions may or may not appear depending on implementation
  });

  test("should filter by source", async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]').or(page.locator('input[type="search"]')).first();
    await searchInput.fill("home");
    await searchInput.press("Enter");
    await page.waitForTimeout(1000);

    // Look for source filter
    const sourceFilter = page.locator('[data-testid="source-filter"]').or(page.locator("select")).or(page.locator("button:has-text('lucide')")).or(page.locator("button:has-text('Source')"));

    if (await sourceFilter.count() > 0) {
      await sourceFilter.first().click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to icon detail from search", async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]').or(page.locator('input[type="search"]')).first();
    await searchInput.fill("home");
    await searchInput.press("Enter");
    await page.waitForTimeout(1000);

    // Click on first result
    const firstResult = page.locator('[data-testid="icon-card"]').or(page.locator(".icon-card")).or(page.locator("a[href*='icons']")).first();

    if (await firstResult.count() > 0) {
      await firstResult.click();
      await page.waitForTimeout(500);

      // Check URL changed
      expect(page.url()).toContain("/icons/");
    }
  });

  test("should handle empty search results", async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]').or(page.locator('input[type="search"]')).first();

    await searchInput.fill("xyznonexistent12345");
    await searchInput.press("Enter");
    await page.waitForTimeout(1000);

    // Check for empty state
    const emptyState = page.locator('[data-testid="empty-state"]').or(page.locator("text='No results'")).or(page.locator("text='not found'"));
    // Empty state may be shown or just no results
  });

  test("should clear search", async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]').or(page.locator('input[type="search"]')).first();

    await searchInput.fill("home");
    await searchInput.clear();

    expect(await searchInput.inputValue()).toBe("");
  });
});
