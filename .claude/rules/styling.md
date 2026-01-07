# Styling Rules (TailwindCSS)

## Theme

- CSS variables in `src/index.css`, referenced in `tailwind.config.js`
- Use semantic colors: `bg-background`, `text-foreground`, `bg-primary`
- Dark mode via `.dark` class on root element

## Dark Mode

- Layer backgrounds for depth: `bg-background` > `bg-card` > `bg-popover`
- Use `text-muted-foreground` for secondary text
- NEVER use pure black (`bg-black`) - too harsh on OLED

## Components

- Use CVA for variants, `cn()` for class merging
- Follow existing patterns in `src/components/ui/`
- Radix UI for accessible primitives

## Layout

- Page pattern: `flex flex-col h-full` with flex-shrink-0 header/footer
- Use CSS Grid for aligned columns: `grid-cols-[1fr_auto_auto]`
- dnd-kit for drag-and-drop with CSS transforms

## Accessibility

- Always add `title`/`aria-label` to icon buttons
- Maintain visible focus states (`focus-visible:ring-2`)
- Test contrast ratios (4.5:1 for text, 3:1 for UI)

## Don'ts

- No inline styles - use Tailwind
- No `!important` overrides
- No arbitrary values (`[123px]`) - add to config if needed
- No colors outside the defined theme
