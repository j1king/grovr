import { test, expect } from '../fixtures/tauri'

test.describe('Navigation @navigation @critical', () => {
  test('can navigate to settings and back', async ({ appPage }) => {
    // Click settings button
    const settingsBtn = appPage.locator('[title="Settings"]')
    await expect(settingsBtn).toBeVisible()
    await settingsBtn.click()

    // Should be on settings page
    const settingsSidebar = appPage.locator('.settings-sidebar')
    await expect(settingsSidebar).toBeVisible()

    // Click back button
    const backBtn = appPage.locator('.settings-back')
    await expect(backBtn).toBeVisible()
    await backBtn.click()

    // Should be back to main page
    const titlebar = appPage.locator('.titlebar')
    await expect(titlebar).toBeVisible()
  })

  test('settings tabs navigate correctly', async ({ appPage }) => {
    // Go to settings
    await appPage.locator('[title="Settings"]').click()
    await expect(appPage.locator('.settings-sidebar')).toBeVisible()

    // Click Appearance tab
    const appearanceTab = appPage.locator('.settings-nav-item').filter({ hasText: 'Appearance' })
    await appearanceTab.click()
    await expect(appPage.locator('.settings-content-title')).toHaveText('Appearance')

    // Click IDE tab
    const ideTab = appPage.locator('.settings-nav-item').filter({ hasText: 'IDE' })
    await ideTab.click()
    await expect(appPage.locator('.settings-content-title')).toHaveText('IDE')

    // Click GitHub tab
    const githubTab = appPage.locator('.settings-nav-item').filter({ hasText: 'GitHub' })
    await githubTab.click()
    await expect(appPage.locator('.settings-content-title')).toHaveText('GitHub')

    // Click Jira tab
    const jiraTab = appPage.locator('.settings-nav-item').filter({ hasText: 'Jira' })
    await jiraTab.click()
    await expect(appPage.locator('.settings-content-title')).toHaveText('Jira')

    // Click back to General
    const generalTab = appPage.locator('.settings-nav-item').filter({ hasText: 'General' })
    await generalTab.click()
    await expect(appPage.locator('.settings-content-title')).toHaveText('General')
  })
})

test.describe('Navigation @navigation', () => {
  test('add project button navigates correctly', async ({ appPage }) => {
    // Click add project button
    const addBtn = appPage.locator('[title="Add Project"]')
    await expect(addBtn).toBeVisible()
    await addBtn.click()

    // Should show add project form or page
    const addProjectTitle = appPage.locator('text=Add Project')
    await expect(addProjectTitle.first()).toBeVisible({ timeout: 5000 })
  })
})
