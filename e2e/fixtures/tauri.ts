import { test as base, expect, Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

export interface TestContext {
  name: string
  testRoot: string
  port: number
  configDir: string
  repoPath: string
}

function getTestContext(): TestContext {
  const testRoot = process.env.TEST_ROOT || '/tmp/grovr-desktop-test-default'
  const port = parseInt(process.env.TEST_PORT || '1420', 10)

  return {
    name: process.env.TEST_NAME || 'default',
    testRoot,
    port,
    configDir: path.join(testRoot, 'config'),
    repoPath: path.join(testRoot, 'repo'),
  }
}

export function readSettings(ctx: TestContext): Record<string, unknown> {
  const settingsPath = path.join(ctx.configDir, 'settings.json')
  return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
}

export function writeSettings(ctx: TestContext, settings: Record<string, unknown>): void {
  const settingsPath = path.join(ctx.configDir, 'settings.json')
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
}

// Tauri web view fixture (testing via browser)
export const test = base.extend<{
  ctx: TestContext
  appPage: Page
}>({
  ctx: async ({}, use) => {
    await use(getTestContext())
  },

  appPage: async ({ page, ctx }, use) => {
    const baseURL = `http://localhost:${ctx.port}`
    await page.goto(baseURL)
    await page.waitForLoadState('domcontentloaded')
    await use(page)
  },
})

export { expect }
