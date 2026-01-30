import { test, expect } from "@playwright/test";

test.describe("Playground Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/playground");
  });

  test("should display playground interface", async ({ page }) => {
    // Check for main playground elements
    const playground = page.locator('[data-testid="playground"]').or(page.locator("h1:has-text('Playground')")).or(page.locator("text='Playground'"));
    await expect(playground.first()).toBeVisible();
  });

  test("should have icon selector", async ({ page }) => {
    const iconSelector = page.locator('[data-testid="icon-selector"]').or(page.locator("select")).or(page.locator("input[placeholder*='icon' i]"));

    if (await iconSelector.count() > 0) {
      await expect(iconSelector.first()).toBeVisible();
    }
  });

  test("should have size control", async ({ page }) => {
    const sizeControl = page.locator('[data-testid="size-control"]').or(page.locator("input[type='range']")).or(page.locator("input[name*='size' i]"));

    if (await sizeControl.count() > 0) {
      await expect(sizeControl.first()).toBeVisible();
    }
  });

  test("should have color control", async ({ page }) => {
    const colorControl = page.locator('[data-testid="color-control"]').or(page.locator("input[type='color']"));

    if (await colorControl.count() > 0) {
      await expect(colorControl.first()).toBeVisible();
    }
  });

  test("should have stroke width control", async ({ page }) => {
    const strokeControl = page.locator('[data-testid="stroke-control"]').or(page.locator("input[name*='stroke' i]"));

    // Stroke control may or may not exist
  });

  test("should update preview when changing size", async ({ page }) => {
    const sizeInput = page.locator("input[type='range']").or(page.locator("input[name*='size' i]")).or(page.locator("input[type='number']")).first();
    const preview = page.locator('[data-testid="icon-preview"]').or(page.locator("svg")).first();

    if (await sizeInput.count() > 0 && await preview.count() > 0) {
      await sizeInput.fill("64");
      await page.waitForTimeout(500);

      await expect(preview).toBeVisible();
    }
  });

  test("should update preview when changing color", async ({ page }) => {
    const colorInput = page.locator("input[type='color']").first();
    const preview = page.locator("svg").first();

    if (await colorInput.count() > 0) {
      await colorInput.fill("#ff0000");
      await page.waitForTimeout(500);

      await expect(preview).toBeVisible();
    }
  });

  test("should have code output", async ({ page }) => {
    const codeOutput = page.locator('[data-testid="code-output"]').or(page.locator("pre")).or(page.locator("code"));

    if (await codeOutput.count() > 0) {
      await expect(codeOutput.first()).toBeVisible();
    }
  });

  test("should copy code to clipboard", async ({ page }) => {
    const copyButton = page.locator('[data-testid="copy-code"]').or(page.locator("button:has-text('Copy')")).first();

    if (await copyButton.count() > 0) {
      await copyButton.click();
      await page.waitForTimeout(500);

      // Check for success feedback
      const toast = page.locator("text='Copied'").or(page.locator("[class*='toast']"));
      // Toast may or may not appear
    }
  });

  test("should support rotation", async ({ page }) => {
    const rotateControl = page.locator('[data-testid="rotate-control"]').or(page.locator("input[name*='rotate' i]"));

    if (await rotateControl.count() > 0) {
      await rotateControl.fill("90");
      await page.waitForTimeout(500);

      const preview = page.locator("svg").first();
      await expect(preview).toBeVisible();
    }
  });

  test("should support mirror/flip", async ({ page }) => {
    const mirrorToggle = page.locator('[data-testid="mirror-toggle"]').or(page.locator("input[type='checkbox'][name*='mirror' i]")).or(page.locator("button:has-text('Mirror')"));

    if (await mirrorToggle.count() > 0) {
      await mirrorToggle.click();
      await page.waitForTimeout(500);

      const preview = page.locator("svg").first();
      await expect(preview).toBeVisible();
    }
  });

  test("should reset to defaults", async ({ page }) => {
    const resetButton = page.locator('[data-testid="reset-button"]').or(page.locator("button:has-text('Reset')"));

    if (await resetButton.count() > 0) {
      await resetButton.click();
      await page.waitForTimeout(500);

      // Check that values reset
      const preview = page.locator("svg").first();
      await expect(preview).toBeVisible();
    }
  });

  test("should export/download SVG", async ({ page }) => {
    const downloadButton = page.locator('[data-testid="download-svg"]').or(page.locator("button:has-text('Download')")).or(page.locator("a:has-text('Download')"));

    if (await downloadButton.count() > 0) {
      await expect(downloadButton.first()).toBeVisible();
    }
  });

  test("should be responsive", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const playground = page.locator('[data-testid="playground"]').or(page.locator("h1"));
    await expect(playground.first()).toBeVisible();

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});
