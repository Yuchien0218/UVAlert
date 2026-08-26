import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED = [
  "01-morning-line",
  "02-sun-window",
  "03-reapply-ring",
  "04-sunlight-nodes",
  "05-weather-bulletin-frame",
  "06-broadcast-mark"
];

const APPROVED_COLORS = new Set([
  "#FAF5EC",
  "#9F5E42",
  "#2E2925",
  "#C1832E",
  "#33291F"
]);
const DEFAULT_OUTPUT_ROOT = resolve("docs/design/logo-concepts");

// Selected direction only: Android adaptive icons guarantee roughly the inner
// 66% diameter circle of the canvas across mask shapes. Radius 20 on a 64
// viewBox is ~63% diameter, leaving margin inside that guaranteed safe zone.
const SAFE_AREA_CONCEPT_ID = "06-broadcast-mark";
const SAFE_AREA_CENTER = { x: 32, y: 32 };
const SAFE_AREA_RADIUS = 20;
// Round line caps extend a filled semicircle past the path's own endpoint
// coordinate, so path-derived points need this padding; filled circles
// already report their true visual edge via cx/cy/r and need none.
const STROKE_CAP_PADDING = 2;

function distanceFromSafeAreaCenter(x, y) {
  return Math.hypot(x - SAFE_AREA_CENTER.x, y - SAFE_AREA_CENTER.y);
}

function maxDistanceFromSafeAreaCenter(svg) {
  let maxDistance = 0;

  for (const match of svg.matchAll(
    /<circle[^>]*\bcx="([-\d.]+)"[^>]*\bcy="([-\d.]+)"[^>]*\br="([-\d.]+)"/g
  )) {
    const [, cx, cy, r] = match.map(Number);
    maxDistance = Math.max(maxDistance, distanceFromSafeAreaCenter(cx, cy) + r);
  }

  for (const match of svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)) {
    let x = 0;
    let y = 0;
    for (const token of match[1].match(/[MLH][^MLH]*/g) ?? []) {
      const nums = token
        .slice(1)
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
      if (token[0] === "H") {
        x = nums[0];
      } else {
        [x, y] = nums;
      }
      maxDistance = Math.max(
        maxDistance,
        distanceFromSafeAreaCenter(x, y) + STROKE_CAP_PADDING
      );
    }
  }

  return maxDistance;
}

function readSvg(path, label, failures) {
  if (!existsSync(path)) {
    failures.push(`Missing ${label}: ${path}`);
    return null;
  }

  return readFileSync(path, "utf8");
}

function verifyCommonSvg(svg, { label, viewBox, conceptId }, failures) {
  try {
    assert.match(
      svg,
      new RegExp(`viewBox=["']${viewBox}["']`),
      `${label} must use viewBox ${viewBox}`
    );
    assert.match(svg, /role=["']img["']/, `${label} must use role="img"`);
    assert.match(
      svg,
      /<title(?:\s[^>]*)?>[^<]+<\/title>/,
      `${label} must have a non-empty title`
    );
    assert.match(
      svg,
      /<desc(?:\s[^>]*)?>[^<]+<\/desc>/,
      `${label} must have a non-empty description`
    );
    assert.match(
      svg,
      new RegExp(`data-concept=["']${conceptId}["']`),
      `${label} must identify ${conceptId}`
    );

    const colorAttrValues = [
      ...svg.matchAll(/(?:fill|stroke)=["']([^"']+)["']/g)
    ].map((match) => match[1]);
    const colorValues = colorAttrValues.filter((value) => value !== "none");
    assert.ok(colorValues.length > 0, `${label} must use an approved color`);
    for (const value of colorValues) {
      assert.ok(
        /^#[\dA-Fa-f]{6}$/.test(value) &&
          APPROVED_COLORS.has(value.toUpperCase()),
        `${label} uses unapproved color value ${value}`
      );
    }
  } catch (error) {
    failures.push(error.message);
  }
}

function listSvgFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory)
    .filter((file) => file.endsWith(".svg"))
    .sort();
}

export function verifyLogoConcepts(outputRoot = DEFAULT_OUTPUT_ROOT) {
  const root = resolve(outputRoot);
  const markDirectory = resolve(root, "marks");
  const lockupDirectory = resolve(root, "lockups");
  const boardPath = resolve(root, "uvalert-logo-concepts-board.svg");
  const failures = [];

  if (!existsSync(root)) {
    throw new Error(`Logo concept output directory is missing: ${root}`);
  }

  const markFiles = listSvgFiles(markDirectory);
  const lockupFiles = listSvgFiles(lockupDirectory);

  try {
    assert.equal(
      markFiles.length,
      6,
      "Expected exactly 6 standalone mark SVGs"
    );
    assert.deepEqual(
      markFiles,
      EXPECTED.map((id) => `${id}.svg`),
      "Standalone mark filenames do not match the six concepts"
    );
  } catch (error) {
    failures.push(error.message);
  }

  for (const id of EXPECTED) {
    const mark = readSvg(
      resolve(markDirectory, `${id}.svg`),
      `standalone mark ${id}`,
      failures
    );
    if (!mark) continue;

    verifyCommonSvg(
      mark,
      { label: `Standalone mark ${id}`, viewBox: "0 0 64 64", conceptId: id },
      failures
    );
    if (/<text\b/i.test(mark))
      failures.push(`Standalone mark ${id} must not contain editable text`);

    if (id === SAFE_AREA_CONCEPT_ID) {
      const maxDistance = maxDistanceFromSafeAreaCenter(mark);
      if (maxDistance > SAFE_AREA_RADIUS) {
        failures.push(
          `Standalone mark ${id} breaches the app icon safe area: farthest point is ${maxDistance.toFixed(1)}px from center, limit is ${SAFE_AREA_RADIUS}px`
        );
      }
    }
  }

  try {
    assert.equal(
      lockupFiles.length,
      6,
      "Expected exactly 6 horizontal lockup SVGs"
    );
    assert.deepEqual(
      lockupFiles,
      EXPECTED.map((id) => `${id}.svg`),
      "Horizontal lockup filenames do not match the six concepts"
    );
  } catch (error) {
    failures.push(error.message);
  }

  for (const id of EXPECTED) {
    const lockup = readSvg(
      resolve(lockupDirectory, `${id}.svg`),
      `horizontal lockup ${id}`,
      failures
    );
    if (!lockup) continue;

    verifyCommonSvg(
      lockup,
      {
        label: `Horizontal lockup ${id}`,
        viewBox: "0 0 520 112",
        conceptId: id
      },
      failures
    );
    try {
      assert.match(
        lockup,
        /防曬晴報員/,
        `Horizontal lockup ${id} is missing the exact Chinese brand string`
      );
      assert.match(
        lockup,
        /UVAlert/,
        `Horizontal lockup ${id} is missing the exact English brand string`
      );
    } catch (error) {
      failures.push(error.message);
    }
  }

  const board = readSvg(boardPath, "comparison board", failures);
  if (board) {
    verifyCommonSvg(
      board,
      {
        label: "Comparison board",
        viewBox: "0 0 1600 1240",
        conceptId: EXPECTED[0]
      },
      failures
    );

    const boardConcepts = [
      ...board.matchAll(/data-concept=["']([^"']+)["']/g)
    ].map((match) => match[1]);
    const boardConceptCount = new Set(boardConcepts).size;
    try {
      assert.equal(
        boardConceptCount,
        6,
        "Comparison board must contain 6 unique concepts"
      );
      assert.deepEqual(
        [...new Set(boardConcepts)].sort(),
        EXPECTED,
        "Comparison board concept identifiers do not match the six concepts"
      );
      assert.equal(
        (board.match(/data-preview-size=["']32["']/g) ?? []).length,
        6,
        "Comparison board must contain one 32px preview per concept"
      );
      assert.match(
        board,
        /防曬晴報員/,
        "Comparison board is missing the exact Chinese brand string"
      );
      assert.match(
        board,
        /UVAlert/,
        "Comparison board is missing the exact English brand string"
      );
    } catch (error) {
      failures.push(error.message);
    }
  }

  const safeAreaGuidePath = resolve(
    root,
    `${SAFE_AREA_CONCEPT_ID}-app-icon-safe-area.svg`
  );
  const safeAreaGuide = readSvg(
    safeAreaGuidePath,
    "app icon safe area guide",
    failures
  );
  if (safeAreaGuide) {
    verifyCommonSvg(
      safeAreaGuide,
      {
        label: "App icon safe area guide",
        viewBox: "0 0 64 64",
        conceptId: SAFE_AREA_CONCEPT_ID
      },
      failures
    );
    try {
      assert.match(
        safeAreaGuide,
        new RegExp(`r=["']${SAFE_AREA_RADIUS}["']`),
        `App icon safe area guide must draw the ${SAFE_AREA_RADIUS}px reference circle`
      );
    } catch (error) {
      failures.push(error.message);
    }
  }

  const outlinedPath = resolve(root, `${SAFE_AREA_CONCEPT_ID}-outlined.svg`);
  const outlined = readSvg(outlinedPath, "outlined production mark", failures);
  if (outlined) {
    verifyCommonSvg(
      outlined,
      {
        label: "Outlined production mark",
        viewBox: "0 0 64 64",
        conceptId: SAFE_AREA_CONCEPT_ID
      },
      failures
    );
    if (/stroke-width/.test(outlined)) {
      failures.push(
        "Outlined production mark must not depend on stroke-width; every visible shape must be filled geometry"
      );
    }
    const outlinedReach = maxDistanceFromSafeAreaCenter(outlined);
    if (outlinedReach > SAFE_AREA_RADIUS) {
      failures.push(
        `Outlined production mark breaches the app icon safe area: farthest point is ${outlinedReach.toFixed(1)}px from center, limit is ${SAFE_AREA_RADIUS}px`
      );
    }
  }

  const darkSurfacePath = resolve(
    root,
    `${SAFE_AREA_CONCEPT_ID}-dark-surface.svg`
  );
  const darkSurface = readSvg(
    darkSurfacePath,
    "dark surface reversed mark",
    failures
  );
  if (darkSurface) {
    verifyCommonSvg(
      darkSurface,
      {
        label: "Dark surface reversed mark",
        viewBox: "0 0 64 64",
        conceptId: SAFE_AREA_CONCEPT_ID
      },
      failures
    );
    try {
      assert.match(
        darkSurface,
        /fill=["']#2E2925["']/i,
        "Dark surface reversed mark must use the espresso background"
      );
    } catch (error) {
      failures.push(error.message);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Logo concept verification failed:\n- ${failures.join("\n- ")}`
    );
  }

  return {
    marks: markFiles.length,
    lockups: lockupFiles.length,
    boardConcepts: EXPECTED.length
  };
}

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  try {
    const result = verifyLogoConcepts(process.argv[2]);
    console.log(
      `PASS: ${result.marks} marks, ${result.lockups} lockups, ${result.boardConcepts} board concepts`
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
