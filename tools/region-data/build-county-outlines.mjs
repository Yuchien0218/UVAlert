#!/usr/bin/env node
/**
 * 由官方鄉鎮界線產生「縣市輪廓」的精簡 SVG path。
 *
 * **為什麼不直接用現成的 region-boundaries.generated.json**：那份是 13.5MB
 * 的 368 個鄉鎮 MultiPolygon，只適合做 point-in-polygon 反查（目前唯一的
 * 用途，而且是 `await import()` 動態載入）。畫一張手機上的小地圖不需要那個
 * 精度，把它塞進 bundle 也不可行。
 *
 * **為什麼不另外找一份台灣圖形檔**：那會多一份來源、多一份授權要確認，而且
 * 跟 `regionCode` 對不上。用自己已經有的官方資料（內政部國土測繪中心，
 * 政府資料開放授權條款第 1 版），畫出來的縣市邊界跟地區選單、反查邏輯天生
 * 一致。
 *
 * **為什麼不做真正的多邊形聯集**：同一個縣市的鄉鎮彼此相鄰、共用邊界，
 * 所以「用同一個填色、不畫描邊，把該縣市所有鄉鎮的環都畫出來」在視覺上
 * 就等於縣市輪廓。真正的 boolean union 需要一整套幾何函式庫，而它解決的
 * 是這裡不存在的問題。
 *
 * 產出：apps/web/src/generated/county-outlines.generated.json
 * 執行：node tools/region-data/build-county-outlines.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SOURCE = "apps/web/src/generated/region-boundaries.generated.json";
const MANIFEST = "apps/web/src/generated/region-manifest.generated.json";
const OUTPUT = "apps/web/src/generated/county-outlines.generated.json";

/**
 * 簡化容差（經緯度）。0.004° 在台灣約 400 公尺。
 *
 * 這張圖在手機上大約 320px 寬、涵蓋約 3.6 個經度，所以 1px ≈ 0.011°——
 * 容差比一個像素還小，肉眼看不出差別，但頂點數會掉一個數量級。
 */
const TOLERANCE = 0.008;

/**
 * 小於這個面積（平方度）的環直接丟掉。
 *
 * 台灣本島周邊有大量小島與礁岩，在這個尺度下每個都只有不到一個像素，
 * 卻各自佔掉一組座標。0.0004 平方度約 4 平方公里。
 */
const MIN_RING_AREA = 0.002;

/** 座標保留幾位小數。3 位約 100 公尺，足夠這個尺度。 */
const PRECISION = 3;

/** 環面積（shoelace，取絕對值）。 */
function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(sum / 2);
}

/** 點到線段的垂直距離。 */
function perpendicularDistance(point, start, end) {
  const [px, py] = point;
  const [sx, sy] = start;
  const [ex, ey] = end;
  const dx = ex - sx;
  const dy = ey - sy;
  if (dx === 0 && dy === 0) return Math.hypot(px - sx, py - sy);
  const t = ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (sx + clamped * dx), py - (sy + clamped * dy));
}

/** Douglas–Peucker。遞迴寫法在這個資料量（單環最多數千點）不會爆堆疊。 */
function simplify(points, tolerance) {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(
      points[i],
      points[0],
      points[points.length - 1]
    );
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  if (maxDistance <= tolerance) {
    return [points[0], points[points.length - 1]];
  }
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance)
  ];
}

function round(value) {
  return Number(value.toFixed(PRECISION));
}

function collectRings(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

export function buildCountyOutlines(featureCollection) {
  const byCounty = new Map();

  for (const feature of featureCollection.features) {
    const { countyCode, countyName } = feature.properties;
    if (!byCounty.has(countyCode)) {
      byCounty.set(countyCode, { countyCode, countyName, rings: [] });
    }
    const county = byCounty.get(countyCode);

    for (const ring of collectRings(feature.geometry)) {
      const simplified = simplify(ring, TOLERANCE);
      // 少於 4 點的環畫不出面積，留著只是雜訊。
      if (simplified.length < 4) continue;
      county.rings.push({
        area: ringArea(ring),
        points: simplified.map(([x, y]) => [round(x), round(y)])
      });
    }
  }

  /*
   * 面積過濾**逐縣市**進行，而且永遠保留該縣市最大的那個環。
   *
   * 第一版是全域一刀切，結果連江縣（馬祖）整個消失——它的島全部小於門檻。
   * 一張少了一個縣市的地圖不是「簡化」，是錯的；而且那正是使用者最可能
   * 發現的錯誤（那裡是台灣行政區的一部分，不是可以省略的細節）。
   */
  const counties = [...byCounty.values()]
    .map((county) => {
      const sorted = [...county.rings].sort((left, right) => right.area - left.area);
      const kept = sorted.filter(
        (ring, index) => index === 0 || ring.area >= MIN_RING_AREA
      );
      return {
        countyCode: county.countyCode,
        countyName: county.countyName,
        rings: kept.map((ring) => ring.points)
      };
    })
    .filter((county) => county.rings.length > 0)
    .sort((left, right) => left.countyCode.localeCompare(right.countyCode));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const county of counties) {
    for (const ring of county.rings) {
      for (const [x, y] of ring) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return {
    schemaVersion: "county-outlines-v1",
    /** 經緯度的外框，供前端換算成 SVG 座標。 */
    bounds: { minX, minY, maxX, maxY },
    counties: counties.map((county) => ({
      countyCode: county.countyCode,
      countyName: county.countyName,
      rings: county.rings
    }))
  };
}

function main() {
  const source = JSON.parse(readFileSync(resolve(SOURCE), "utf8"));
  const manifest = JSON.parse(readFileSync(resolve(MANIFEST), "utf8"));
  const outlines = buildCountyOutlines(source);

  const payload = {
    ...outlines,
    source: {
      /* 沿用界線資料的來源與授權，這份只是它的降精度衍生物。 */
      datasetId: manifest.source.datasetId,
      title: manifest.source.title,
      provider: manifest.source.provider,
      license: manifest.source.license,
      boundaryDataVersion: manifest.boundaryDataVersion
    },
    generator: {
      tolerance: TOLERANCE,
      minRingArea: MIN_RING_AREA,
      precision: PRECISION
    }
  };

  writeFileSync(resolve(OUTPUT), `${JSON.stringify(payload)}\n`, "utf8");

  const vertices = payload.counties.reduce(
    (total, county) =>
      total + county.rings.reduce((sum, ring) => sum + ring.length, 0),
    0
  );
  const bytes = Buffer.byteLength(JSON.stringify(payload));
  console.log(
    `${payload.counties.length} 個縣市、${payload.counties.reduce((n, c) => n + c.rings.length, 0)} 個環、` +
      `${vertices} 個頂點，${(bytes / 1024).toFixed(1)}KB`
  );
}

if (process.argv[1] && import.meta.url.endsWith("build-county-outlines.mjs")) {
  main();
}
