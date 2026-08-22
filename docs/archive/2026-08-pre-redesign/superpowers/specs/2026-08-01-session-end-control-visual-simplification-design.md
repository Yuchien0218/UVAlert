# Session End Control Visual Simplification Design

**Date:** 2026-08-01
**Status:** Approved by user

## Goal

Reduce the visual weight of the reminder-page session-ending control without making the destructive action easy to trigger accidentally.

## Design

- Keep `提醒控制` as the section heading.
- Move `停止本次提醒` from the heading row to the end of the explanatory sentence.
- Render the trigger as a visually underlined text button while preserving a minimum 44px touch target.
- Keep the two-step confirmation flow.
- Remove `app-card`, shadow, border, and red top-bar treatment from the expanded confirmation.
- Keep danger communication in the explicit `結束本次提醒` label and red confirmation button.
- Keep the failure message's soft-red treatment because it communicates an actual operation error, not merely a destructive choice.
- Render the confirmation title as a styled `<p>` while preserving its `id` and the confirmation region's `aria-labelledby` reference.
- Treat the inline confirmation as a labelled `region`, not a non-modal `alertdialog`.
- Preserve focus transfer into the expanded confirmation and return focus to the trigger after cancellation.
- On narrow screens, only the confirmation action buttons become full width; obsolete heading/trigger media-query rules are removed.

## Component boundary

`SessionEndControl.vue` remains responsible only for local disclosure state, focus management, presenting session-end errors, and emitting `confirm`/`resetError`. The existing session transaction stays in the parent controller and is unchanged.

## Acceptance criteria

1. The resting state contains no side-by-side stop button.
2. The text trigger remains a semantic button with an underlined appearance and at least a 44px hit target.
3. Opening the control reveals an uncarded, labelled confirmation region.
4. Ending still requires a second explicit click.
5. Cancel restores the resting state without emitting `confirm`.
6. Ending state disables both confirmation actions.
7. Existing error copy and transaction behavior remain unchanged.
