import { expect, test, type Page } from "@playwright/test"

// Runs against the real local Postgres (apps/site/scripts/dev.mjs emulates
// the manual-results admin API itself), the same way this flow was manually
// verified in the browser. Requires ADMIN_PASSWORD and a working
// DATABASE_URL/DATABASE_URL_RW in .env.local, and a running local Postgres.

const adminPassword = process.env.ADMIN_PASSWORD
test.skip(!adminPassword, "ADMIN_PASSWORD is not set in .env.local - skipping admin e2e flow")

// Unique per run so repeated runs don't collide on the (team, date, pub)
// unique constraint against a previous run's row.
const pubName = `E2E Test Pub ${Date.now()}`

const login = async (page: Page) => {
  await page.goto("/admin")
  await page.getByLabel("Heslo").fill(adminPassword as string)
  await page.getByRole("button", { name: "Přihlásit" }).click()
  await expect(page.getByRole("button", { name: "Historické výsledky" })).toBeVisible()
}

test.describe("admin manual-results flow", () => {
  test.beforeEach(({ page }) => {
    // "Vymazat" now confirms via window.confirm() before deleting; accept it
    // by default so existing flows that expect the delete to go through keep
    // working. Tests that specifically check the confirmation prompt itself
    // override this per-test.
    page.on("dialog", (dialog) => dialog.accept())
  })

  test("tab selection persists across reload", async ({ page }) => {
    await login(page)

    await page.getByRole("button", { name: "Historické výsledky" }).click()
    await expect(page.getByRole("heading", { name: "Historické výsledky" })).toBeVisible()

    await page.reload()
    await expect(page.getByRole("heading", { name: "Historické výsledky" })).toBeVisible()

    await page.getByRole("button", { name: "Domovská stránka" }).click()
    await expect(page.getByRole("heading", { name: "Domovská stránka" })).toBeVisible()

    await page.reload()
    await expect(page.getByRole("heading", { name: "Domovská stránka" })).toBeVisible()
  })

  test("can add, edit and reject a manual result", async ({ page }) => {
    await login(page)
    await page.getByRole("button", { name: "Historické výsledky" }).click()
    await expect(page.getByRole("heading", { name: "Historické výsledky" })).toBeVisible()

    const form = page.locator("form", { hasText: "Nový výsledek" })
    await form.locator('input[type="date"]').fill("2024-01-15")
    await form.locator('input[type="number"]').nth(0).fill("42")
    await form.locator('input[type="number"]').nth(1).fill("3")
    await form.locator('input[type="text"]').fill(pubName)
    await form.locator("textarea").fill("e2e create note")

    const teamSelect = form.locator("select")
    const adHocOption = teamSelect.locator("option", { hasText: "Ad hoc" })
    if ((await adHocOption.count()) > 0) {
      await teamSelect.selectOption({ label: "Ad hoc" })
    }

    await form.getByRole("button", { name: "Přidat výsledek" }).click()

    const row = page.locator("tbody tr", { hasText: pubName }).first()
    await expect(row).toBeVisible()
    await expect(row).toContainText("42")
    await expect(row).toContainText("e2e create note")

    // Newest submission sorts first (order by submitted_at desc), so the row
    // being edited stays at index 0 - the pub name is inside an <input> once
    // editing starts, which doesn't count toward a text-based row filter.
    await row.getByRole("button", { name: "Upravit" }).click()

    const editRow = page.locator("tbody tr").first()
    await editRow.locator("textarea").fill("e2e edited note")
    await editRow.locator('input[type="number"]').nth(1).fill("7")
    await editRow.getByRole("button", { name: "Uložit" }).click()

    const updatedRow = page.locator("tbody tr", { hasText: pubName }).first()
    await expect(updatedRow).toContainText("e2e edited note")
    await expect(updatedRow).toContainText("7")

    await updatedRow.getByRole("button", { name: "Vymazat" }).click()
    await expect(page.locator("tbody tr", { hasText: pubName })).toHaveCount(0)
  })

  test("the old 'Zrušit' label no longer exists anywhere in the panel", async ({ page }) => {
    await login(page)
    await page.getByRole("button", { name: "Historické výsledky" }).click()
    await expect(page.getByRole("heading", { name: "Historické výsledky" })).toBeVisible()

    await expect(page.getByRole("button", { name: "Zrušit", exact: true })).toHaveCount(0)
  })

  test("blocks a non-half-point score via native step validation, no row is created", async ({ page }) => {
    await login(page)
    await page.getByRole("button", { name: "Historické výsledky" }).click()

    const invalidPubName = `E2E Invalid Points Pub ${Date.now()}`
    const form = page.locator("form", { hasText: "Nový výsledek" })
    await form.locator('input[type="date"]').fill("2024-01-15")
    const pointsInput = form.locator('input[type="number"]').nth(0)
    await pointsInput.fill("10.3")
    await form.locator('input[type="text"]').fill(invalidPubName)

    await form.getByRole("button", { name: "Přidat výsledek" }).click()

    // The browser's own step=0.5 constraint blocks submission before the
    // handler (and therefore the network request) ever runs.
    expect(await pointsInput.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false)
    await expect(page.locator("tbody tr", { hasText: invalidPubName })).toHaveCount(0)
  })

  test("blocks a non-integer doplňovačka via native step validation, no row is created", async ({ page }) => {
    await login(page)
    await page.getByRole("button", { name: "Historické výsledky" }).click()

    const invalidPubName = `E2E Invalid Doplnovacek Pub ${Date.now()}`
    const form = page.locator("form", { hasText: "Nový výsledek" })
    await form.locator('input[type="date"]').fill("2024-01-15")
    const doplnovacekInput = form.locator('input[type="number"]').nth(1)
    await doplnovacekInput.fill("2.5")
    await form.locator('input[type="text"]').fill(invalidPubName)

    await form.getByRole("button", { name: "Přidat výsledek" }).click()

    expect(await doplnovacekInput.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false)
    await expect(page.locator("tbody tr", { hasText: invalidPubName })).toHaveCount(0)
  })

  test("dismissing the 'Vymazat' confirmation keeps the row", async ({ page }) => {
    // Override the accept-by-default handler from beforeEach for this one test.
    page.removeAllListeners("dialog")
    page.on("dialog", (dialog) => dialog.dismiss())

    await login(page)
    await page.getByRole("button", { name: "Historické výsledky" }).click()

    const pubName = `E2E Keep Pub ${Date.now()}`
    const form = page.locator("form", { hasText: "Nový výsledek" })
    await form.locator('input[type="date"]').fill("2024-01-15")
    await form.locator('input[type="text"]').fill(pubName)
    await form.getByRole("button", { name: "Přidat výsledek" }).click()

    const row = page.locator("tbody tr", { hasText: pubName }).first()
    await expect(row).toBeVisible()

    await row.getByRole("button", { name: "Vymazat" }).click()
    await expect(page.locator("tbody tr", { hasText: pubName })).toHaveCount(1)
  })

  test("switching 'Upravit' to another row while unsaved changes exist prompts to discard", async ({ page }) => {
    await login(page)
    await page.getByRole("button", { name: "Historické výsledky" }).click()

    const pubA = `E2E Discard A ${Date.now()}`
    const pubB = `E2E Discard B ${Date.now()}`
    const form = page.locator("form", { hasText: "Nový výsledek" })

    await form.locator('input[type="date"]').fill("2024-01-15")
    await form.locator('input[type="text"]').fill(pubA)
    await form.getByRole("button", { name: "Přidat výsledek" }).click()
    await expect(page.locator("tbody tr", { hasText: pubA })).toBeVisible()

    await form.locator('input[type="date"]').fill("2024-01-15")
    await form.locator('input[type="text"]').fill(pubB)
    await form.getByRole("button", { name: "Přidat výsledek" }).click()
    await expect(page.locator("tbody tr", { hasText: pubB })).toBeVisible()

    const rowA = page.locator("tbody tr", { hasText: pubA }).first()
    await rowA.getByRole("button", { name: "Upravit" }).click()

    let dialogSeen = false
    page.once("dialog", (dialog) => {
      dialogSeen = true
      dialog.dismiss()
    })

    const rowB = page.locator("tbody tr", { hasText: pubB }).first()
    await rowB.getByRole("button", { name: "Upravit" }).click()

    expect(dialogSeen).toBe(true)
    // Dismissed, so row A should still be the one being edited.
    await expect(page.locator("tbody tr").first().locator("textarea")).toBeVisible()
    await expect(page.locator("tbody tr", { hasText: pubA }).first().locator("textarea")).toHaveCount(1)
  })
})

test.describe("admin manual-results flow (mobile card layout)", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(({ page }) => {
    page.on("dialog", (dialog) => dialog.accept())
  })

  test("can add, edit and vymazat a manual result on the mobile card layout", async ({ page }) => {
    await login(page)
    await page.getByRole("button", { name: "Historické výsledky" }).click()
    await expect(page.getByRole("heading", { name: "Historické výsledky" })).toBeVisible()

    const pubName = `E2E Mobile Pub ${Date.now()}`
    const form = page.locator("form", { hasText: "Nový výsledek" })
    await form.locator('input[type="date"]').fill("2024-01-16")
    await form.locator('input[type="number"]').nth(0).fill("42")
    await form.locator('input[type="number"]').nth(1).fill("3")
    await form.locator('input[type="text"]').fill(pubName)

    await form.getByRole("button", { name: "Přidat výsledek" }).click()

    // Mobile renders the card layout (sm:hidden div), not the tbody table.
    const card = page.locator(".sm\\:hidden > div", { hasText: pubName }).first()
    await expect(card).toBeVisible()
    await expect(card).toContainText("42")

    await card.getByRole("button", { name: "Upravit" }).click()

    const editingCard = page.locator(".sm\\:hidden > div").first()
    await editingCard.locator('input[type="number"]').nth(1).fill("7")
    await editingCard.getByRole("button", { name: "Uložit" }).click()

    const updatedCard = page.locator(".sm\\:hidden > div", { hasText: pubName }).first()
    await expect(updatedCard).toContainText("7")

    await updatedCard.getByRole("button", { name: "Vymazat" }).click()
    await expect(page.locator(".sm\\:hidden > div", { hasText: pubName })).toHaveCount(0)
  })
})
