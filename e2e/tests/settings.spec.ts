import { test, expect } from '../fixtures/tauri'

test.describe('Settings Page @settings @critical', () => {
  test('settings button opens settings page', async ({ appPage }) => {
    // Find settings button in titlebar
    const settingsBtn = appPage.locator('[title="Settings"]')
    await expect(settingsBtn).toBeVisible()

    // Click settings
    await settingsBtn.click()

    // Settings page should show the sidebar with navigation
    const settingsSidebar = appPage.locator('.settings-sidebar')
    await expect(settingsSidebar).toBeVisible()

    // Default category (General) should be shown
    const generalTitle = appPage.locator('.settings-content-title')
    await expect(generalTitle).toHaveText('General')
  })

  test('settings tabs are displayed', async ({ appPage }) => {
    // Navigate to settings
    const settingsBtn = appPage.locator('[title="Settings"]')
    await settingsBtn.click()

    // Check for tab buttons
    const generalTab = appPage.getByText('General')
    const appearanceTab = appPage.getByText('Appearance')
    const ideTab = appPage.getByText('IDE')

    await expect(generalTab.first()).toBeVisible()
    await expect(appearanceTab.first()).toBeVisible()
    await expect(ideTab.first()).toBeVisible()
  })

  test('appearance settings has theme selector', async ({ appPage }) => {
    // Navigate to settings
    const settingsBtn = appPage.locator('[title="Settings"]')
    await settingsBtn.click()

    // Click Appearance tab
    const appearanceTab = appPage.getByText('Appearance')
    await appearanceTab.first().click()

    // Theme selector should be visible
    const modeLabel = appPage.getByText('Mode')
    await expect(modeLabel.first()).toBeVisible()

    // Select dropdown should be visible
    const themeSelect = appPage.locator('select').first()
    await expect(themeSelect).toBeVisible()
  })

  test('theme can be changed', async ({ appPage }) => {
    // Navigate to settings
    const settingsBtn = appPage.locator('[title="Settings"]')
    await settingsBtn.click()

    // Click Appearance tab
    const appearanceTab = appPage.getByText('Appearance')
    await appearanceTab.first().click()

    // Find theme select
    const themeSelect = appPage.locator('select').first()
    await expect(themeSelect).toBeVisible()

    // Change to dark mode
    await themeSelect.selectOption('dark')

    // HTML should have dark class
    const html = appPage.locator('html')
    await expect(html).toHaveClass(/dark/)

    // Change to light mode
    await themeSelect.selectOption('light')

    // HTML should not have dark class
    await expect(html).not.toHaveClass(/dark/)
  })

  test('back button returns to main page', async ({ appPage }) => {
    // Navigate to settings
    const settingsBtn = appPage.locator('[title="Settings"]')
    await settingsBtn.click()

    // Find back button
    const backBtn = appPage.locator('.back-btn, [class*="back"]').first()
    await expect(backBtn).toBeVisible()

    // Click back
    await backBtn.click()

    // Should see project list again
    const projectSection = appPage.locator('.project-section, .project-header, .empty-state')
    await expect(projectSection.first()).toBeVisible()
  })
})
