import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,

  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:1420',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'smoke',
      testMatch: /.*\.spec\.ts/,
      grep: /@smoke/,
    },
    {
      name: 'critical',
      testMatch: /.*\.spec\.ts/,
      grep: /@critical/,
    },
    {
      name: 'worktree',
      testMatch: /.*\.spec\.ts/,
      grep: /@worktree/,
    },
    {
      name: 'settings',
      testMatch: /.*\.spec\.ts/,
      grep: /@settings/,
    },
    {
      name: 'navigation',
      testMatch: /.*\.spec\.ts/,
      grep: /@navigation/,
    },
    {
      name: 'theme',
      testMatch: /.*\.spec\.ts/,
      grep: /@theme/,
    },
    {
      name: 'ide',
      testMatch: /.*\.spec\.ts/,
      grep: /@ide/,
    },
    {
      name: 'all',
      testMatch: /.*\.spec\.ts/,
    },
  ],

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../test-results/html' }],
  ],
  outputDir: '../test-results/artifacts',
})
