import { test, expect } from '../fixtures/tauri'

test.describe('Worktree List @worktree @critical', () => {
  // Note: In browser-only mode (without Tauri backend), the app shows empty state
  // These tests verify the UI renders correctly

  test('titlebar displayed', async ({ appPage }) => {
    // Wait for titlebar
    const titlebar = appPage.locator('.titlebar, [data-tauri-drag-region]')
    await expect(titlebar.first()).toBeVisible({ timeout: 10000 })
  })

  test('empty state displayed when no projects', async ({ appPage }) => {
    // Without Tauri backend, no projects can be loaded
    // App should show empty state or error gracefully
    const emptyState = appPage.locator('.empty-state')
    await expect(emptyState).toBeVisible({ timeout: 10000 })
  })

  test('empty state has add project button', async ({ appPage }) => {
    // Empty state should have an add project button
    const emptyState = appPage.locator('.empty-state')
    await expect(emptyState).toBeVisible({ timeout: 10000 })

    // Find add project button in empty state
    const addBtn = emptyState.locator('button')
    await expect(addBtn).toBeVisible()
  })

  test('titlebar has add project button', async ({ appPage }) => {
    // Titlebar should have add project button
    const addBtn = appPage.locator('[title="Add Project"]')
    await expect(addBtn).toBeVisible({ timeout: 10000 })
  })

  test('titlebar has refresh button', async ({ appPage }) => {
    // Titlebar should have refresh button
    const refreshBtn = appPage.locator('[title="Refresh"]')
    await expect(refreshBtn).toBeVisible({ timeout: 10000 })
  })
})
