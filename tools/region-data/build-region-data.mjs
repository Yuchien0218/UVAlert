import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import booleanValid from "@turf/boolean-valid";
import cleanCoords from "@turf/clean-coords";
import rewind from "@turf/rewind";
import simplify from "@turf/simplify";
import proj4 from "proj4";

const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip/adm-zip.js");
const shapefile = require("shapefile");

const REQUIRED_SOURCE_FIELDS = [
  "TOWNCODE",
  "COUNTYCODE",
  "COUNTYNAME",
  "TOWNNAME"
];

const OFFICIAL_DATASET = Object.freeze({
  datasetId: 7441,
  title: "鄉鎮市區界線(TWD97經緯度)",
  provider: "內政部國土測繪中心",
  sourceUrl: "https://data.gov.tw/dataset/7441",
  license: "政府資料開放授權條款第 1 版"
});

const TWD97_GEOGRAPHIC =
  "+proj=longlat +ellps=GRS80 +no_defs +type=crs";
const DEFAULT_SIMPLIFICATION_TOLERANCE = 0.00002;
const GENERATED_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../apps/web/src/generated"
);

proj4.defs("EPSG:3824", TWD97_GEOGRAPHIC);

export function normalizeRegionFeature(feature) {
  if (feature?.type !== "Feature") {
    throw new Error("Region source item must be a GeoJSON Feature");
  }

  for (const field of REQUIRED_SOURCE_FIELDS) {
    if (typeof feature.properties?.[field] !== "string") {
      throw new Error(`Missing required source field ${field}`);
    }
  }

  if (
    feature.geometry?.type !== "Polygon" &&
    feature.geometry?.type !== "MultiPolygon"
  ) {
    throw new Error("Region geometry must be Polygon or MultiPolygon");
  }

  const regionCode = feature.properties.TOWNCODE.trim();
  const countyCode = feature.properties.COUNTYCODE.trim();
  const countyName = feature.properties.COUNTYNAME.trim();
  const townName = feature.properties.TOWNNAME.trim();
  const bbox = calculateBoundingBox(feature.geometry.coordinates);

  if (!regionCode || !countyCode || !countyName || !townName) {
    throw new Error("Official region identity fields cannot be empty");
  }

  return {
    type: "Feature",
    properties: {
      regionCode,
      countyCode,
      countyName,
      townName,
      displayName: `${countyName}${townName}`,
      bbox
    },
    geometry: structuredClone(feature.geometry)
  };
}

export function validateRegionFeatures(features) {
  const seenCodes = new Set();

  for (const feature of features) {
    const code = feature?.properties?.regionCode;
    if (typeof code !== "string" || code.length === 0) {
      throw new Error("Region feature is missing regionCode");
    }
    if (seenCodes.has(code)) {
      throw new Error(`duplicate regionCode ${code}`);
    }
    seenCodes.add(code);
  }
}

export function selectOfficialShapefileBase(entryNames) {
  const shapefileBases = new Set(
    entryNames
      .filter((name) => /\.shp$/i.test(name))
      .map((name) => name.replace(/\.shp$/i, ""))
  );
  const databaseBases = new Set(
    entryNames
      .filter((name) => /\.dbf$/i.test(name))
      .map((name) => name.replace(/\.dbf$/i, ""))
  );
  const candidates = [...shapefileBases].filter(
    (base) =>
      databaseBases.has(base) &&
      /(^|\/)TOWN_MOI_[0-9]+$/i.test(base)
  );

  if (candidates.length !== 1) {
    throw new Error(
      `Expected one official TOWN_MOI SHP/DBF pair, found ${candidates.length}`
    );
  }

  return candidates[0];
}

export function transformGeometryToWgs84(geometry) {
  if (
    geometry?.type !== "Polygon" &&
    geometry?.type !== "MultiPolygon"
  ) {
    throw new Error("Region geometry must be Polygon or MultiPolygon");
  }

  return {
    type: geometry.type,
    coordinates: mapCoordinates(
      geometry.coordinates,
      (longitude, latitude) => {
        const [wgs84Longitude, wgs84Latitude] = proj4(
          "EPSG:3824",
          "EPSG:4326",
          [longitude, latitude]
        );
        if (
          !Number.isFinite(wgs84Longitude) ||
          !Number.isFinite(wgs84Latitude)
        ) {
          throw new Error("Coordinate transformation returned non-finite values");
        }
        return [wgs84Longitude, wgs84Latitude];
      }
    )
  };
}

export function prepareRegionFeature(
  sourceFeature,
  simplificationTolerance = DEFAULT_SIMPLIFICATION_TOLERANCE
) {
  const transformed = {
    type: "Feature",
    properties: sourceFeature.properties,
    geometry: transformGeometryToWgs84(sourceFeature.geometry)
  };
  const cleaned = cleanCoords(transformed, { mutate: false });
  const rewound = rewind(cleaned, { mutate: false, reverse: false });
  const simplified = simplify(rewound, {
    tolerance: simplificationTolerance,
    highQuality: true,
    mutate: false
  });

  if (!booleanValid(simplified)) {
    throw new Error(
      `Invalid polygon geometry for region ${String(
        sourceFeature.properties?.TOWNCODE ?? "unknown"
      )}`
    );
  }

  return normalizeRegionFeature(simplified);
}

export function createGeneratedArtifacts(features, options) {
  validateRegionFeatures(features);
  const sortedFeatures = [...features].sort((left, right) =>
    left.properties.regionCode.localeCompare(
      right.properties.regionCode
    )
  );
  const boundaries = {
    type: "FeatureCollection",
    features: sortedFeatures
  };
  const index = sortedFeatures.map(({ properties }) => ({
    regionCode: properties.regionCode,
    countyCode: properties.countyCode,
    countyName: properties.countyName,
    townName: properties.townName,
    displayName: properties.displayName,
    normalizedSearch: normalizeSearchText(
      `${properties.countyName}${properties.townName}`
    )
  }));
  const serializedBoundaries = stableJson(boundaries);
  const serializedIndex = stableJson(index);

  return {
    boundaries,
    index,
    manifest: {
      schemaVersion: "region-boundary-manifest-v1",
      boundaryDataVersion: options.sourceReleaseDate,
      source: {
        ...OFFICIAL_DATASET,
        releaseDate: options.sourceReleaseDate,
        crs: "EPSG:3824"
      },
      outputCrs: "EPSG:4326",
      generatedAt: options.generatedAt,
      simplificationTolerance:
        options.simplificationTolerance,
      featureCount: sortedFeatures.length,
      hashes: {
        boundariesSha256: sha256(serializedBoundaries),
        indexSha256: sha256(serializedIndex)
      }
    }
  };
}

function calculateBoundingBox(coordinates) {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];

  visitCoordinates(coordinates, (longitude, latitude) => {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      throw new Error("Region geometry contains a non-finite coordinate");
    }
    bounds[0] = Math.min(bounds[0], longitude);
    bounds[1] = Math.min(bounds[1], latitude);
    bounds[2] = Math.max(bounds[2], longitude);
    bounds[3] = Math.max(bounds[3], latitude);
  });

  if (!bounds.every(Number.isFinite)) {
    throw new Error("Region geometry is empty");
  }

  return bounds;
}

function visitCoordinates(value, visit) {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    visit(value[0], value[1]);
    return;
  }

  if (!Array.isArray(value)) {
    throw new Error("Invalid GeoJSON coordinate structure");
  }

  for (const child of value) {
    visitCoordinates(child, visit);
  }
}

function mapCoordinates(value, mapPoint) {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return mapPoint(value[0], value[1]);
  }

  if (!Array.isArray(value)) {
    throw new Error("Invalid GeoJSON coordinate structure");
  }

  return value.map((child) => mapCoordinates(child, mapPoint));
}

function normalizeSearchText(value) {
  return value.normalize("NFKC").replaceAll(/\s+/g, "").toLowerCase();
}

function stableJson(value) {
  return `${JSON.stringify(value)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function readOfficialArchive(inputPath) {
  const archiveBuffer = await readFile(inputPath);
  const archive = new AdmZip(archiveBuffer);
  const entries = archive.getEntries();
  const base = selectOfficialShapefileBase(
    entries.map((entry) => entry.entryName)
  );
  const shpEntry = archive.getEntry(`${base}.shp`);
  const dbfEntry = archive.getEntry(`${base}.dbf`);

  if (shpEntry === null || dbfEntry === null) {
    throw new Error("Official SHP or DBF entry is missing from the archive");
  }

  const collection = await shapefile.read(
    shpEntry.getData(),
    dbfEntry.getData(),
    { encoding: "utf-8" }
  );

  if (collection?.type !== "FeatureCollection") {
    throw new Error("Official shapefile did not produce a FeatureCollection");
  }

  return {
    archiveBuffer,
    sourceLayer: base,
    features: collection.features
  };
}

function parseCliArguments(argv) {
  const result = {
    verify: false,
    input: null,
    sourceVersion: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--verify") {
      result.verify = true;
      continue;
    }
    if (argument === "--input") {
      result.input = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argument === "--source-version") {
      result.sourceVersion = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument ${argument}`);
  }

  if (result.input === null || result.sourceVersion === null) {
    throw new Error("--input and --source-version are required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.sourceVersion)) {
    throw new Error("--source-version must use YYYY-MM-DD");
  }

  return result;
}

async function buildRuntimeAssets(options) {
  const source = await readOfficialArchive(resolve(options.input));
  await mkdir(GENERATED_DIRECTORY, { recursive: true });
  const existingManifestPath = resolve(
    GENERATED_DIRECTORY,
    "region-manifest.generated.json"
  );
  let generatedAt = new Date().toISOString();

  if (options.verify) {
    const existingManifest = JSON.parse(
      await readFile(existingManifestPath, "utf8")
    );
    generatedAt = existingManifest.generatedAt;
  }

  const normalizedFeatures = source.features.map((feature) =>
    prepareRegionFeature(feature)
  );
  const artifacts = createGeneratedArtifacts(normalizedFeatures, {
    sourceReleaseDate: options.sourceVersion,
    generatedAt,
    simplificationTolerance: DEFAULT_SIMPLIFICATION_TOLERANCE
  });
  artifacts.manifest.source.downloadUrl =
    "https://www.tgos.tw/tgos/VirtualDir/Product/3fe61d4a-ca23-4f45-8aca-4a536f40f290/%E9%84%89(%E9%8E%AE%E3%80%81%E5%B8%82%E3%80%81%E5%8D%80)%E7%95%8C%E7%B7%9A1140318.zip";
  artifacts.manifest.source.archiveSha256 = createHash("sha256")
    .update(source.archiveBuffer)
    .digest("hex");
  artifacts.manifest.source.layer = source.sourceLayer;

  const outputs = [
    ["region-boundaries.generated.json", artifacts.boundaries],
    ["region-index.generated.json", artifacts.index],
    ["region-manifest.generated.json", artifacts.manifest]
  ];

  for (const [fileName, value] of outputs) {
    const outputPath = resolve(GENERATED_DIRECTORY, fileName);
    const serialized = stableJson(value);
    if (options.verify) {
      const current = await readFile(outputPath, "utf8");
      if (current !== serialized) {
        throw new Error(`${fileName} does not match regenerated output`);
      }
    } else {
      await writeFile(outputPath, serialized, "utf8");
    }
  }

  return artifacts.manifest;
}

async function main() {
  const options = parseCliArguments(process.argv.slice(2));
  const manifest = await buildRuntimeAssets(options);
  const action = options.verify ? "verified" : "generated";
  process.stdout.write(
    `Region assets ${action}: ${manifest.featureCount} features, version ${manifest.boundaryDataVersion}\n`
  );
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  });
}
