import { test, expect } from '../fixtures/tauri'

test.describe('Theme @theme @critical', () => {
  test('theme selector has all options', async ({ appPage }) => {
    // Go to settings > Appearance
    await appPage.locator('[title="Settings"]').click()
    await appPage.locator('.settings-nav-item').filter({ hasText: 'Appearance' }).click()
    await expect(appPage.locator('.settings-content-title')).toHaveText('Appearance')

    // Check theme selector exists
    const themeSelect = appPage.locator('.settings-select').first()
    await expect(themeSelect).toBeVisible()

    // Click to open options
    await themeSelect.click()

    // Check all theme options exist
    const options = themeSelect.locator('option')
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThanOrEqual(3) // At least System, Light, Dark
  })

  test('can switch to dark theme', async ({ appPage }) => {
    // Go to settings > Appearance
    await appPage.locator('[title="Settings"]').click()
    await appPage.locator('.settings-nav-item').filter({ hasText: 'Appearance' }).click()

    // Select dark theme
    const themeSelect = appPage.locator('.settings-select').first()
    await themeSelect.selectOption('dark')

    // Check that dark class is applied to html
    const html = appPage.locator('html')
    await expect(html).toHaveClass(/dark/)
  })

  test('can switch to light theme', async ({ appPage }) => {
    // Go to settings > Appearance
    await appPage.locator('[title="Settings"]').click()
    await appPage.locator('.settings-nav-item').filter({ hasText: 'Appearance' }).click()

    // Select light theme
    const themeSelect = appPage.locator('.settings-select').first()
    await themeSelect.selectOption('light')

    // Check that dark class is NOT applied
    const html = appPage.locator('html')
    await expect(html).not.toHaveClass(/dark/)
  })
})

test.describe('Theme @theme', () => {
  test('theme changes are applied immediately', async ({ appPage }) => {
    // Go to settings > Appearance
    await appPage.locator('[title="Settings"]').click()
    await appPage.locator('.settings-nav-item').filter({ hasText: 'Appearance' }).click()

    // Check initial state
    const themeSelect = appPage.locator('.settings-select').first()
    await expect(themeSelect).toBeVisible()

    // Switch between themes
    await themeSelect.selectOption('dark')
    await expect(appPage.locator('html')).toHaveClass(/dark/)

    await themeSelect.selectOption('light')
    await expect(appPage.locator('html')).not.toHaveClass(/dark/)

    // Verify theme select still works
    await themeSelect.selectOption('dark')
    await expect(appPage.locator('html')).toHaveClass(/dark/)
  })
})
