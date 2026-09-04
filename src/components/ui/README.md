# `components/ui/` — the primitive library

The single vocabulary the app is built from. If you're about to write a
`<div class="rounded-xl border ...">` or a `<button>` from scratch,
stop — use one of these instead.

**Rule:** every visual affordance in the app composes these primitives.
One-off HTML with hand-styled classes is drift; treat it like a lint
error. If a screen needs a shape that isn't covered here, that's a
signal to add a new primitive — not to hand-roll.

## Tokens

All colors, spacing, radii, shadows, and motion come from
`tailwind.config.js`. Never hex-code a color, never px-code a radius —
use the token.

## Component roster

| Primitive       | Purpose                                    | Component        |
|-----------------|--------------------------------------------|------------------|
| Button          | Every clickable action                     | `Button.vue`     |
| Field           | Label + input + help/error wrapper         | `Field.vue`      |
| TextInput       | Single-line text                           | `TextInput.vue`  |
| Textarea        | Multi-line text                            | `Textarea.vue`   |
| Select          | Single-select dropdown                     | `Select.vue`     |
| Checkbox        | Boolean toggle (inline / in group)         | `Checkbox.vue`   |
| Switch          | Boolean toggle (setting-page style)        | `Switch.vue`     |
| Badge           | State pill (tone: primary/success/warn/…)  | `Badge.vue`      |
| StatusDot       | Small colored dot with pulse for "live"    | `StatusDot.vue`  |
| Avatar          | Person / event / brand mark                | `Avatar.vue`     |
| Kbd             | Keyboard shortcut visual                   | `Kbd.vue`        |
| Card            | Elevated container                         | `Card.vue`       |
| SectionHeader   | Title + optional action (one line)         | `SectionHeader.vue` |
| Divider         | Horizontal / vertical rule                 | `Divider.vue`    |
| Progress        | Linear progress bar                        | `Progress.vue`   |
| Skeleton        | Shimmering placeholder for loading         | `Skeleton.vue`   |
| EmptyState      | Icon + title + description + action        | `EmptyState.vue` |

Overlays (Menu, Popover, Tooltip, Tabs, Sheet, Modal, Toast) land in
Batch 1.B — right after this drop.

## Naming

All exports are the plain PascalCase noun (`Button`, not `AppButton`).
The old `AppButton`/`AppInput`/`AppSelect`/`AppModal` files still exist
under `components/common/` for backward compat during the migration;
new code imports from `@/components/ui/`.
