import { expect, test } from "@playwright/test";

const mockedWorldGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        shapeName: "United States",
        shapeGroup: "USA"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-125, 24],
            [-66, 24],
            [-66, 49],
            [-125, 49],
            [-125, 24]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        shapeName: "France",
        shapeGroup: "FRA"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-5, 42],
            [8, 42],
            [8, 51],
            [-5, 51],
            [-5, 42]
          ]
        ]
      }
    }
  ]
};

test.beforeEach(async ({ page }) => {
  await page.route("**/datasets/geo-countries/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/geo+json",
      body: JSON.stringify(mockedWorldGeoJson)
    });
  });

  await page.route("https://flagcdn.com/**/*.svg", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="#0284c7"/><circle cx="1.5" cy="1" r=".45" fill="#fff"/></svg>'
    });
  });
});

test("reveals a cinematic FlagCDN flag overlay when a country is hovered", async ({ page }) => {
  await page.goto("/");

  const unitedStates = page.locator('path[data-iso3="USA"]');
  await expect(unitedStates).toBeVisible();

  await unitedStates.hover();

  await expect(page.getByRole("heading", { name: "United States" })).toBeVisible();
  await expect(page.getByAltText("United States flag")).toBeVisible();
  await expect(page.getByText("USA · US")).toBeVisible();
});

test("supports keyboard focus for country discovery", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  await expect(page.locator('path[data-iso3="USA"]')).toBeFocused();
  await expect(page.getByAltText("United States flag")).toBeVisible();
});
