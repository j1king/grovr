import { test, expect } from '../fixtures/tauri'
import type { Page } from '@playwright/test'

async function openTerminalSettings(page: Page) {
  await page.locator('[title="Settings"]').click()
  await page.getByRole('button', { name: 'Terminal', exact: true }).click()
  await expect(page.getByLabel('Default terminal')).toBeVisible()
}

test.describe('Terminal settings @settings @critical', () => {
  test('defaults to Terminal and remembers iTerm2 after leaving settings', async ({ mockedPage }) => {
    await openTerminalSettings(mockedPage)
    const selector = mockedPage.getByLabel('Default terminal')
    await expect(selector).toHaveValue('Terminal')
    await expect(selector.locator('option')).toHaveText(['Terminal', 'iTerm2', 'Warp', 'Custom'])

    await selector.selectOption('iTerm')
    await expect(selector).toBeEnabled()
    await mockedPage.getByRole('button', { name: 'Back to App' }).click()
    await openTerminalSettings(mockedPage)
    await expect(mockedPage.getByLabel('Default terminal')).toHaveValue('iTerm')
  })

  test('saves a custom app path and restores it when revisiting the tab', async ({ mockedPage }) => {
    await openTerminalSettings(mockedPage)
    await mockedPage.getByLabel('Default terminal').selectOption('custom')
    const input = mockedPage.getByLabel('Application name or path')
    const save = mockedPage.getByRole('button', { name: 'Save', exact: true })
    await expect(save).toBeDisabled()
    await input.fill('   ')
    await expect(save).toBeDisabled()
    await input.fill('  /Applications/My Terminal.app  ')
    await save.click()
    await expect(save).toBeDisabled()
    await mockedPage.getByRole('button', { name: 'IDE', exact: true }).click()
    await mockedPage.getByRole('button', { name: 'Terminal', exact: true }).click()
    await expect(mockedPage.getByLabel('Default terminal')).toHaveValue('custom')
    await expect(mockedPage.getByLabel('Application name or path')).toHaveValue('/Applications/My Terminal.app')
  })

  test('shows a failed save and keeps the previous terminal selected', async ({ mockedPage }) => {
    await mockedPage.evaluate(() => {
      const internals = (window as unknown as { __TAURI_INTERNALS__: {
        invoke: (cmd: string, args?: unknown) => Promise<unknown>
      } }).__TAURI_INTERNALS__
      const invoke = internals.invoke
      internals.invoke = async (cmd, args) => {
        if (cmd === 'set_terminal') throw 'Disk is full'
        return invoke(cmd, args)
      }
    })
    await openTerminalSettings(mockedPage)
    await mockedPage.getByLabel('Default terminal').selectOption('Warp')
    await expect(mockedPage.getByRole('alert')).toContainText('Disk is full')
    await expect(mockedPage.getByLabel('Default terminal')).toHaveValue('Terminal')
  })

  test('does not offer macOS apps on other platforms', async ({ mockedPage }) => {
    await mockedPage.evaluate(() => {
      (window as unknown as { __TAURI_OS_PLUGIN_INTERNALS__: { platform: string } })
        .__TAURI_OS_PLUGIN_INTERNALS__.platform = 'linux'
    })
    await mockedPage.locator('[title="Settings"]').click()
    await mockedPage.getByRole('button', { name: 'Terminal', exact: true }).click()
    await expect(mockedPage.getByText('Terminal selection is available on macOS.')).toBeVisible()
    await expect(mockedPage.getByLabel('Default terminal')).toHaveCount(0)
  })

  test('Open Terminal sends the worktree path and displays launch failures', async ({ mockedPage }) => {
    let requestedPath: unknown
    await mockedPage.exposeFunction('recordTerminalPath', (path: unknown) => { requestedPath = path })
    await mockedPage.evaluate(() => {
      const win = window as unknown as {
        __TAURI_INTERNALS__: { invoke: (cmd: string, args?: { path?: string }) => Promise<unknown> }
        recordTerminalPath: (path: unknown) => Promise<void>
      }
      const invoke = win.__TAURI_INTERNALS__.invoke
      win.__TAURI_INTERNALS__.invoke = async (cmd, args) => {
        if (cmd === 'open_terminal') {
          await win.recordTerminalPath(args?.path)
          throw 'Failed to open iTerm: application not found'
        }
        return invoke(cmd, args)
      }
    })
    await mockedPage.locator('.worktree-row').first().locator('.worktree-more').click()
    await mockedPage.getByRole('button', { name: 'Open Terminal', exact: true }).click()
    await expect(mockedPage.getByText('Failed to open iTerm: application not found', { exact: true })).toBeVisible()
    expect(requestedPath).toBe('/tmp/test-project/repo')
  })
})
