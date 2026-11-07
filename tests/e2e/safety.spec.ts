import { test, expect, type Page } from "@playwright/test";

async function newRoom(host: Page) {
  await host.getByRole("button", { name: "Home", exact: true }).click();
  await host
    .getByRole("button", { name: "Create a private room", exact: true })
    .click();
  await host.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(host.getByLabel("Room invitation")).toBeVisible();
  return host.getByLabel("Room invitation").inputValue();
}

test("private guests can report and block an opponent; blocked pairs cannot rejoin until unblocked", async ({
  browser,
}) => {
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
    await host.getByLabel("Your display name").fill("Safety Host");
    await host.getByRole("checkbox").check();
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    await expect(host.getByLabel("Room invitation")).toBeVisible();
    const originalInvite = await host
      .getByLabel("Room invitation")
      .inputValue();
    await friend.goto(originalInvite);
    await friend.getByLabel("Your display name").fill("Safety Friend");
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
    await host.getByTestId("board-cell-0").click();
    await expect(friend.getByTestId("board-cell-0")).toHaveAccessibleName(
      "Cell 1, player one",
    );
    await host
      .getByRole("button", { name: "Report player", exact: true })
      .click();
    await host
      .getByLabel("Report reason")
      .fill("Private beta safety regression: unwanted behavior.");
    await host
      .getByRole("button", { name: "Submit report", exact: true })
      .click();
    await expect(host.getByText(/report submitted/i)).toBeVisible();
    await host
      .getByRole("button", { name: "Block Safety Friend", exact: true })
      .click();
    await expect(friend.getByRole("alert")).toContainText(/closed.*safety/i);
    const originalRoom = new URL(originalInvite).searchParams.get("room")!;
    const closedStatus = await friend.evaluate(async (id) => {
      const guest = JSON.parse(sessionStorage.getItem("playnex-session")!);
      return (
        await fetch(`/api/rooms/${id}`, {
          headers: { Authorization: `Bearer ${guest.token}` },
        })
      ).status;
    }, originalRoom);
    expect(closedStatus).toBe(410);
    await host
      .getByRole("button", { name: "Safety center", exact: true })
      .click();
    await expect(host.getByRole("button", { name: /Unblock/ })).toBeVisible();
    const blockedInvite = await newRoom(host);
    await friend.goto(blockedInvite);
    await friend
      .getByRole("button", { name: "Join private room", exact: true })
      .click();
    await expect(friend.getByRole("alert")).toContainText(/block/i);
    await host
      .getByRole("button", { name: "Safety center", exact: true })
      .click();
    await host.getByRole("button", { name: /Unblock/ }).click();
    await expect(host.getByRole("button", { name: /Unblock/ })).toHaveCount(0);
    await friend
      .getByRole("button", { name: "Join private room", exact: true })
      .click();
    await expect(friend.getByLabel("Room invitation")).toBeVisible();
    await expect(
      friend.getByText("Safety Host", { exact: true }),
    ).toBeVisible();
    const status = await friend.evaluate(async () => {
      const guest = JSON.parse(sessionStorage.getItem("playnex-session")!);
      return (
        await fetch("/api/admin", {
          headers: { Authorization: `Bearer ${guest.token}` },
        })
      ).status;
    });
    expect(status).toBe(403);
    await expect(
      friend.getByRole("button", { name: "Administration", exact: true }),
    ).toHaveCount(0);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("accounts and recovery show an honest unavailable state without cloud configuration", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Your profile", exact: true }).click();
  await page
    .getByRole("button", { name: "Accounts & recovery", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Accounts & recovery", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Account service is not configured",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("input[type=password]")).toHaveCount(0);
});
