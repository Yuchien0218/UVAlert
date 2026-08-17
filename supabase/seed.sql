-- Safe local-only seed.  It contains no user, auth, CWA key or production data.
insert into public.uv_forecast_cache (
  region_code,
  schema_version,
  source_dataset,
  payload,
  fetched_at,
  usable_until,
  etag
)
values (
  '63000010',
  'five-day-uv-v2',
  'F-D0047-091',
  '{
    "schemaVersion": "five-day-uv-v2",
    "region": {"regionCode": "63000010", "displayName": "臺北市中正區"},
    "sourceKind": "forecast",
    "sourceDataset": "F-D0047-091",
    "sourceDisplayName": "中央氣象署紫外線指數預報",
    "issuedAt": "2026-08-17T00:00:00.000Z",
    "fetchedAt": "2026-08-17T08:00:00.000Z",
    "usableUntil": "2026-08-18T00:00:00.000Z",
    "days": [{
      "localDate": "2026-08-17",
      "validFrom": "2026-08-17T00:00:00.000Z",
      "validTo": "2026-08-17T12:00:00.000Z",
      "uvi": 6,
      "riskLevel": "high",
      "temperatureCelsius": 31
    }]
  }'::jsonb,
  '2026-08-17T08:00:00.000Z',
  '2026-08-18T00:00:00.000Z',
  'local-seed-etag'
)
on conflict (region_code) do nothing;
