import { test, expect } from '../fixtures/tauri'

test.describe('IDE Settings @ide @critical', () => {
  test('IDE selector has all preset options', async ({ appPage }) => {
    // Go to settings > IDE
    await appPage.locator('[title="Settings"]').click()
    await appPage.locator('.settings-nav-item').filter({ hasText: 'IDE' }).click()
    await expect(appPage.locator('.settings-content-title')).toHaveText('IDE')

    // Check IDE selector exists
    const ideSelect = appPage.locator('.settings-select').first()
    await expect(ideSelect).toBeVisible()

    // Click to open options
    await ideSelect.click()

    // Check common IDE options exist
    const options = ideSelect.locator('option')
    const optionTexts = await options.allTextContents()

    expect(optionTexts).toContain('VS Code')
    expect(optionTexts).toContain('Cursor')
    expect(optionTexts).toContain('IntelliJ IDEA')
  })

  test('can change IDE preset', async ({ appPage }) => {
    // Go to settings > IDE
    await appPage.locator('[title="Settings"]').click()
    await appPage.locator('.settings-nav-item').filter({ hasText: 'IDE' }).click()

    // Select Cursor
    const ideSelect = appPage.locator('.settings-select').first()
    await ideSelect.selectOption('cursor')

    // Verify selection
    await expect(ideSelect).toHaveValue('cursor')
  })
})

test.describe('IDE Settings @ide', () => {
  test('IDE selector values can be changed', async ({ appPage }) => {
    // Go to settings > IDE
    await appPage.locator('[title="Settings"]').click()
    await appPage.locator('.settings-nav-item').filter({ hasText: 'IDE' }).click()

    // Select different IDE options
    const ideSelect = appPage.locator('.settings-select').first()

    await ideSelect.selectOption('idea')
    await expect(ideSelect).toHaveValue('idea')

    await ideSelect.selectOption('webstorm')
    await expect(ideSelect).toHaveValue('webstorm')

    await ideSelect.selectOption('code')
    await expect(ideSelect).toHaveValue('code')
  })
})
