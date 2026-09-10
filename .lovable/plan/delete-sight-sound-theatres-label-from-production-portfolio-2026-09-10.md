# Delete "Sight & Sound Theatres" label from Production Portfolio

## What to change
Remove the static `<p className="rule-label">Sight &amp; Sound Theatres</p>` element from `src/routes/index.tsx` (currently line 75), directly above the "Production Portfolio" heading.

## Why
The user selected this label in the preview and asked to delete it. The page heading already identifies the section, so the secondary label is redundant.

## How
Edit `src/routes/index.tsx` to delete the `<p>` element while keeping the surrounding `<div>`, `<h1>`, and the gold rule divider intact. No other files or data sources need to change.

## Verification
- Run typecheck (`bunx tsgo --noEmit` or equivalent) to ensure the JSX remains valid.
- Visually confirm in the preview that the label is gone and the heading still renders correctly.
