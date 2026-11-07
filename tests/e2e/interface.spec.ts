import { test, expect } from "@playwright/test";

test("two friends create, invite, play, rematch and recover through the interface", async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const friendContext = await browser.newContext();
  try {
    const host = await hostContext.newPage();
    const friend = await friendContext.newPage();
    await host.goto("/");
    await host
      .getByRole("button", { name: "Create a private room", exact: true })
      .click();
    await host.getByLabel("Your display name").fill("Alex");
    await host.getByRole("checkbox").check();
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    const invitation = host.getByLabel("Room invitation");
    await expect(invitation).toBeVisible();
    const url = await invitation.inputValue();
    expect(new URL(url).searchParams.get("invite")?.length).toBeGreaterThan(20);
    const whatsapp = host.getByRole("link", { name: "Share on WhatsApp" });
    const shareUrl = new URL((await whatsapp.getAttribute("href"))!);
    expect(shareUrl.hostname).toBe("wa.me");
    expect(shareUrl.searchParams.get("text")).toContain(url);
    await friend.goto(url);
    await friend.getByLabel("Your display name").fill("Jordan");
    await friend.getByRole("checkbox").check();
    await friend
      .getByRole("button", { name: "Join private room", exact: true })
      .click();
    await expect(host.getByText("Jordan", { exact: true })).toBeVisible();
    await host.getByRole("button", { name: /I’m ready/ }).click();
    await friend.getByRole("button", { name: /I’m ready/ }).click();
    await expect(
      host.getByRole("button", { name: "Start match" }),
    ).toBeEnabled();
    await host.getByRole("button", { name: "Start match" }).click();
    const hostCell = (number: number) =>
      host.getByRole("button", { name: new RegExp(`^Cell ${number},`) });
    const friendCell = (number: number) =>
      friend.getByRole("button", { name: new RegExp(`^Cell ${number},`) });
    await expect(hostCell(1)).toBeEnabled();
    await expect(friendCell(1)).toBeDisabled();
    await hostCell(1).click();
    await expect(friendCell(1)).toHaveAccessibleName("Cell 1, player one");
    await friendCell(4).click();
    await expect(hostCell(2)).toBeEnabled();
    await hostCell(2).click();
    await expect(friendCell(5)).toBeEnabled();
    await friendCell(5).click();
    await expect(hostCell(3)).toBeEnabled();
    await hostCell(3).click();
    await expect(
      host.getByRole("heading", { name: "Alex wins!" }),
    ).toBeVisible();
    await expect(
      friend.getByRole("heading", { name: "Alex wins!" }),
    ).toBeVisible();
    await friend.reload();
    await expect(
      friend.getByRole("heading", { name: "Alex wins!" }),
    ).toBeVisible();
    await host.getByRole("button", { name: "Request rematch" }).click();
    await friend.getByRole("button", { name: "Request rematch" }).click();
    await expect(hostCell(1)).toHaveAccessibleName("Cell 1, empty");
    await expect(friendCell(1)).toHaveAccessibleName("Cell 1, empty");
  } finally {
    await Promise.all([hostContext.close(), friendContext.close()]);
  }
});

test("mobile navigation, discovery, favorites and theme remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good games.",
  );
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("button", { name: "Discover games", exact: true })
    .click();
  await page.getByLabel("Search games").fill("Four");
  await expect(
    page.getByRole("button", { name: "View Four in a Row", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "View Tic-Tac-Toe", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add Four in a Row to favorites" })
    .click();
  await page.getByLabel("Search games").fill("");
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "View Four in a Row", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("onboarding rejects missing adult confirmation and invalid invitations show clear errors", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create a private room", exact: true })
    .click();
  await page.getByLabel("Your display name").fill("Taylor");
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("18 or older");
  await page.goto("/?room=missing-room&invite=invalid");
  await page.getByLabel("Your display name").fill("Taylor");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Join private room", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("expired");
  await expect(
    page.getByRole("button", { name: "Create room", exact: true }),
  ).toBeEnabled();
});

for (const game of ["four-in-a-row", "quick-trivia"]) {
  test(`${game}: complete match using game controls`, async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]);
    try {
      const [host, friend] = await Promise.all(
        contexts.map((context) => context.newPage()),
      );
      await host.goto("/");
      await host
        .getByRole("button", { name: "Create a private room", exact: true })
        .click();
      await host.getByLabel("Choose a game").selectOption(game);
      await host.getByLabel("Your display name").fill("Casey");
      await host.getByRole("checkbox").check();
      await host
        .getByRole("button", { name: "Create room", exact: true })
        .click();
      await expect(host.getByLabel("Room invitation")).toBeVisible();
      await friend.goto(await host.getByLabel("Room invitation").inputValue());
      await friend.getByLabel("Your display name").fill("Morgan");
      await friend.getByRole("checkbox").check();
      await friend
        .getByRole("button", { name: "Join private room", exact: true })
        .click();
      await host.getByRole("button", { name: /I’m ready/ }).click();
      await friend.getByRole("button", { name: /I’m ready/ }).click();
      await expect(
        host.getByRole("button", { name: "Start match" }),
      ).toBeEnabled();
      await host.getByRole("button", { name: "Start match" }).click();
      if (game === "four-in-a-row") {
        for (let turn = 0; turn < 7; turn++) {
          const page = turn % 2 === 0 ? host : friend;
          const cell = page.getByTestId(`board-cell-${turn % 2 === 0 ? 0 : 1}`);
          await expect(cell).toBeEnabled();
          await cell.click();
        }
        await expect(
          host.getByRole("heading", { name: "Casey wins!" }),
        ).toBeVisible();
        await expect(
          friend.getByRole("heading", { name: "Casey wins!" }),
        ).toBeVisible();
      } else {
        for (let round = 0; round < 6; round++) {
          for (const page of [host, friend]) {
            await expect(
              page.getByText(`ROUND ${round + 1}`, { exact: true }),
            ).toBeVisible();
            await expect(page.getByTestId("trivia-option-0")).toBeEnabled();
            await page.getByTestId("trivia-option-0").click();
          }
        }
        await expect(
          host.getByRole("heading", { name: "A well-matched draw!" }),
        ).toBeVisible();
        await expect(
          friend.getByRole("heading", { name: "A well-matched draw!" }),
        ).toBeVisible();
      }
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}

test("capture responsive homepage review artifacts", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: process.env.PLAYNEX_ARTIFACT_DIR
      ? `${process.env.PLAYNEX_ARTIFACT_DIR}/home-desktop.png`
      : testInfo.outputPath("home-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page
        .locator(".sidebar")
        .evaluate((element) => element.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(0);
  await page.screenshot({
    path: process.env.PLAYNEX_ARTIFACT_DIR
      ? `${process.env.PLAYNEX_ARTIFACT_DIR}/home-mobile.png`
      : testInfo.outputPath("home-mobile.png"),
    fullPage: true,
  });
});

test("expired guest credentials recover to onboarding without reusing a stale token", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "playnex-session",
      JSON.stringify({
        token: "expired-token",
        name: "Former guest",
        player: { id: "expired-player", name: "Former guest" },
      }),
    ),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create a private room", exact: true })
    .click();
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("expired");
  await expect(page.getByLabel("Your display name")).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("playnex-session")),
  ).toBeNull();
});
