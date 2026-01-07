# React & TypeScript Rules

## Component Structure

- Pages in `src/pages/` with `onBack` prop pattern
- Reusable UI in `src/components/ui/` using Radix UI + CVA
- Use `cn()` from `@/lib/utils` for class merging

## Tauri Integration

- All backend calls through `src/lib/api.ts` using `invoke()`
- Always wrap invoke in try/catch - errors come as strings from Rust
- Types must match between `src/types/` and `src-tauri/src/types.rs`

## State & Hooks

- useState for local state, useEffect for side effects
- useCallback for handlers passed to children
- React 19 Compiler may auto-optimize - don't over-memoize

## TypeScript

- All types in `src/types/index.ts`
- Always type component props - no implicit any
- Use `unknown` over `any`, then narrow with type guards

## Don'ts

- No `any` or `@ts-ignore`
- No business logic in components - extract to hooks or api.ts
- No data fetching outside useEffect
- No new objects/arrays in render without memoization
