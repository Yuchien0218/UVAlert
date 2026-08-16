# Reminder Zero-Minute Due Tone Design

## Problem

The reminder page can display `0` remaining minutes while keeping the tracking-blue background. The home page already changes to the due-red state at the same boundary.

## Root cause

The reminder presentation calculates the local remaining minutes for a `timed_ring`, but it only selects the due presentation when the persisted `PrimaryAction.presentationType` has already changed to `due_card`. During the short interval before the projection refreshes, the local clock is due while the presentation remains timed.

## Decision

Treat a valid timed action with `remainingMinutes === 0` as due at the presentation boundary. Reuse the existing due presentation and preserve the action kind committed by the projection. Do not change IndexedDB, contracts, reducers, or transaction behavior.

The zone status list must use the same local due boundary for zones named by `PrimaryAction.affectedZoneInstanceIds`. Those zones switch from tracking/soon to the due tone and the due status label together. Zones outside the affected set keep their committed status.

## Verification

Add component regression tests where the clock equals `actionAt` while the action is still `timed_ring` and the zone is still `tracking`. The primary panel must render the due component and the affected zone group must render the due label and background. Existing timed, soon, committed-due, untimed, and mixed-zone tests must continue to pass.
