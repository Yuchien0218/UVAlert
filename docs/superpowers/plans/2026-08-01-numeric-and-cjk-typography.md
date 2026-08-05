# Numeric and CJK Typography Implementation Plan

**Goal:** Unify numeric typography, regroup countdown information on home and reminder panels, and normalize CJK body copy spacing.

## Tasks

1. Add component tests that define the new countdown grouping and numeric classes.
2. Update `HomeReminderSummary.vue` and `ReminderPanel.vue` so the time sits below the large number while title and advice stay together.
3. Apply `stat-figure` to pure numeric and time displays in countdown, UV, setup, and product interfaces.
4. Audit body-copy styles: use normal letter spacing and a minimum `1.7` line height without changing headings, labels, buttons, or the font stack.
5. Run focused tests, the full web test suite, production build, and static CSS scans.

## Constraints

- Keep `--font-sans` unchanged.
- Do not apply the mono font to full Chinese sentences.
- Do not alter reminder domain rules, IndexedDB, contracts, or reducers.
