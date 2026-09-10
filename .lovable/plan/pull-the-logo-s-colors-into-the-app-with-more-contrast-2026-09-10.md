# Pull the logo's colors into the app, with more contrast

The logo uses three colors: a deep near-black brown, a warm cream, and an amber gold (#C8883C). Right now the app is almost all pale cream on pale cream, so panels, headers and lists blend into each other. The fix is to make those three logo colors the backbone of the layout and give every surface a clear edge.

## What changes visually

**Top bar** becomes the logo's deep brown-black band with cream text and gold for the page you're on — so the logo sits inside its own color instead of on a pale strip, and the bar reads as a distinct layer. The name, notices and role controls all switch to their cream/gold variants.

**Page background vs. panels.** The page gets a slightly deeper warm cream; cards, chat panels and tables stay near-white. That single step apart is what makes each block read as its own object.

**Edges and headers.** Borders go from barely-there to clearly visible, cards get a soft shadow, and every panel header (Production updates, Schedule, a chat's Messages/Files bar, table heads) sits on the warm tint with a defined bottom rule. Section headings gain a thin gold rule so the eye can find where a section starts.

**Gold, used sparingly.** The logo's amber replaces the current duller gold for the active nav item, focus rings, primary emphasis and the selected view chip. It stays an accent — never a background wash and never a status color.

**Status colors get more bite.** Complete / at risk / blocked / info keep their current meanings but move to deeper text with a slightly stronger tinted background, so a blocked item is obvious at a glance. Each keeps its text label and icon.

**Selected vs. unselected controls.** Tabs, view switchers, status chips and the Messages/Files toggle get a clear filled-vs-outline difference rather than two shades of cream.

## What does not change

No layout, wording, data or behavior changes. Nothing moves; only color, edge and weight.

## Technical notes

- All of it is token work in `src/styles.css`: add logo-derived `--gold-500/700/100`, a deeper `--cream-100` page background, a darker `--border`, a `--surface-raised` shadow token, and a dark-bar set (`--bar`, `--bar-foreground`, `--bar-border`). Status pairs get deeper foregrounds.
- New utilities alongside the existing ones: `surface-card` gains the shadow, plus `panel-header`, `section-rule`, and `chip-selected` / `chip-quiet` so the same treatment is reused everywhere instead of re-styled per file.
- Component edits are class swaps only, in `AppHeader.tsx`, `BottomTabBar.tsx`, `StatusBadge.tsx`, `Discussion.tsx`, `AttachmentList.tsx`, `TaskDetailPanel.tsx`, the three schedule views, and the route files for the production list, dashboard, documents, team and My Work — replacing ad-hoc `bg-cream-soft` / `border-border` combinations with the shared utilities.
- Any hardcoded color found during the pass (for example the header's inline `#302B27`) moves to a token.
- Verification: typecheck, then screenshots at 1280px and 390px on the production list, a dashboard, Timeline, a chat, Documents and My Work, checking contrast on the dark bar and that no page overflows.
