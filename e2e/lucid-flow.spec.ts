import { expect, test } from "@playwright/test";

import { blockExternalProviderRequests, mockLucidApiRoutes } from "./helpers/mock-api";

test.describe("Lucid browser flow (mocked APIs)", () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalProviderRequests(page);
  });

  test("creates a prompted scene and prepares dream playback controls", async ({ page }) => {
    let generateImagePayload: Record<string, unknown> | null = null;

    await mockLucidApiRoutes(page);
    await page.route("**/api/generate-image", async (route) => {
      generateImagePayload = (route.request().postDataJSON() as Record<string, unknown>) ?? null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          imageUrl: null,
          imageDataUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XvB0AAAAASUVORK5CYII=",
        }),
      });
    });

    await page.goto("/");
    await page.addStyleTag({
      content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
    });

    await page.getByPlaceholder("Describe a dream scene").fill("moonlit observatory above clouds");
    const generateImageResponse = page.waitForResponse("**/api/generate-image");
    await page.getByRole("button", { name: "Create Scene" }).evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
    await generateImageResponse;

    await expect(page.getByRole("img", { name: "Liminal dreamscape" })).toBeVisible();
    expect(generateImagePayload).toMatchObject({
      prompt: "moonlit observatory above clouds",
      random: false,
    });

    const analyzeResponse = page.waitForResponse("**/api/analyze-scene");
    const voiceResponse = page.waitForResponse("**/api/generate-voice");
    const sfxResponse = page.waitForResponse("**/api/generate-sfx");
    await page.getByRole("button", { name: /^Dream$/ }).evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
    await Promise.all([analyzeResponse, voiceResponse, sfxResponse]);

    await expect(page.getByLabel("Dream playback timeline")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Play dream audio/i })).toBeVisible();
  });

  test("shows API error when dream analysis fails", async ({ page }) => {
    await mockLucidApiRoutes(page, {
      analyzeScene: {
        status: 502,
        body: { error: "Model output invalid." },
      },
    });

    await page.goto("/");
    await page.addStyleTag({
      content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
    });

    await page.getByPlaceholder("Describe a dream scene").fill("liminal hallway");
    const generateImageResponse = page.waitForResponse("**/api/generate-image");
    await page.getByRole("button", { name: "Create Scene" }).evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
    await generateImageResponse;
    await expect(page.getByRole("img", { name: "Liminal dreamscape" })).toBeVisible();

    const analyzeResponse = page.waitForResponse("**/api/analyze-scene");
    await page.getByRole("button", { name: /^Dream$/ }).evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
    await analyzeResponse;
    await expect(page.getByText("Model output invalid.")).toBeVisible({ timeout: 20_000 });
  });

  test("random scene uses random mode payload", async ({ page }) => {
    let payload: Record<string, unknown> | null = null;

    await mockLucidApiRoutes(page);
    await page.route("**/api/generate-image", async (route) => {
      payload = (route.request().postDataJSON() as Record<string, unknown>) ?? null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          imageUrl: null,
          imageDataUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XvB0AAAAASUVORK5CYII=",
        }),
      });
    });

    await page.goto("/");
    await page.addStyleTag({
      content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
    });
    const generateImageResponse = page.waitForResponse("**/api/generate-image");
    await page.getByRole("button", { name: "Create random scene" }).evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
    await generateImageResponse;

    await expect(page.getByRole("img", { name: "Liminal dreamscape" })).toBeVisible();
    expect(payload).toMatchObject({
      random: true,
    });
  });
});
