import { expect, test, type Page } from "@playwright/test";

async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Testpass1");
  await page.getByLabel("Confirm password").fill("Testpass1");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("link", { name: "Open the one-time link" }).click();
  await expect(page.getByText("Email verified")).toBeVisible();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Testpass1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Skip onboarding" }).click();
  await expect(page.getByRole("heading", { name: "Your home" })).toBeVisible();
}

test("two people can pair and open a quiz", async ({ browser }) => {
  const stamp = Date.now();
  const partnerA = await browser.newContext();
  const partnerB = await browser.newContext();
  const pageA = await partnerA.newPage();
  const pageB = await partnerB.newPage();

  await pageA.goto("/");
  await expect(pageA.getByRole("heading", { name: "How Well Do You Really Know Your Person?" })).toBeVisible();
  await pageA.getByTestId("start-journey").click();
  await register(pageA, "Avery", `avery.${stamp}@example.com`);

  await pageA.getByRole("link", { name: "Create or join" }).click();
  await pageA.getByLabel("Couple name").fill("Avery and Blair");
  await pageA.getByRole("button", { name: "Create couple space" }).click();
  const code = (await pageA.getByTestId("invite-code").textContent())?.trim() ?? "";
  expect(code.length).toBeGreaterThan(4);

  await register(pageB, "Blair", `blair.${stamp}@example.com`);
  await pageB.goto("/join");
  await pageB.getByLabel("Invitation code").fill(code);
  await pageB.getByRole("button", { name: "Review invitation" }).click();
  await expect(pageB.getByRole("heading", { name: "Pair with Avery" })).toBeVisible();
  await pageB.getByRole("button", { name: "Accept invitation" }).click();
  await expect(pageB.getByRole("heading", { name: "Avery and Blair" })).toBeVisible();
  await pageA.reload();
  await expect(pageA.getByRole("heading", { name: "Avery and Blair" })).toBeVisible();

  await pageA.getByRole("link", { name: "Play a Quiz" }).click();
  await pageA.locator("form", { has: pageA.getByRole("heading", { name: "Quick quiz" }) }).getByRole("button", { name: "Start" }).click();
  await expect(pageA.getByText("1 /")).toBeVisible();
  const option = pageA.getByTestId("quiz-option");
  if (await option.count()) await option.first().click();
  else if (await pageA.locator("textarea").count()) await pageA.locator("textarea").fill("A quiet evening");
  else await pageA.getByRole("button", { name: "3" }).click();
  await pageA.getByRole("button", { name: "Next" }).click();
  await expect(pageA.getByText("2 /")).toBeVisible();

  await partnerA.close();
  await partnerB.close();
});
