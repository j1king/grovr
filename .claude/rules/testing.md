# E2E Testing Rules (Playwright)

## Structure

- Tests in `e2e/tests/`, fixture in `e2e/fixtures/tauri.ts`
- Use Tauri fixture: `import { test } from '../fixtures/tauri'`

## Tags

Add to describe/test names for filtering: `@smoke`, `@critical`, `@worktree`, `@settings`, `@navigation`, `@theme`, `@ide`

## Commands

```bash
pnpm test:e2e       # All
pnpm test:smoke     # Quick validation
pnpm test:critical  # Must-pass for release
```

## Principles

- Test user-visible behavior, not implementation details
- Each test must be independent - no shared state between tests
- Use accessible locators: `getByRole()`, `getByLabel()`, `[data-testid]`
- Let Playwright auto-wait - never use `waitForTimeout()`
- Mock external APIs (GitHub, Jira) - don't hit real endpoints

## Preview

Use `/preview` skill or `./scripts/preview.sh start` for isolated test environment with sample worktrees.

## Don'ts

- No `waitForTimeout()` - use assertions
- No test order dependencies
- No hardcoded data that may change
- No ignoring flaky tests - fix root cause
