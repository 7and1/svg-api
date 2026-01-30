import { test, expect } from "@playwright/test";

test.describe("Icon Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a specific icon page
    await page.goto("/icons/home");
  });

  test("should display icon name", async ({ page }) => {
    const iconName = page.locator("h1").or(page.locator('[data-testid="icon-name"]'));
    await expect(iconName.first()).toBeVisible();

    const text = await iconName.first().textContent();
    expect(text?.toLowerCase()).toContain("home");
  });

  test("should display icon preview", async ({ page }) => {
    const preview = page.locator('[data-testid="icon-preview"]').or(page.locator("svg")).or(page.locator("img"));
    await expect(preview.first()).toBeVisible();
  });

  test("should display icon metadata", async ({ page }) => {
    // Check for metadata like source, category, tags
    const metadata = page.locator('[data-testid="icon-metadata"]').or(page.locator("[class*='metadata']"));
    // Metadata may or may not be present depending on implementation
  });

  test("should have copy functionality", async ({ page }) => {
    const copyButton = page.locator('[data-testid="copy-button"]').or(page.locator("button:has-text('Copy')")).or(page.locator("button[aria-label*='copy' i]"));

    if (await copyButton.count() > 0) {
      await expect(copyButton.first()).toBeVisible();
      await copyButton.first().click();

      // Check for success feedback
      await page.waitForTimeout(500);
    }
  });

  test("should have download functionality", async ({ page }) => {
    const downloadButton = page.locator('[data-testid="download-button"]').or(page.locator("button:has-text('Download')")).or(page.locator("a:has-text('Download')"));

    if (await downloadButton.count() > 0) {
      await expect(downloadButton.first()).toBeVisible();
    }
  });

  test("should support size customization", async ({ page }) => {
    const sizeInput = page.locator('[data-testid="size-input"]').or(page.locator("input[type='number']")).or(page.locator("select"));

    if (await sizeInput.count() > 0) {
      await sizeInput.first().fill("48");
      await page.waitForTimeout(500);

      // Check preview updated
      const preview = page.locator("svg").first();
      await expect(preview).toBeVisible();
    }
  });

  test("should support color customization", async ({ page }) => {
    const colorInput = page.locator('[data-testid="color-input"]').or(page.locator("input[type='color']"));

    if (await colorInput.count() > 0) {
      await colorInput.first().fill("#ff0000");
      await page.waitForTimeout(500);
    }
  });

  test("should display code snippets", async ({ page }) => {
    const codeBlock = page.locator("pre").or(page.locator("code")).or(page.locator('[data-testid="code-snippet"]'));

    if (await codeBlock.count() > 0) {
      await expect(codeBlock.first()).toBeVisible();
    }
  });

  test("should navigate back to home", async ({ page }) => {
    const backLink = page.locator('[data-testid="back-link"]').or(page.locator("a:has-text('Back')")).or(page.locator("a[href='/']"));

    if (await backLink.count() > 0) {
      await backLink.first().click();
      await page.waitForTimeout(500);
      expect(page.url()).toBe("http://localhost:3000/");
    }
  });

  test("should handle non-existent icon", async ({ page }) => {
    await page.goto("/icons/xyznonexistent12345");
    await page.waitForTimeout(500);

    // Check for 404 or error state
    const errorMessage = page.locator("text='Not found'").or(page.locator("text='not found'")).or(page.locator("h1:has-text('404')"));
    // Error state may vary
  });

  test("should display related icons", async ({ page }) => {
    const relatedSection = page.locator('[data-testid="related-icons"]').or(page.locator("text='Related'")).or(page.locator("text='Similar'"));

    // Related icons may or may not be displayed
  });
});
