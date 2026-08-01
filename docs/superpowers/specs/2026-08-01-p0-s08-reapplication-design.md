# P0 S-08 Reapplication and Product Catalog Design

**Date:** 2026-08-01  
**Status:** Approved design, pending written-spec review

## Goal

Implement the complete P0 S-08 `/reminder/reapply` flow. A user can confirm the actual zones, product used for each zone, and actual application time. One submission may contain different products or different immutable product-label snapshots, while every selected zone appears exactly once.

The submitted result is committed through one versioned command and one IndexedDB transaction. A partial write must never become visible.

## Scope

This slice includes:

- a local saved-product catalog with stable product identity and display name;
- immutable product-label snapshots referenced at application time;
- recent/current product choices for the active Session;
- `ReapplyCommandV1` contract and validation;
- domain planning for one confirmation group and one or more mutually exclusive ApplicationEvents;
- an atomic IndexedDB reapplication transaction;
- a Vue controller and `/reminder/reapply` page;
- suggested-zone, all-zone, and custom-zone selection modes;
- per-zone product assignment;
- quick and custom application-time selection;
- success summary and a correction entry placeholder that does not claim correction is already implemented;
- conflict, storage, validation, and clock error states.

Full correction transaction implementation remains a separate P0 slice, but the successful result must retain the identifiers required to open it later.

## Product Catalog

### Product Record

Introduce a versioned local product record with:

- `productId`: stable non-empty identifier;
- `displayName`: user-facing name, trimmed and length-limited;
- `currentSnapshot`: latest confirmed `ProductLabelSnapshotV1`;
- `snapshotFingerprint`: deterministic fingerprint of the current snapshot;
- `createdAt` and `updatedAt` UTC instants;
- `status`: `active` or `stopped`.

The existing single current-product snapshot must be migrated or imported into the catalog without losing the Setup flow. If it has no user-entered name, it receives a neutral local label such as `目前使用的產品`; the system must not invent a brand or sunscreen claim.

### Snapshot Semantics

An ApplicationEvent stores the exact snapshot used at submission time. Later edits to a saved product create a new current snapshot and fingerprint but never mutate older ApplicationEvents.

Products whose current snapshot is expired, abnormal, discomfort-reported, no-claim, or identity-unconfirmed may remain visible for historical context but cannot be selected to start a new eligible sunscreen timer. The UI must explain the applicable restriction.

### Product Choices

The reapplication form obtains choices from:

1. products currently referenced by selected zones;
2. active saved products;
3. the existing session-only product path when the user deliberately chooses not to save a product.

The UI displays a user-facing name and relevant label summary. Fingerprints and internal IDs are not shown as product names.

## Reapply Command

Introduce `ReapplyCommandV1` using the existing command envelope and containing:

- `commandType: "record_reapplication"`;
- `expectedRevision`;
- `payload.applicationConfirmationId`;
- `payload.appliedAt`;
- `payload.applications[]`.

Each application contains:

- a new event ID;
- one or more zone instance IDs;
- nullable saved `sourceProductId`;
- product snapshot fingerprint;
- immutable `ProductLabelSnapshotV1`.

### Contract Validation

The schema rejects commands when:

- there are no applications;
- any application has an empty zone set;
- a zone appears in more than one application in the same command;
- an event ID is duplicated;
- an event ID equals the confirmation-group ID;
- the snapshot or fingerprint is missing or invalid;
- `expectedRevision` is not a positive integer;
- `appliedAt` or command timestamps are malformed.

Session-dependent validation remains in the domain/repository boundary and rejects when:

- the Session does not exist or has ended;
- `expectedRevision` differs from current revision;
- any selected zone is not an active tracked zone in the Session;
- a selected zone is not currently configured with a topical method;
- the trusted clock does not permit the submitted future time;
- the same saved product ID resolves to a different current snapshot than the snapshot the user confirmed, unless the submitted snapshot is an explicit session-only snapshot.

## Domain Planning and Projection

`planReapplication` consumes the validated command, existing event stream, current Session record, and trusted reducer clock.

It produces:

- one `ApplicationConfirmationGroupV1` with all final selected zones;
- one `ApplicationEventV1` per unique product ID and snapshot fingerprint pair;
- a replayed `SessionProjection` at `revision + 1`;
- the updated Session record;
- committed group and event IDs.

Application groups use `correctionAction: "create"` and `correctionOfGroupId: null`.

Only selected zones receive new ApplicationEvents. Unselected zones preserve their existing application, deadlines, causes, and projection state.

Water context does not automatically reset a water deadline. The reducer continues to apply the existing rule that an in-water application record does not fabricate a new water-start event or extend an active water deadline.

An ineligible or unknown snapshot may record the factual application event but does not create a fabricated timed deadline. Projection displays the corresponding untimed action state.

## IndexedDB Transaction

`LocalSessionRepository.reapply(command, clock)` performs one read-write transaction over:

- ProtectionSessions;
- ProtectionZoneStates;
- ApplicationConfirmationGroups;
- ApplicationEvents;
- ActiveSessionLocks;
- ClientSequences;
- CommandReceipts;
- product tables required to validate saved product identity and snapshot state.

The transaction:

1. returns an existing receipt for a repeated idempotency key;
2. verifies the active Session lock and owner;
3. verifies revision and client sequence;
4. loads the complete event stream;
5. validates selected zones and product assignments;
6. plans the confirmation group, events, and new projection;
7. writes the group and all events;
8. writes all affected zone projections and the updated Session revision;
9. advances client sequence;
10. writes the command receipt;
11. commits before publishing cross-context invalidation.

Any error rolls back all writes. No confirmation group, event, zone state, receipt, or revision may remain partially updated.

## Reapplication Controller

`createReapplicationController` owns only the S-08 draft and submission lifecycle. It receives repositories, identity ports, the app boot controller, ID factory, trusted time source, and connectivity.

Readonly controller state includes:

- phase: `idle | loading | ready | submitting | success | error`;
- current Session revision used to create the draft;
- suggested zone IDs;
- selected zone IDs;
- available product choices;
- assignment per selected zone;
- selected application time;
- validation errors;
- success receipt summary;
- recoverable error kind.

Explicit controller actions include:

- load from the current Session;
- select suggested zones;
- select all active topical zones;
- toggle individual zones;
- assign a product to a zone;
- choose a quick or custom time;
- validate and submit;
- reset a recoverable error.

The controller reuses one pending command for a retry after a persistence error so idempotency remains stable. A changed Session revision discards that pending command, refreshes projection, and requires reconfirmation.

## `/reminder/reapply` User Flow

### Entry and Guards

- `record_reapplication` actions navigate to `/reminder/reapply`.
- Other action kinds retain their existing routing behavior.
- No active Session redirects to `/reminder` and displays the reminder empty state there.
- An ended or revision-changed Session requires the current projection to be reviewed again.
- The bottom navigation is hidden during this focused confirmation flow; Back and Cancel return to `/reminder` without committing.

### Information Order

1. Page title and short explanation that only confirmed zones will update.
2. Selection mode controls: suggested, all active topical, custom.
3. Selected-zone list grouped only when product assignment and status are identical.
4. Product selector for each zone/group.
5. Actual application-time selector.
6. Final summary of zones, products, snapshots, and time.
7. One primary `確認已補擦` button and one Cancel action.
8. Safety note explaining that recording does not guarantee protection or safe exposure.

### Suggested Zones

Suggested selection includes active zones whose timing status is `reapply_due` or `reapply_soon`. If an action supplies affected zones and none of them meet those statuses, the affected active topical zones become the suggestion. The user must still confirm before any write.

### Product Assignment

The initial assignment uses each zone's current product/snapshot when resolvable. If multiple selected zones currently use different products, those assignments remain different.

Changing one zone's product does not silently update other zones. The UI may offer an explicit `套用至所有已選部位` action, but it must state which product will be applied.

### Application Time

Quick choices are:

- now;
- 15 minutes ago;
- 30 minutes ago;
- 60 minutes ago;
- custom date and time.

`now` is visually preselected but requires form submission. The rendered summary always displays the resolved absolute local time. Future time is rejected. Clock-untrusted behavior follows the existing conservative clock policy and never extends a deadline using an untrusted future value.

### Success

After a successful transaction:

- app boot refreshes the Session projection;
- the page shows `已更新：{zones}，{time}` and the product grouping summary;
- continuing returns to `/reminder`;
- a `更正` entry may route to the later correction slice using the committed confirmation-group ID, but must not display a working correction claim until that route is implemented.

## Error Handling

- Empty selection: inline error near zone selection; no repository call.
- Missing product assignment: inline error on the affected zone/group.
- Future or invalid time: inline error near time control.
- Product changed since confirmation: reload product choices and require reconfirmation.
- Revision conflict: refresh Session and require reconfirmation.
- Session ended/not found: return to `/reminder` with current empty or ended state.
- Persistence failure: retain the draft and pending idempotent command; offer retry.
- Refresh failure after successful receipt: show committed-success state with a retry-to-refresh action; never resubmit a new command automatically.

## Component Boundaries

- `ReapplyPage.vue`: route composition, guards, and success navigation.
- `ReapplicationForm.vue`: presentational form with typed props and emits.
- `ReapplicationZoneSelector.vue`: suggested/all/custom zone selection.
- `ReapplicationProductAssignments.vue`: per-zone product assignment and grouping.
- `ApplicationTimeSelector.vue`: quick/custom time input and absolute-time summary.
- `ReapplicationReview.vue`: final read-only summary.
- `createReapplicationController.ts`: state, validation, command construction, submission, and retry semantics.
- product controller/repository: product catalog and immutable snapshot access.
- local session repository: atomic command transaction only.

Route-level components remain composition surfaces. Session and product truth stays in repositories/controllers, not duplicated in Vue components.

## Accessibility and Mobile Requirements

- All checkboxes, radio controls, and product selectors have visible labels.
- Touch targets are at least the existing `--tap-target` token.
- Validation messages use `aria-describedby` and `role="alert"` where immediate interruption is necessary.
- Submission progress uses `role="status"` and prevents duplicate activation.
- Success moves programmatic focus to the success heading.
- Product and zone meaning is conveyed through text, not color alone.
- The 360, 390, and 430 CSS-pixel baselines must not require horizontal scrolling.

## Test Strategy

### Contracts

- accepts one-product and multi-product mutually exclusive partitions;
- rejects empty applications, repeated zones, duplicate IDs, and invalid timestamps.

### Domain

- creates one group and multiple ApplicationEvents for different products/snapshots;
- updates only selected zones;
- preserves unselected-zone deadlines;
- records ineligible snapshots without fabricating timers;
- preserves active water-deadline semantics.

### Persistence

- commits group, events, zones, Session revision, sequence, and receipt atomically;
- retries idempotently;
- rolls back injected mid-transaction failure;
- rejects revision, sequence, owner, ended-session, invalid-zone, and stale-product conflicts;
- publishes invalidation only after commit.

### Product Catalog

- creates, reads, updates, lists, and stops saved products;
- retains immutable historical snapshots;
- migrates the existing current snapshot without inventing product claims.

### Controller and Vue

- preselects due/soon affected zones;
- preserves different current products across zones;
- validates empty zones, missing products, and future time;
- submits one stable idempotent command;
- handles success, persistence retry, revision conflict, ended Session, and refresh failure;
- route guard and Back/Cancel behavior;
- mobile-accessible controls and final summary.

### Release Verification

- workspace typecheck passes;
- all automated tests pass;
- production build passes;
- manual mobile verification covers same-product, multi-product, partial-zone, custom-time, conflict, offline/persistence-error, and untimed-result scenarios.

## Out of Scope

- correction command implementation beyond preserving the successful group ID;
- multi-product layering on the same zone in one confirmation;
- remote account synchronization;
- background notifications;
- medical suitability judgments;
- changes to UVI rules or using UVI to alter reapplication deadlines.

