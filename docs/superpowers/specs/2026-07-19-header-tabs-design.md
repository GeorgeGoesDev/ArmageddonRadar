# Armageddon Radar — Header Action Bar (fix icon/title overlap)

**Date:** 2026-07-19
**Status:** Approved design → ready for implementation plan
**Scope:** Restructure the dashboard `Header` so its action icons no longer
overlap the app title on small screens / large system fonts. Single-component,
layout-only change.

## Problem

The dashboard `Header` is a single row: the radar icon + "ARMAGEDDON RADAR"
title in a `flex-1` container on the left, and four unlabeled icon `Pressable`s
on the right (watchlist ★, risk ☠, week 📅, settings ⚙). The title `Text` has no
`numberOfLines`/shrink, so with a large system font on a narrow device it grows
into the icons and overlaps them (reported by a user on a small phone with a
large font setting).

## Design

Change `Header` from one row to a column of two rows.

**Row 1 — title (full width):**
- Radar icon + title, unchanged content.
- Add `numberOfLines={1}` and `flexShrink` (a `flex-1`/`flex-shrink` wrapper) to
  the title so it ellipsizes rather than overflowing in any extreme font case —
  a safety net; with the icons gone from this row it has the whole width.

**Row 2 — segmented action bar:**
- A rounded container: `borderRadius` (rounded-xl), `backgroundColor:
  colors.charcoal`, `borderWidth: 1`, `borderColor: colors.cardBorder`,
  `overflow: hidden`, a small top margin.
- Four equal cells (`flex-1`), each a `Pressable` with vertical padding
  (comfortable tap target, so the old `hitSlop` is dropped), a centered icon.
- Thin dividers between cells: the first three cells carry a right border in
  `colors.gridLineFaint`.
- Icons, colours, and handlers are exactly the current ones:
  - watchlist — `star`, `colors.threatYellow`, `onWatchlist`
  - risk — `skull-outline`, `colors.threatOrange`, `onRisk`
  - week — `calendar-week`, `colors.accentBlue`, `onWeek`
  - settings — `cog`, `colors.accentBlue`, `onSettings`

No labels (icons only), so no new catalog strings and localization/key-parity is
unaffected. The `Header` prop signature (`onWatchlist`, `onWeek`, `onSettings`,
`onRisk`) is unchanged, so its call site in `DashboardScreen` needs no edit.

## Files

```
Changed:
  src/screens/DashboardScreen.tsx   (the Header function only)
```

No new dependency, no new strings; JS-only → no prebuild, just a rebuild.

## Testing

Layout-only change with no logic, consistent with the header having no unit test:
- `npx tsc --noEmit` clean; existing tests unaffected (107 pass).
- **On-device, the reproducing case:** a narrow width with a large system font
  (Android Settings → Display → Font size, largest) — confirm the title and the
  action bar no longer overlap, the four cells are tappable and open the right
  sheets, and the layout looks right at default font size too, in both English
  and Greek.

## Acceptance criteria

- The dashboard header shows the title on its own line and the four actions in a
  segmented bar directly below it.
- At the largest system font on a narrow screen, nothing overlaps and every
  action cell opens its sheet (watchlist, risk board, week, settings).
- At default font size the header still looks intentional and tidy; no
  regressions in either language.

## Out of scope

Text labels on the actions (icon-only, as today); reordering or renaming the
actions; any change to the sheets they open; a bottom tab bar or navigation
restructure.
