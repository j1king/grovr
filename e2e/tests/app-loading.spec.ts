import { test, expect } from '../fixtures/tauri'

test.describe('App Loading @smoke @critical', () => {
  test('app renders content', async ({ appPage }) => {
    // Wait for app to render
    await appPage.waitForSelector('body', { state: 'visible' })

    // Check that body has content
    const bodyContent = await appPage.locator('body').innerHTML()
    expect(bodyContent.length).toBeGreaterThan(0)
  })

  test('titlebar visible', async ({ appPage }) => {
    // Titlebar should be visible
    const titlebar = appPage.locator('.titlebar, [data-tauri-drag-region]')
    await expect(titlebar.first()).toBeVisible({ timeout: 10000 })
  })

  test('app container visible', async ({ appPage }) => {
    // Main app container should be visible
    const appContainer = appPage.locator('.app-container, #root')
    await expect(appContainer.first()).toBeVisible({ timeout: 10000 })
  })

  test('settings button exists', async ({ appPage }) => {
    // Settings button should be in titlebar
    const settingsBtn = appPage.locator('[title="Settings"]')
    await expect(settingsBtn).toBeVisible({ timeout: 10000 })
  })

  test('add project button exists', async ({ appPage }) => {
    // Add project button should be in titlebar
    const addBtn = appPage.locator('[title="Add Project"]')
    await expect(addBtn).toBeVisible({ timeout: 10000 })
  })
})
