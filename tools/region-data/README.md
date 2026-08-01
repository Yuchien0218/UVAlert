# Taiwan town boundary build input

The PWA resolves a deliberately requested device position against official Taiwan township/district boundaries on the device. Production browsers use only the generated WGS84 assets under `apps/web/src/generated`; they do not download the SHP archive and do not call a reverse-geocoding service.

## Official source

- Dataset: `鄉鎮市區界線(TWD97經緯度)`
- Dataset ID: `7441`
- Provider: 內政部國土測繪中心
- Official catalog: <https://data.gov.tw/dataset/7441>
- Pinned source archive release: `1140318` (`2025-03-18`)
- Source CRS: TWD97 geographic coordinates (`EPSG:3824`)
- Output CRS: WGS84 (`EPSG:4326`)
- License: 政府資料開放授權條款第 1 版

The local source archive is intentionally ignored by Git. Generated assets include hashes and attribution in `region-manifest.generated.json`.

## Rebuild

Place the official archive at:

`tools/region-data/source/town-boundary-twd97-20250318.zip`

Then run:

```powershell
pnpm region-data:build -- --input tools/region-data/source/town-boundary-twd97-20250318.zip --source-version 2025-03-18
pnpm region-data:verify -- --input tools/region-data/source/town-boundary-twd97-20250318.zip --source-version 2025-03-18
```

The script must reject missing fields, duplicate district codes, invalid geometry, and nondeterministic output.

## Generated size (2025-03-18 release)

- districts: `368`
- boundary JSON: `14,163,312` bytes
- production gzip chunk: approximately `4,304.78 kB`
- district index JSON: `62,490` bytes

The web build keeps the boundary collection in a dynamic chunk. Opening `/region`, selecting manually, or skipping does not load it; the chunk loads only after the user explicitly requests current-position resolution.
