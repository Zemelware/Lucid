import { expect, test, type Page } from "@playwright/test";

import { blockExternalProviderRequests, mockLucidApiRoutes } from "./helpers/mock-api";

const DISABLE_MOTION_CSS =
  "*, *::before, *::after { animation: none !important; transition: none !important; }";

async function openHome(page: Page) {
  await page.goto("/");
  await page.addStyleTag({ content: DISABLE_MOTION_CSS });
}

async function clickByKeyboard(page: Page, name: RegExp | string) {
  const button = page.getByRole("button", { name });
  await button.focus();
  await page.keyboard.press("Enter");
}

async function createSceneFromPrompt(
  page: Page,
  prompt: string,
) {
  await page.getByPlaceholder("Describe a dream scene").fill(prompt);
  const response = page.waitForResponse("**/api/generate-image");
  await page.getByRole("button", { name: "Create Scene" }).evaluate((node) => {
    (node as HTMLButtonElement).click();
  });
  await response;
  await expect(page.getByRole("img", { name: "Liminal dreamscape" })).toBeVisible();
}

async function runDream(page: Page) {
  const analyzeResponse = page.waitForResponse("**/api/analyze-scene");
  const voiceResponse = page.waitForResponse("**/api/generate-voice");
  const sfxResponse = page.waitForResponse("**/api/generate-sfx");
  await page.getByRole("button", { name: /^Dream$/ }).evaluate((node) => {
    (node as HTMLButtonElement).click();
  });
  await Promise.all([analyzeResponse, voiceResponse, sfxResponse]);
}

async function runDreamAnalyzeOnly(page: Page) {
  const analyzeResponse = page.waitForResponse("**/api/analyze-scene");
  await page.getByRole("button", { name: /^Dream$/ }).evaluate((node) => {
    (node as HTMLButtonElement).click();
  });
  await analyzeResponse;
}

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

    await openHome(page);
    await createSceneFromPrompt(page, "moonlit observatory above clouds");
    expect(generateImagePayload).toMatchObject({
      prompt: "moonlit observatory above clouds",
      random: false,
    });

    await runDream(page);

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

    await openHome(page);
    await createSceneFromPrompt(page, "liminal hallway");
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

    await openHome(page);
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

  test("upload flow sends imageDataUrl to analyze endpoint", async ({ page }) => {
    let analyzePayload: Record<string, unknown> | null = null;
    await mockLucidApiRoutes(page);
    await page.route("**/api/analyze-scene", async (route) => {
      analyzePayload = (route.request().postDataJSON() as Record<string, unknown>) ?? null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          narrative: "you are floating in soft mist while distant water circles around your ears.",
          timeline: {
            total_duration_sec: 60,
            cues: [
              {
                id: "left_water",
                prompt: "water",
                loop: true,
                volume: 0.8,
                start_sec: 0,
                end_sec: 24,
                position_start: { x: -5, y: 0, z: -2 },
                position_end: { x: -4, y: 0, z: -1 },
              },
              {
                id: "behind_air",
                prompt: "air",
                loop: true,
                volume: 0.6,
                start_sec: 4,
                end_sec: 36,
                position_start: { x: 0, y: 0, z: -8 },
                position_end: { x: 2, y: 0, z: -6 },
              },
            ],
          },
        }),
      });
    });

    await openHome(page);
    const imageBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XvB0AAAAASUVORK5CYII=",
      "base64",
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "dream.png",
      mimeType: "image/png",
      buffer: imageBytes,
    });

    await expect(page.getByRole("button", { name: /^Dream$/ })).toBeEnabled();
    await runDream(page);

    const imageDataUrl =
      analyzePayload && typeof analyzePayload["imageDataUrl"] === "string"
        ? analyzePayload["imageDataUrl"]
        : "";
    expect(imageDataUrl).toContain("data:image/");
  });

  test("high-res toggle sets isHighRes=true on create-scene requests", async ({ page }) => {
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

    await openHome(page);
    await page.getByRole("button", { name: /NANO BANANA/i }).evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
    await createSceneFromPrompt(page, "high resolution temple");

    expect(payload).toMatchObject({
      prompt: "high resolution temple",
      random: false,
      isHighRes: true,
    });
  });

  test("playback controls support play/pause, seek, and per-cue SFX sliders", async ({ page }) => {
    await mockLucidApiRoutes(page);
    await openHome(page);
    await createSceneFromPrompt(page, "forest atrium");
    await runDream(page);

    const timeline = page.getByLabel("Dream playback timeline");
    await expect(timeline).toBeVisible();
    await timeline.evaluate((input) => {
      const el = input as HTMLInputElement;
      el.value = "1.25";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(timeline).toHaveValue("0");

    await page.getByRole("button", { name: /SFX Mix Show/i }).click();
    const masterSlider = page.getByLabel("Master sound effects volume");
    await expect(masterSlider).toBeVisible();
    await masterSlider.evaluate((input) => {
      const el = input as HTMLInputElement;
      el.value = "1.4";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(masterSlider).toHaveValue("1.4");

    const cueSlider = page.getByLabel("Volume for Water Left");
    await expect(cueSlider).toBeVisible();
    await cueSlider.evaluate((input) => {
      const el = input as HTMLInputElement;
      el.value = "0.6";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(cueSlider).toHaveValue("0.6");
  });

  test("shows scene-generation errors from API", async ({ page }) => {
    await mockLucidApiRoutes(page, {
      generateImage: {
        status: 502,
        body: { error: "Image provider unavailable." },
      },
    });
    await openHome(page);
    await createSceneFromPrompt(page, "storm corridor").catch(() => undefined);
    await expect(page.getByText("Image provider unavailable.")).toBeVisible();
  });

  test("shows voice-generation errors during dream prep", async ({ page }) => {
    await mockLucidApiRoutes(page, {
      generateVoice: {
        status: 502,
        contentType: "application/json",
        bytes: Buffer.from(JSON.stringify({ error: "Voice synthesis failed." })),
      },
    });
    await openHome(page);
    await createSceneFromPrompt(page, "echoing chapel");
    await runDream(page).catch(() => undefined);
    await expect(page.getByText("Voice synthesis failed.")).toBeVisible();
    await expect(page.getByLabel("Dream playback timeline")).toHaveCount(0);
  });

  test("shows SFX-generation errors during dream prep", async ({ page }) => {
    await mockLucidApiRoutes(page, {
      generateSfx: {
        status: 502,
        contentType: "application/json",
        bytes: Buffer.from(JSON.stringify({ error: "SFX generation failed." })),
      },
    });
    await openHome(page);
    await createSceneFromPrompt(page, "floating corridor");
    await runDream(page).catch(() => undefined);
    await expect(page.getByText("SFX generation failed.")).toBeVisible();
    await expect(page.getByLabel("Dream playback timeline")).toHaveCount(0);
  });

  test("recovers after analyze failure when user retries dream", async ({ page }) => {
    let analyzeAttempt = 0;
    await mockLucidApiRoutes(page);
    await page.route("**/api/analyze-scene", async (route) => {
      analyzeAttempt += 1;
      if (analyzeAttempt === 1) {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({ error: "Temporary analyze failure." }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          narrative:
            "you settle into gentle ambience while rain and wind fold around your shoulders.",
          timeline: {
            total_duration_sec: 50,
            cues: [
              {
                id: "rain_left",
                prompt: "rain",
                loop: true,
                volume: 0.8,
                start_sec: 0,
                end_sec: 20,
                position_start: { x: -5, y: 0, z: -2 },
                position_end: { x: -3, y: 0, z: -1 },
              },
              {
                id: "wind_back",
                prompt: "wind",
                loop: true,
                volume: 0.6,
                start_sec: 6,
                end_sec: 32,
                position_start: { x: 0, y: 0, z: -7 },
                position_end: { x: 2, y: 0, z: -5 },
              },
            ],
          },
        }),
      });
    });

    await openHome(page);
    await createSceneFromPrompt(page, "mist bridge");

    await runDreamAnalyzeOnly(page);
    await expect(page.getByText("Temporary analyze failure.")).toBeVisible();

    await runDream(page);
    await expect(page.getByLabel("Dream playback timeline")).toBeVisible({ timeout: 20_000 });
  });

  test("supports keyboard-triggered scene creation and exposes accessible labels", async ({ page }) => {
    await mockLucidApiRoutes(page);
    await openHome(page);

    const promptInput = page.getByPlaceholder("Describe a dream scene");
    await promptInput.focus();
    await page.keyboard.type("keyboard driven dream");

    await clickByKeyboard(page, "Create Scene");
    await expect(page.getByRole("img", { name: "Liminal dreamscape" })).toBeVisible();
    await expect(page.getByLabel("Master sound effects volume")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create random scene/i })).toBeVisible();
  });
});
