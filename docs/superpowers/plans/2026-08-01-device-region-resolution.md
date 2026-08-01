# Device Region Resolution Implementation Plan

> **Approved specification:** `docs/superpowers/specs/2026-08-01-device-region-resolution-design.md`
>
> **Implementation rule:** Execute this plan task-by-task with tests first. Do not retain latitude or longitude in Vue reactive state, IndexedDB, URLs, logs, analytics, or error payloads.

**Goal:** Add a complete `/region` flow that can resolve a user-confirmed current position to an official Taiwan county/town code entirely on-device, supports offline manual selection and explicit skipping, persists only the selected administrative region, and refreshes the existing five-day UV forecast without changing reminder timing.

**Architecture:** A build-time Node pipeline converts the official NLSC town boundary SHP from TWD97/EPSG:3824 to compact WGS84 GeoJSON plus a searchable district index and manifest. At runtime, a `BrowserGeolocation` adapter obtains coordinates only after an explicit button press; `TaiwanRegionResolver` immediately resolves them against local boundaries and returns only administrative-region metadata. A dedicated controller owns the workflow and writes a versioned selected/skipped preference through the existing IndexedDB metadata table. The UV controller continues calling the server by `regionCode`; precise coordinates never cross the browser boundary.

**Stack:** TypeScript 5.9, Vue 3 Composition API with `<script setup>`, Vue Router 4, Zod contracts, Dexie/IndexedDB, Vitest/Vue Test Utils, Node 24 build tooling, `adm-zip`, `shapefile`, `proj4`, `@turf/clean-coords`, `@turf/rewind`, `@turf/simplify`, and `@turf/boolean-point-in-polygon`.

**Repository note:** This workspace currently has no Git metadata. The commit checkpoints below are logical review checkpoints only; do not initialize a repository or create commits unless the user separately requests it.

---

## Task 1: Establish the official boundary-data pipeline

**Files:**

- Modify: `package.json`
- Modify: `vitest.config.ts`
- Create: `tools/region-data/README.md`
- Create: `tools/region-data/build-region-data.mjs`
- Create: `tools/region-data/build-region-data.test.ts`
- Create: `tools/region-data/fixtures/sample-regions.geojson`
- Create: `tools/region-data/source/.gitkeep`
- Create: `apps/web/src/generated/region-boundaries.generated.json`
- Create: `apps/web/src/generated/region-index.generated.json`
- Create: `apps/web/src/generated/region-manifest.generated.json`

### Step 1: Write failing transformation and validation tests

Add `tools/**/*.test.ts` to the Vitest include list. Test pure exported helpers from the build script using a small fixture containing a polygon, a multipolygon, and required official properties.

```ts
it("normalizes official town properties and creates a stable region code", () => {
  const feature = normalizeRegionFeature(fixtureFeature, "2025-11-18");

  expect(feature.properties).toEqual({
    regionCode: "63000010",
    countyCode: "63000",
    countyName: "臺北市",
    townName: "松山區",
    displayName: "臺北市松山區"
  });
});

it("rejects duplicate TOWNCODE values", () => {
  expect(() => validateRegionFeatures([feature, feature])).toThrow(
    /duplicate regionCode/i
  );
});
```

Run:

```powershell
pnpm vitest run tools/region-data/build-region-data.test.ts
```

Expected: FAIL because the pipeline does not exist yet.

### Step 2: Add deterministic build dependencies and scripts

Add root development dependencies for `adm-zip`, `shapefile`, `proj4`, `@turf/clean-coords`, `@turf/rewind`, and `@turf/simplify`. Add scripts:

```json
{
  "region-data:build": "node tools/region-data/build-region-data.mjs",
  "region-data:verify": "node tools/region-data/build-region-data.mjs --verify"
}
```

The builder must accept an explicit `--input` path, an explicit source version, and fixed simplification tolerance. It must never silently fetch a new release during `build` or CI.

### Step 3: Implement conversion, normalization, and manifest generation

The builder must:

1. Read the official town SHP/DBF dataset from `tools/region-data/source/`.
2. Transform every coordinate from TWD97 geographic coordinates (EPSG:3824) to WGS84 (EPSG:4326).
3. Normalize `TOWNCODE`, `COUNTYCODE`, `COUNTYNAME`, and `TOWNNAME`.
4. Preserve Polygon, MultiPolygon, interior rings, and offshore islands.
5. Repair only deterministic issues such as duplicate consecutive coordinates and ring winding, then simplify with topology preservation and a fixed documented tolerance.
6. Reject missing codes, duplicate codes, invalid coordinate ranges, empty geometry, self-intersections that remain after safe repair, and features that fail post-transform validation; never silently drop a district.
7. Sort features and index entries by `regionCode` so output is deterministic.
8. Emit SHA-256 hashes, source URL, source version, source CRS, output CRS, feature count, build-tool version, and license attribution in the manifest.

The official source must be pinned to the NLSC/政府資料開放平臺 town-boundary release used during implementation. Store the downloaded archive outside `apps/web`; commit only the generated runtime assets and source attribution unless licensing or repository policy requires the archive.

### Step 4: Generate and verify the real assets

Run the pipeline against the pinned official archive, then run it again with `--verify`. Verification must regenerate to memory and compare hashes without rewriting files.

```powershell
pnpm region-data:build -- --input tools/region-data/source/town-boundary-twd97-20250318.zip --source-version 2025-03-18
pnpm region-data:verify -- --input tools/region-data/source/town-boundary-twd97-20250318.zip --source-version 2025-03-18
pnpm vitest run tools/region-data/build-region-data.test.ts
```

Expected: PASS, deterministic hashes, and the feature count matches the official release.

### Step 5: Review checkpoint

Confirm that no source archive, temporary extraction directory, or exact device coordinate exists in the application bundle. Record the generated asset size in `tools/region-data/README.md`.

---

## Task 2: Separate API region references from full local selections

**Files:**

- Modify: `packages/contracts/src/weather.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/region-preference.test.ts`
- Modify: `packages/platform/src/index.ts`

### Step 1: Write failing contract tests

Test the distinction between server forecast region metadata and a complete local selection.

```ts
it("accepts a compact region reference in a forecast response", () => {
  expect(RegionReferenceSchema.parse({
    regionCode: "63000010",
    displayName: "臺北市松山區"
  })).toBeTruthy();
});

it("requires official administrative and boundary-version fields locally", () => {
  expect(RegionSelectionSchema.safeParse({
    regionCode: "63000010",
    displayName: "臺北市松山區"
  }).success).toBe(false);
});

it("represents skip as an explicit preference", () => {
  expect(RegionPreferenceV1Schema.parse({
    schemaVersion: "region-preference-v1",
    mode: "skipped",
    skippedAt: "2026-08-01T00:00:00.000Z"
  }).mode).toBe("skipped");
});
```

Run:

```powershell
pnpm vitest run packages/contracts/src/region-preference.test.ts
```

Expected: FAIL because the schemas do not exist.

### Step 2: Add versioned region schemas

Implement:

```ts
export const RegionReferenceSchema = z.object({
  regionCode: NonEmptyIdSchema,
  displayName: z.string().trim().min(1).max(100)
});

export const RegionSelectionSchema = RegionReferenceSchema.extend({
  countyCode: NonEmptyIdSchema,
  countyName: z.string().trim().min(1).max(50),
  townName: z.string().trim().min(1).max(50),
  boundaryDataVersion: NonEmptyIdSchema,
  selectionMethod: z.enum(["device_location", "manual"])
});

export const RegionPreferenceV1Schema = z.discriminatedUnion("mode", [
  z.object({
    schemaVersion: z.literal("region-preference-v1"),
    mode: z.literal("selected"),
    selection: RegionSelectionSchema
  }),
  z.object({
    schemaVersion: z.literal("region-preference-v1"),
    mode: z.literal("skipped"),
    skippedAt: UtcInstantSchema
  })
]);
```

Change `FiveDayUvForecastSchema.region` to `RegionReferenceSchema`. This prevents the browser from expecting `selectionMethod` or boundary-version details from the UV API.

### Step 3: Define narrow platform ports

Replace the legacy three-method preference port with:

```ts
export interface RegionPreferencePort {
  getPreference(): Promise<RegionPreferenceV1 | null>;
  savePreference(preference: RegionPreferenceV1): Promise<void>;
}

export interface DevicePosition {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export interface DeviceGeolocationPort {
  requestCurrentPosition(): Promise<DevicePosition>;
}
```

Define typed errors `permission_denied`, `position_unavailable`, `timeout`, and `unsupported`. The device position type is transport-only and must not be embedded in controller state or persistence contracts.

### Step 4: Verify contracts and consumers compile far enough to reveal required migrations

```powershell
pnpm vitest run packages/contracts/src/region-preference.test.ts
pnpm typecheck
```

Expected: contract tests PASS; typecheck FAIL only at known legacy preference consumers addressed in Tasks 3 and 5.

---

## Task 3: Persist selected/skipped preference and migrate legacy data

**Files:**

- Modify: `packages/persistence-web/src/repositories/local-region-preference-repository.ts`
- Modify: `packages/test-fixtures/src/persistence-web.test.ts`

### Step 1: Replace legacy repository tests with failing versioned tests

Cover:

- save/read selected preference;
- save/read skipped preference;
- malformed JSON returns `null` without throwing;
- legacy `uvRegionSelection` migrates to a complete versioned selection;
- migration removes the legacy key only after the new key is written;
- write failure leaves the legacy record intact.

Because old records contain only `regionCode` and `displayName`, migration must use the generated district index to fill official county/town fields. If a legacy code is absent from the current index, return `null` and leave it untouched instead of guessing.

### Step 2: Implement atomic metadata migration

Use a new key `uvRegionPreferenceV1` in the existing `AppMetadata` table. No Dexie schema-version bump is needed because the table shape is unchanged. Keep persistence independent from app-generated assets by injecting a narrow legacy lookup into the repository constructor:

```ts
export interface LegacyRegionLookup {
  resolve(regionCode: string): Omit<
    RegionSelection,
    "selectionMethod"
  > | null;
}
```

`createWebAppServices` supplies this lookup from the generated district index; repository tests supply a deterministic fake. The repository must not import from `apps/web`.

```ts
async getPreference(): Promise<RegionPreferenceV1 | null> {
  const current = await this.#database.AppMetadata.get(CURRENT_KEY);
  if (current !== undefined) return parseCurrent(current.value);
  return this.#migrateLegacyPreference();
}
```

Perform write-new/delete-old in one Dexie read-write transaction. Migrated selections use `selectionMethod: "manual"` because the old record contains no trustworthy provenance.

### Step 3: Run repository tests

```powershell
pnpm vitest run packages/test-fixtures/src/persistence-web.test.ts
```

Expected: PASS.

---

## Task 4: Implement geolocation and on-device boundary resolution

**Files:**

- Create: `apps/web/src/adapters/BrowserGeolocation.ts`
- Create: `apps/web/src/adapters/BrowserGeolocation.test.ts`
- Create: `apps/web/src/features/region/TaiwanRegionResolver.ts`
- Create: `apps/web/src/features/region/TaiwanRegionResolver.test.ts`
- Modify: `apps/web/package.json`

### Step 1: Write failing geolocation adapter tests

Mock `navigator.geolocation.getCurrentPosition` and test success plus all browser error mappings. Assert the adapter does not call geolocation in its constructor.

```ts
it("does not request location until requestCurrentPosition is called", () => {
  new BrowserGeolocation(mockNavigator);
  expect(getCurrentPosition).not.toHaveBeenCalled();
});
```

Use conservative options: high accuracy enabled, 10-second timeout, and no cached position (`maximumAge: 0`).

### Step 2: Write failing resolver tests

Use synthetic boundaries, not real user coordinates. Cover:

- point inside a polygon;
- point inside a multipolygon island;
- point inside an interior hole returns no match;
- point outside Taiwan returns `outside_supported_area`;
- two matching boundaries return `ambiguous`;
- bounding-box prefilter excludes irrelevant polygons;
- resolved result contains administrative metadata but no coordinate fields.

### Step 3: Implement the adapter and resolver

Add `@turf/boolean-point-in-polygon` to `apps/web`. The resolver must first query a generated bounding-box index, then run point-in-polygon against all candidates. It must return:

```ts
type RegionResolution =
  | { kind: "resolved"; region: RegionDirectoryEntry }
  | { kind: "outside_supported_area" }
  | { kind: "ambiguous"; candidates: readonly RegionDirectoryEntry[] };
```

Do not add a nearest-district fallback. Do not log coordinates in caught errors.

### Step 4: Run focused tests

```powershell
pnpm vitest run apps/web/src/adapters/BrowserGeolocation.test.ts apps/web/src/features/region/TaiwanRegionResolver.test.ts
```

Expected: PASS.

---

## Task 5: Adapt the UV controller to explicit region preferences

**Files:**

- Modify: `apps/web/src/features/uv/createUvForecastController.ts`
- Modify: `apps/web/src/features/uv/createUvForecastController.test.ts`
- Modify: UV forecast fixtures that construct `FiveDayUvForecast`

### Step 1: Write failing preference-state tests

Test that:

- `null` preference means `no_region`;
- `skipped` preference means `no_region` and does not call the API;
- `selected` preference loads snapshots/API by `selection.regionCode`;
- `refresh()` rereads the preference after region save or skip;
- the forecast parser accepts the compact `RegionReference` returned by the API.

### Step 2: Update the controller without changing timing behavior

Replace `getSelectedRegion()` with `getPreference()`. Expose `region` as the selected full local region or `null`. Keep the existing online/cache/freshness behavior unchanged. `refresh()` remains the synchronization point used after region preference changes.

### Step 3: Run focused tests

```powershell
pnpm vitest run apps/web/src/features/uv/createUvForecastController.test.ts
```

Expected: PASS.

---

## Task 6: Build the region workflow controller

**Files:**

- Create: `apps/web/src/features/region/createRegionController.ts`
- Create: `apps/web/src/features/region/createRegionController.test.ts`

### Step 1: Write failing controller tests

Cover the complete state machine:

- initial state reads preference and local directory only;
- initial state never calls geolocation;
- `useCurrentPosition()` maps browser errors to UI-safe error codes;
- successful resolution exposes a confirmation candidate before save;
- ambiguous/outside results switch to manual selection;
- `confirmResolvedRegion()` saves `device_location` and refreshes UV;
- `saveManualRegion()` saves `manual` and refreshes UV;
- `skipRegion()` saves the explicit skipped preference and refreshes UV;
- failed persistence leaves the prior preference unchanged;
- latitude/longitude are absent from every public ref and returned error.

### Step 2: Implement a shallow controller API

```ts
export interface RegionController {
  readonly phase: Readonly<Ref<RegionPhase>>;
  readonly preference: Readonly<Ref<RegionPreferenceV1 | null>>;
  readonly candidate: Readonly<Ref<RegionSelection | null>>;
  readonly counties: Readonly<Ref<readonly RegionCountyOption[]>>;
  readonly error: Readonly<Ref<RegionError | null>>;
  ensureLoaded(): Promise<void>;
  useCurrentPosition(): Promise<void>;
  confirmCandidate(): Promise<boolean>;
  saveManualRegion(regionCode: string): Promise<boolean>;
  skipRegion(): Promise<boolean>;
  clearError(): void;
  dispose(): void;
}
```

Inside `useCurrentPosition()`, keep the `DevicePosition` in a function-local constant, immediately call the resolver, and allow it to fall out of scope. The public candidate is built only from directory metadata and the manifest version.

### Step 3: Run controller tests

```powershell
pnpm vitest run apps/web/src/features/region/createRegionController.test.ts
```

Expected: PASS.

---

## Task 7: Wire services, router, and `/region` Vue UI

**Files:**

- Modify: `apps/web/src/app/createWebAppServices.ts`
- Modify: `apps/web/src/app/createWebAppServices.test.ts`
- Modify: `apps/web/src/router/index.ts`
- Modify: `apps/web/src/router/index.test.ts`
- Create: `apps/web/src/pages/RegionPage.vue`
- Create: `apps/web/src/pages/RegionPage.test.ts`
- Create: `apps/web/src/components/region/RegionPreferenceSummary.vue`
- Create: `apps/web/src/components/region/RegionLocationPanel.vue`
- Create: `apps/web/src/components/region/RegionManualSelector.vue`
- Modify: `apps/web/src/components/home/OutdoorContextCard.vue`
- Modify: `apps/web/src/components/home/OutdoorContextCard.test.ts`
- Modify: `apps/web/src/styles.css` or the existing shared token/style entrypoint

### Step 1: Write failing router and service tests

Add a direct `/region` route with title `地區設定`. It must not require an active reminder and must not request geolocation on navigation. Create one shared `LocalRegionPreferenceRepository` instance for both region and UV controllers so they observe the same persisted state.

### Step 2: Write failing component tests

Test:

- selected preference summary and change action;
- a prominent `使用目前位置` button;
- plain-language privacy copy before the button;
- consent confirmation candidate before saving;
- permission-denied, timeout, unavailable, unsupported, outside, and ambiguous messages;
- manual county → district cascading selector with search;
- manual selection works while `navigator.onLine === false`;
- explicit `暫不提供地區` action;
- safe return behavior using only allow-listed internal paths;
- disabled/loading button states prevent duplicate writes;
- focus moves to the confirmation/error heading and status changes use `aria-live`;
- touch targets are at least 44 × 44 CSS pixels.

### Step 3: Implement the page and components

Page order:

1. Current preference summary.
2. Current-position panel and pre-consent privacy explanation.
3. Candidate confirmation or recoverable error.
4. Manual selector.
5. Skip action and UV/reminder independence note.

Do not display raw latitude/longitude or retain them in component refs. The manual selector reads only the generated index and remains fully offline.

### Step 4: Update the home entry point

`OutdoorContextCard` must always show a link:

- no selected preference: `設定地區`;
- selected preference: `變更地區`;
- skipped preference: `設定地區` with copy explaining UV is not shown.

Keep the existing statement that reminder timing is independent from regional UV data.

### Step 5: Run focused Vue and router tests

```powershell
pnpm vitest run apps/web/src/pages/RegionPage.test.ts apps/web/src/router/index.test.ts apps/web/src/app/createWebAppServices.test.ts apps/web/src/components/home/OutdoorContextCard.test.ts
```

Expected: PASS.

---

## Task 8: Add privacy, integration, and release regressions

**Files:**

- Create: `apps/web/src/features/region/region-flow.integration.test.ts`
- Modify: `P0_REQUIREMENT_TRACEABILITY_MATRIX.md`
- Modify: `P0_COPY_DECK.md`
- Modify: `P0_TECHNICAL_DESIGN_DOCUMENT.md`
- Modify: `P0_RELEASE_MANIFEST.md`
- Modify: `README.md`

### Step 1: Add an end-to-end service-level flow test

Test this sequence with fake IndexedDB:

1. Start with no preference.
2. Resolve a synthetic device position.
3. Confirm the candidate.
4. Verify IndexedDB contains only versioned administrative metadata and no coordinate keys or values.
5. Verify UV refresh uses only `regionCode`.
6. Change the region manually.
7. Skip region.
8. Verify the reminder/session projection remains unchanged throughout.

### Step 2: Add a bundle privacy assertion

After build, search source maps/assets and IndexedDB serialization code for forbidden coordinate persistence names in the region flow. This is a guardrail, not proof of privacy; pair it with the integration test.

```powershell
rg -n "latitude|longitude|coords|position\.coords" apps/web/src/features/region apps/web/src/pages/RegionPage.vue packages/persistence-web/src/repositories/local-region-preference-repository.ts
```

Expected: coordinate access appears only inside `BrowserGeolocation` and the function-local controller resolution path, never in persistence or Vue state.

### Step 3: Update traceability, copy, and operator documentation

Document:

- official dataset/version/hash/license;
- how to refresh boundary assets intentionally;
- exact privacy retention rule;
- manual and skip fallbacks;
- all new copy keys and error messages;
- requirement → contract → controller → component → test mapping.

### Step 4: Run complete verification

```powershell
pnpm region-data:verify -- --input tools/region-data/source/town-boundary-twd97-20250318.zip --source-version 2025-03-18
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands PASS.

### Step 5: Manual mobile acceptance

At narrow mobile width, verify:

1. `/region` loads without a permission prompt.
2. Pressing `使用目前位置` is the only action that triggers the prompt.
3. Denial leaves manual and skip paths usable.
4. A resolved district requires confirmation before save.
5. Offline manual selection works after the app assets are loaded.
6. Changing or skipping the region updates the home UV state.
7. Active reminder countdown, projection, and IndexedDB session truth are unchanged.
8. Screen-reader status and focus order are understandable.

Record the final generated asset size, build hash, test count, and any browser-specific geolocation limitation in the implementation handoff.

---

## Execution order and stop conditions

Execute Tasks 1–8 in order. Stop and ask the user only if one of these decisions is required:

- the official NLSC release or license text cannot be verified;
- the generated boundary asset is too large for the agreed PWA budget and requires changing simplification or lazy-loading strategy;
- a legacy `regionCode` cannot be mapped without guessing;
- implementation would require sending exact coordinates to a backend;
- a change to reminder contracts, reducer behavior, or reminder timing becomes necessary.

Do not silently substitute another boundary provider, nearest district, approximate reverse-geocoding API, or bundled sample data for the official production asset.
