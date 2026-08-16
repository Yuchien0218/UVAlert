# Device-Side Taiwan Region Resolution Design

**Date:** 2026-08-01  
**Status:** Approved design, pending written-spec review

## Goal

Implement a complete `/region` flow that lets a user deliberately choose one of three paths:

1. use the device's current position and resolve it to a Taiwan township/district on-device;
2. manually choose a township/district;
3. skip region selection without losing access to sunscreen reminders.

Precise coordinates exist only in memory for the duration of one explicit resolution attempt. The application stores only the selected administrative-region identity and never stores or transmits the precise coordinates.

## Authoritative Data Source

The source dataset is the Ministry of the Interior National Land Surveying and Mapping Center township/district boundary dataset published through Taiwan's Government Open Data Platform:

- Dataset: `鄉鎮市區界線(TWD97經緯度)`
- Dataset ID: `7441`
- Provider: 內政部國土測繪中心
- Key source fields: `TOWNID`, `TOWNCODE`, `COUNTYNAME`, `TOWNNAME`, `COUNTYID`, `COUNTYCODE`
- License: 政府資料開放授權條款第 1 版
- Source update cadence: irregular

The raw SHP archive is an input to a reproducible build-time conversion script. It is not fetched in the user's browser.

## Boundary-Data Build Pipeline

Add a dedicated data-preparation script that:

1. accepts a locally downloaded official SHP archive and an explicit source release date;
2. validates that all required source fields exist;
3. transforms the source geometry from TWD97 geographic coordinates to WGS84/EPSG:4326 before browser delivery;
4. repairs or rejects invalid polygon geometry rather than silently emitting it;
5. simplifies geometry using a documented tolerance selected to reduce size without changing expected township-level point resolution in fixture tests;
6. emits Polygon/MultiPolygon GeoJSON plus per-feature bounding boxes;
7. emits a separate searchable region index containing code, county name, town name, display name, and normalized search text;
8. emits a manifest with source URL, dataset ID, source release date, generated date, CRS transformation, simplification tolerance, feature count, and SHA-256 hashes;
9. fails when region codes are missing or duplicated;
10. verifies known fixture points before accepting generated output.

Generated files are versioned application assets. Their license attribution and manifest ship with the PWA.

The generation script is a maintenance tool only. Production runtime must not depend on GDAL, Python, a GIS service, or network access.

## Region Identity

Use the official `TOWNCODE` as the stable local `regionCode`. A selected region contains:

- `regionCode`;
- `displayName`, composed from official county and township/district names;
- `countyCode`;
- `countyName`;
- `townName`;
- `boundaryDataVersion`;
- `selectionMethod`: `device_location` or `manual`.

The UV API continues to accept the region code. Any CWA forecast-region mapping remains server-controlled and is not inferred by the browser.

## Region Preference State

The current nullable `RegionSelection` cannot distinguish "not decided" from "explicitly skipped". Introduce a versioned local preference:

- `mode: "selected"` with a `RegionSelection`; or
- `mode: "skipped"` with `skippedAt` and no region.

Existing stored `RegionSelection` data migrates to `mode: "selected"`. Missing legacy data remains undecided; it must not be treated as an explicit skip.

Skipping clears the selected region and UV forecast from active presentation state but does not delete unrelated cached forecasts or sunscreen reminders. The home page displays no location UVI number and retains the region-setting entry.

## Browser Geolocation Adapter

`BrowserGeolocation` wraps `navigator.geolocation.getCurrentPosition()` behind a platform port.

It is called only after the user presses `使用目前位置`. It must never run on page mount, route entry, application boot, or a timer.

The adapter returns a minimal in-memory result:

- latitude;
- longitude;
- accuracy in metres.

It maps browser errors to stable application errors:

- `permission_denied`;
- `position_unavailable`;
- `timeout`;
- `unsupported`.

The request uses high accuracy only when supported, applies a finite timeout, and rejects stale cached positions beyond the configured maximum age. Raw browser error objects and coordinates are not logged.

## Device-Side Resolver

`TaiwanRegionResolver` receives the in-memory WGS84 point and generated boundary data.

Resolution steps:

1. reject non-finite latitude or longitude;
2. reject coordinates outside the Taiwan dataset's global bounding box;
3. shortlist features whose bounding boxes contain the point;
4. run a tested point-in-polygon operation that supports Polygon, MultiPolygon, and interior holes;
5. return one resolved region only when the result is unambiguous;
6. return `outside_supported_area` when no feature contains the point;
7. return `boundary_ambiguous` when more than one feature matches a boundary case.

An ambiguous or unmatched result never falls back to a centroid, nearest polygon, IP address, or hidden default region. The user is directed to manual selection.

Because device accuracy can span an administrative boundary, the resolved result is shown for confirmation before persistence. The page displays the browser-provided accuracy as an approximate accuracy statement without storing it.

## Region Controller

`createRegionController` owns the route's transient state and coordinates the geolocation adapter, resolver, preference repository, and UV forecast controller.

Readonly state includes:

- phase: `idle | locating | confirming | saving | success | error`;
- current saved preference;
- proposed resolved region;
- approximate accuracy for the current attempt;
- manual search query and filtered choices;
- selected manual region;
- stable error kind.

Explicit actions include:

- load current preference and region index;
- request current position;
- confirm a resolved region;
- switch to manual selection;
- select and save a manual region;
- skip region;
- retry a failed location attempt;
- cancel and return without changing the existing preference;
- clear a recoverable error.

All exposed state is readonly. Coordinates remain function-local inside the location attempt and are not placed in controller refs, devtools-visible reactive objects, error payloads, or persisted records.

## `/region` User Flow

### Entry

The page is reachable from the home outdoor-information card whether or not a region already exists. When a region exists, the card offers `變更地區`; when none exists, it offers `設定地區`.

The route displays the current saved region, if any, but makes no permission request.

### Information Order

1. page title and purpose;
2. current saved region, if present;
3. pre-permission privacy explanation;
4. `使用目前位置` primary action;
5. `手動選擇地區` secondary action;
6. `暫不提供地區` tertiary action;
7. Cancel/Back action that preserves the original preference.

Use the approved copy-deck text for the pre-permission, locating, denied, unsupported, timeout, and skipped states.

### Current Position

After the explicit action:

1. show `正在取得位置` using `role="status"`;
2. request one browser position;
3. resolve the point in memory;
4. show `我們找到：{region}` and approximate accuracy;
5. require `確認此地區` before saving;
6. save only the region preference;
7. refresh UV forecast state;
8. return to the prior route, defaulting to home when no safe return target exists.

The location permission result is not interpreted as consent to notifications, analytics, continuous tracking, or background location.

### Manual Selection

Manual selection uses the generated region index and works offline.

- First level: county/city.
- Second level: township/city/district within that county.
- A search field matches normalized county plus town names.
- The user must confirm the final region before it is saved.
- Search and selection use official visible names; internal codes are not the primary label.

### Skip

Skipping requires no permission. It saves `mode: "skipped"`, clears active region/forecast presentation, and returns to the prior route. The completion message states that location UVI will not be shown but sunscreen reminders still work.

If a saved region already exists, selecting skip is a material change. The UI must clearly state that the saved region will be removed before confirmation.

### Cancel

Cancel preserves the region preference that existed when the page was opened. It does not request location, save a manual selection, or clear a region.

## UV Forecast Integration

After saving a selected region:

- region state updates immediately;
- forecast phase becomes loading;
- `UvForecastController.refresh()` loads the selected region;
- a live forecast is used when available;
- the existing usable cached snapshot remains the offline fallback;
- forecast failure does not roll back the saved region;
- the page reports that the region was saved even when UV data is temporarily unavailable.

After explicit skip:

- region state becomes null;
- forecast state becomes null;
- phase becomes `no_region`;
- evening UV prompt is unavailable;
- no zero or stale value is presented as current location UVI.

The region controller must not directly call the CWA API or possess a CWA authorization key.

## Privacy and Logging Requirements

Precise latitude, longitude, accuracy, movement history, and raw geolocation errors must not be written to:

- IndexedDB;
- localStorage or sessionStorage;
- URLs or navigation state;
- console output;
- analytics events;
- crash reports;
- command receipts;
- notification content.

Only confirmed administrative-region data and the boundary-data version are persisted.

Automated tests must use synthetic fixture points. Real user coordinates must never be copied into test fixtures or screenshots.

## Error Handling

- Permission denied: explain that manual selection and skip remain available; do not automatically request again.
- Unsupported browser: hide retry-location behavior and prioritize manual selection.
- Timeout or unavailable position: allow one explicit retry, manual selection, or skip.
- Outside supported area: explain that the current boundary dataset did not find a Taiwan township/district; offer manual selection.
- Ambiguous boundary: do not choose a region; offer the relevant manual county/town selector without storing coordinates.
- Boundary-data load failure: disable device and manual resolution dependent on that asset, preserve the existing region, and allow Cancel.
- Preference storage failure: keep the proposed region in memory, show a retry action, and do not claim it was saved.
- Forecast failure after save: keep the saved region and show UV unavailable/retry through the existing forecast state.

## Component and Module Boundaries

- `RegionPage.vue`: route composition and safe return navigation.
- `RegionLocationPanel.vue`: disclosure, locate action, progress, result confirmation, and location errors.
- `RegionManualSelector.vue`: county/town selection and search.
- `RegionPreferenceSummary.vue`: current selection or skipped state.
- `createRegionController.ts`: transient flow state and orchestration.
- `BrowserGeolocation.ts`: browser API adapter only.
- `TaiwanRegionResolver.ts`: deterministic point-in-polygon resolution only.
- `region-boundaries.generated.ts` or lazy-loaded generated JSON: generated geometry and manifest access.
- `region-index.generated.ts` or generated JSON: searchable official region names/codes.
- `LocalRegionPreferenceRepository`: versioned selected/skipped preference storage and migration.
- `UvForecastController`: region-aware forecast refresh and presentation state.

Route-level Vue components remain composition surfaces. Browser and GIS behavior stay outside templates.

## Accessibility and Mobile Requirements

- All location actions and selection controls meet the existing `--tap-target` minimum.
- Permission disclosure remains visible before the locate button.
- Loading uses a polite live status and does not update every second.
- Errors are expressed in text and not color alone.
- County and town selectors have visible labels and linked descriptions.
- Focus moves to the proposed region heading after resolution and to the error heading after a failed attempt.
- The flow works without horizontal scrolling at 360, 390, and 430 CSS pixels.
- Manual selection remains fully keyboard and screen-reader usable.

## Test Strategy

### Data Pipeline

- validates required official fields and unique TOWNCODE values;
- verifies source and generated hashes;
- rejects invalid geometry;
- verifies feature count against the pinned source manifest;
- confirms known synthetic fixture points resolve before and after simplification;
- tests points near holes, islands, and MultiPolygon features.

### Resolver

- resolves known interior points;
- supports Polygon, MultiPolygon, and holes;
- returns outside and ambiguous results without guessing;
- rejects non-finite coordinates;
- returns official names/codes and boundary-data version.

### Geolocation Adapter

- never calls the browser API before an explicit controller action;
- maps success, denied, unavailable, timeout, and unsupported states;
- does not log or persist coordinates.

### Preference Repository

- saves selected and skipped preferences;
- migrates existing RegionSelection data;
- preserves unrelated metadata;
- reports storage failures without false success.

### Controller

- executes locate, resolve, confirm, save, refresh, and return in order;
- preserves the old preference on Cancel or failed save;
- clears active forecast state on explicit skip;
- handles boundary, permission, storage, and forecast failures;
- does not expose coordinates through reactive state.

### Vue and Router

- `/region` loads without a permission request;
- current-position, manual, skip, retry, confirm, and Cancel flows;
- home card supports both setting and changing a region;
- focus and accessible status behavior;
- mobile viewport layout.

### Release Verification

- workspace typecheck passes;
- all automated tests pass;
- production build passes;
- generated boundary assets remain within an explicitly reviewed compressed-size budget;
- real-device checks cover Android Chrome, iOS Safari, denied permission, timeout, offline manual selection, and installed PWA mode.

## Out of Scope

- continuous or background location;
- movement history, geofencing, or automatic region switching;
- IP-address geolocation;
- third-party reverse-geocoding services;
- village-level resolution;
- using location or UVI to alter sunscreen reapplication deadlines;
- storing precise coordinates for later reuse;
- exposing CWA authorization credentials in the browser.

