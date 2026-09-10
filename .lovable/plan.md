# Sharper, ClickUp-style structure across the app

Right now everything sits on the same cream tone with one thin border weight, so rows, groups and panels blur together — the schedule screen especially. The goal is a crisper, more "work tool" look: clear row grids, stronger group headers, coloured left edges, tighter type, and obvious hover/selected states, applied consistently everywhere.

## What changes

### 1. Contrast foundation
- Deepen the page background and keep panels pure white so every panel visibly lifts off the page.
- Two border weights instead of one: a light hairline between rows, a stronger line around and between panels/groups.
- Slightly darker secondary text, so labels read as labels and names read as names.
- Stronger hover state on every clickable row, and a clear selected/active state.

### 2. Schedule screen (the one on screen now)
- Milestone group headers become solid banded headers: darker tinted strip, uppercase milestone name, count and dates as compact meta on the right, chevron on the left.
- Work item rows get a fixed-height grid feel with alternating hairlines, a coloured status edge on the left of each row (critical / tight / slack), and column-aligned meta rather than stacked paragraphs.
- Timeline bars get more saturated fills with visible borders, month gridlines darkened, milestone diamonds made more prominent, and "today" marked with a vertical line.
- Dependency notes and float text pulled into a single quieter meta line so titles dominate.
- Drop the long explanatory paragraph under the chart; keep the legend only.

### 3. Same treatment everywhere
Apply the identical row/header/panel language to: production list cards, project dashboard cards, Department Work Queue, Scene Readiness Matrix, Documents list, Team & Departments, Search results, My Work, and the chat panels (header strip, transcript, composer keep their structure, just sharper edges and contrast).

### 4. Keep
- Sight & Sound palette (amber/cream/deep brown) — this is a contrast and structure pass, not a re-brand.
- Every status keeps colour **plus** text label plus icon.
- All current behaviour, permissions, mobile layouts and touch target sizes.

## Technical notes
- Add the new tokens and shared utilities in `src/styles.css`: `--border-strong`, deeper `--background`, row-hover and selected tokens, plus `data-row`, `group-header`, and `status-edge` utilities. No hardcoded colour classes in components.
- Rework `src/components/schedule/MasterTimeline.tsx` (group header, row grid, bars, gridlines, today marker) and remove the trailing explainer paragraph; also remove the now-unused reschedule preview helper left behind by the earlier nudge-button removal, or keep it wired only if the preview dialog is still reachable.
- Sweep the shared components (`StatusBadge`, `Discussion`/chat primitives, `DepartmentWorkQueue`, `SceneReadinessMatrix`, project routes, `index.tsx`, `team.tsx`, `search.tsx`, `inbox.tsx`) to consume the new utilities instead of ad-hoc borders.
- Verify with typecheck plus browser screenshots at 1280px and 390px: no horizontal overflow, no console errors, contrast visibly improved on the schedule, list, documents and chat screens.
