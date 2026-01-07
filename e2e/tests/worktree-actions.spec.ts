import { test, expect } from '../fixtures/tauri'

test.describe('Worktree Actions @worktree @critical', () => {
  // These tests use mocked Tauri API to verify UI behavior

  test('worktree list displays projects with worktrees', async ({ mockedPage }) => {
    // Wait for project to load
    const projectSection = mockedPage.locator('.project-section')
    await expect(projectSection).toBeVisible({ timeout: 10000 })

    // Project name should be visible
    const projectName = mockedPage.locator('.project-name')
    await expect(projectName).toContainText('test-project')
  })

  test('worktree rows are displayed for each worktree', async ({ mockedPage }) => {
    // Wait for worktree rows
    const worktreeRows = mockedPage.locator('.worktree-row')
    await expect(worktreeRows.first()).toBeVisible({ timeout: 10000 })

    // Should have 3 worktrees (main + 2 feature branches)
    await expect(worktreeRows).toHaveCount(3)
  })

  test('main branch has main badge', async ({ mockedPage }) => {
    // Wait for worktree rows
    await mockedPage.locator('.worktree-row').first().waitFor({ timeout: 10000 })

    // Main badge should be visible
    const mainBadge = mockedPage.locator('.worktree-main-badge')
    await expect(mainBadge).toBeVisible()
    await expect(mainBadge).toContainText('main')
  })

  test('worktree action menu opens on more button click', async ({ mockedPage }) => {
    // Wait for worktree rows
    const worktreeRow = mockedPage.locator('.worktree-row').first()
    await expect(worktreeRow).toBeVisible({ timeout: 10000 })

    // Click the more button
    const moreButton = worktreeRow.locator('.worktree-more')
    await moreButton.click()

    // Dropdown should appear
    const dropdown = mockedPage.locator('.worktree-actions-dropdown-portal')
    await expect(dropdown).toBeVisible()
  })

  test('action menu has edit option', async ({ mockedPage }) => {
    // Wait and click more button
    const worktreeRow = mockedPage.locator('.worktree-row').first()
    await expect(worktreeRow).toBeVisible({ timeout: 10000 })

    const moreButton = worktreeRow.locator('.worktree-more')
    await moreButton.click()

    // Edit option should be in dropdown
    const editButton = mockedPage.locator('.worktree-dropdown-item:has-text("Edit")')
    await expect(editButton).toBeVisible()
  })

  test('action menu has Open in Finder option', async ({ mockedPage }) => {
    // Wait and click more button
    const worktreeRow = mockedPage.locator('.worktree-row').first()
    await expect(worktreeRow).toBeVisible({ timeout: 10000 })

    const moreButton = worktreeRow.locator('.worktree-more')
    await moreButton.click()

    // Open in Finder option should be in dropdown
    const finderButton = mockedPage.locator('.worktree-dropdown-item:has-text("Open in Finder")')
    await expect(finderButton).toBeVisible()
  })

  test('action menu has Open Terminal option', async ({ mockedPage }) => {
    // Wait and click more button
    const worktreeRow = mockedPage.locator('.worktree-row').first()
    await expect(worktreeRow).toBeVisible({ timeout: 10000 })

    const moreButton = worktreeRow.locator('.worktree-more')
    await moreButton.click()

    // Open Terminal option should be in dropdown
    const terminalButton = mockedPage.locator('.worktree-dropdown-item:has-text("Open Terminal")')
    await expect(terminalButton).toBeVisible()
  })

  test('delete option NOT shown for main branch', async ({ mockedPage }) => {
    // Wait for worktree rows
    await mockedPage.locator('.worktree-row').first().waitFor({ timeout: 10000 })

    // Find the main branch row (has main badge)
    const mainRow = mockedPage.locator('.worktree-row:has(.worktree-main-badge)')
    await expect(mainRow).toBeVisible()

    // Click more button on main branch
    const moreButton = mainRow.locator('.worktree-more')
    await moreButton.click()

    // Wait for dropdown
    await mockedPage.locator('.worktree-actions-dropdown-portal').waitFor()

    // Delete option should NOT be visible for main branch
    const deleteButton = mockedPage.locator('.worktree-dropdown-item-danger:has-text("Delete")')
    await expect(deleteButton).not.toBeVisible()
  })

  test('delete option shown for non-main branches', async ({ mockedPage }) => {
    // Wait for worktree rows
    await mockedPage.locator('.worktree-row').first().waitFor({ timeout: 10000 })

    // Find a non-main branch row (feature-auth)
    const featureRow = mockedPage.locator('.worktree-row:has-text("feature-auth")')
    await expect(featureRow).toBeVisible()

    // Click more button
    const moreButton = featureRow.locator('.worktree-more')
    await moreButton.click()

    // Wait for dropdown
    await mockedPage.locator('.worktree-actions-dropdown-portal').waitFor()

    // Delete option should be visible with danger styling
    const deleteButton = mockedPage.locator('.worktree-dropdown-item-danger:has-text("Delete")')
    await expect(deleteButton).toBeVisible()
  })

  test('dropdown has divider before delete option', async ({ mockedPage }) => {
    // Wait for worktree rows
    await mockedPage.locator('.worktree-row').first().waitFor({ timeout: 10000 })

    // Find a non-main branch row
    const featureRow = mockedPage.locator('.worktree-row:has-text("feature-auth")')
    const moreButton = featureRow.locator('.worktree-more')
    await moreButton.click()

    // Divider should be present
    const divider = mockedPage.locator('.worktree-dropdown-divider')
    await expect(divider).toBeVisible()
  })
})

test.describe('Worktree Edit Page @worktree @critical', () => {
  test('edit page opens when clicking edit', async ({ mockedPage }) => {
    // Wait for worktree rows
    await mockedPage.locator('.worktree-row').first().waitFor({ timeout: 10000 })

    // Click on a feature branch row's more button
    const featureRow = mockedPage.locator('.worktree-row:has-text("feature-auth")')
    const moreButton = featureRow.locator('.worktree-more')
    await moreButton.click()

    // Click edit
    const editButton = mockedPage.locator('.worktree-dropdown-item:has-text("Edit")')
    await editButton.click()

    // Edit page title should appear
    const pageTitle = mockedPage.locator('.page-title:has-text("Edit Worktree")')
    await expect(pageTitle).toBeVisible({ timeout: 5000 })
  })

  test('edit page shows branch name field', async ({ mockedPage }) => {
    // Navigate to edit page
    await mockedPage.locator('.worktree-row').first().waitFor({ timeout: 10000 })
    const featureRow = mockedPage.locator('.worktree-row:has-text("feature-auth")')
    const moreButton = featureRow.locator('.worktree-more')
    await moreButton.click()
    await mockedPage.locator('.worktree-dropdown-item:has-text("Edit")').click()

    // Branch label should be visible
    const branchLabel = mockedPage.locator('.settings-label:has-text("Branch")')
    await expect(branchLabel).toBeVisible({ timeout: 5000 })
  })

  test('edit page has danger zone for non-main branches', async ({ mockedPage }) => {
    // Navigate to edit page for feature branch
    await mockedPage.locator('.worktree-row').first().waitFor({ timeout: 10000 })
    const featureRow = mockedPage.locator('.worktree-row:has-text("feature-auth")')
    const moreButton = featureRow.locator('.worktree-more')
    await moreButton.click()
    await mockedPage.locator('.worktree-dropdown-item:has-text("Edit")').click()

    // Danger zone should be visible
    const dangerZone = mockedPage.locator('.danger-zone')
    await expect(dangerZone).toBeVisible({ timeout: 5000 })
  })

  test('danger zone has delete button', async ({ mockedPage }) => {
    // Navigate to edit page for feature branch
    await mockedPage.locator('.worktree-row').first().waitFor({ timeout: 10000 })
    const featureRow = mockedPage.locator('.worktree-row:has-text("feature-auth")')
    const moreButton = featureRow.locator('.worktree-more')
    await moreButton.click()
    await mockedPage.locator('.worktree-dropdown-item:has-text("Edit")').click()

    // Wait for danger zone
    await mockedPage.locator('.danger-zone').waitFor({ timeout: 5000 })

    // Delete button should be in danger zone
    const deleteButton = mockedPage.locator('.danger-zone .btn-danger')
    await expect(deleteButton).toBeVisible()
    await expect(deleteButton).toContainText('Delete')
  })

  test('danger zone NOT shown for main branch', async ({ mockedPage }) => {
    // Navigate to edit page for main branch
    await mockedPage.locator('.worktree-row').first().waitFor({ timeout: 10000 })
    const mainRow = mockedPage.locator('.worktree-row:has(.worktree-main-badge)')
    const moreButton = mainRow.locator('.worktree-more')
    await moreButton.click()
    await mockedPage.locator('.worktree-dropdown-item:has-text("Edit")').click()

    // Wait for page to load
    await mockedPage.locator('.page-title:has-text("Edit Worktree")').waitFor({ timeout: 5000 })

    // Danger zone should NOT be visible for main branch
    const dangerZone = mockedPage.locator('.danger-zone')
    await expect(dangerZone).not.toBeVisible()
  })

  test('edit page has cancel button', async ({ mockedPage }) => {
    // Navigate to edit page
    await mockedPage.locator('.worktree-row').first().waitFor({ timeout: 10000 })
    const featureRow = mockedPage.locator('.worktree-row:has-text("feature-auth")')
    const moreButton = featureRow.locator('.worktree-more')
    await moreButton.click()
    await mockedPage.locator('.worktree-dropdown-item:has-text("Edit")').click()

    // Cancel button should be visible
    const cancelButton = mockedPage.locator('.btn-secondary:has-text("Cancel")')
    await expect(cancelButton).toBeVisible({ timeout: 5000 })
  })

  test('edit page has save button', async ({ mockedPage }) => {
    // Navigate to edit page
    await mockedPage.locator('.worktree-row').first().waitFor({ timeout: 10000 })
    const featureRow = mockedPage.locator('.worktree-row:has-text("feature-auth")')
    const moreButton = featureRow.locator('.worktree-more')
    await moreButton.click()
    await mockedPage.locator('.worktree-dropdown-item:has-text("Edit")').click()

    // Save button should be visible
    const saveButton = mockedPage.locator('.btn-primary:has-text("Save")')
    await expect(saveButton).toBeVisible({ timeout: 5000 })
  })
})
