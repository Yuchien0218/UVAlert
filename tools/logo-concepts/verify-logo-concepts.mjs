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
  "06-broadcast-mark",
];

const APPROVED_COLORS = new Set(["#FAF5EC", "#9F5E42", "#2E2925"]);
const DEFAULT_OUTPUT_ROOT = resolve("docs/design/logo-concepts");

function readSvg(path, label, failures) {
  if (!existsSync(path)) {
    failures.push(`Missing ${label}: ${path}`);
    return null;
  }

  return readFileSync(path, "utf8");
}

function verifyCommonSvg(svg, { label, viewBox, conceptId }, failures) {
  try {
    assert.match(svg, new RegExp(`viewBox=["']${viewBox}["']`), `${label} must use viewBox ${viewBox}`);
    assert.match(svg, /role=["']img["']/, `${label} must use role="img"`);
    assert.match(svg, /<title(?:\s[^>]*)?>[^<]+<\/title>/, `${label} must have a non-empty title`);
    assert.match(svg, /<desc(?:\s[^>]*)?>[^<]+<\/desc>/, `${label} must have a non-empty description`);
    assert.match(svg, new RegExp(`data-concept=["']${conceptId}["']`), `${label} must identify ${conceptId}`);

    const colors = svg.match(/#[\dA-Fa-f]{6}\b/g) ?? [];
    assert.ok(colors.length > 0, `${label} must use an approved color`);
    for (const color of colors) {
      assert.ok(APPROVED_COLORS.has(color.toUpperCase()), `${label} uses unapproved color ${color}`);
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
    assert.equal(markFiles.length, 6, "Expected exactly 6 standalone mark SVGs");
    assert.deepEqual(markFiles, EXPECTED.map((id) => `${id}.svg`), "Standalone mark filenames do not match the six concepts");
  } catch (error) {
    failures.push(error.message);
  }

  for (const id of EXPECTED) {
    const mark = readSvg(resolve(markDirectory, `${id}.svg`), `standalone mark ${id}`, failures);
    if (!mark) continue;

    verifyCommonSvg(mark, { label: `Standalone mark ${id}`, viewBox: "0 0 64 64", conceptId: id }, failures);
    if (/<text\b/i.test(mark)) failures.push(`Standalone mark ${id} must not contain editable text`);
  }

  try {
    assert.equal(lockupFiles.length, 6, "Expected exactly 6 horizontal lockup SVGs");
    assert.deepEqual(lockupFiles, EXPECTED.map((id) => `${id}.svg`), "Horizontal lockup filenames do not match the six concepts");
  } catch (error) {
    failures.push(error.message);
  }

  for (const id of EXPECTED) {
    const lockup = readSvg(resolve(lockupDirectory, `${id}.svg`), `horizontal lockup ${id}`, failures);
    if (!lockup) continue;

    verifyCommonSvg(lockup, { label: `Horizontal lockup ${id}`, viewBox: "0 0 520 112", conceptId: id }, failures);
    try {
      assert.match(lockup, /防曬晴報員/, `Horizontal lockup ${id} is missing the exact Chinese brand string`);
      assert.match(lockup, /UVAlert/, `Horizontal lockup ${id} is missing the exact English brand string`);
    } catch (error) {
      failures.push(error.message);
    }
  }

  const board = readSvg(boardPath, "comparison board", failures);
  if (board) {
    verifyCommonSvg(board, { label: "Comparison board", viewBox: "0 0 1600 1240", conceptId: EXPECTED[0] }, failures);

    const boardConcepts = [...board.matchAll(/data-concept=["']([^"']+)["']/g)].map((match) => match[1]);
    const boardConceptCount = new Set(boardConcepts).size;
    try {
      assert.equal(boardConceptCount, 6, "Comparison board must contain 6 unique concepts");
      assert.deepEqual([...new Set(boardConcepts)].sort(), EXPECTED, "Comparison board concept identifiers do not match the six concepts");
      assert.equal((board.match(/data-preview-size=["']32["']/g) ?? []).length, 6, "Comparison board must contain one 32px preview per concept");
      assert.match(board, /防曬晴報員/, "Comparison board is missing the exact Chinese brand string");
      assert.match(board, /UVAlert/, "Comparison board is missing the exact English brand string");
    } catch (error) {
      failures.push(error.message);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Logo concept verification failed:\n- ${failures.join("\n- ")}`);
  }

  return { marks: markFiles.length, lockups: lockupFiles.length, boardConcepts: EXPECTED.length };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  try {
    const result = verifyLogoConcepts(process.argv[2]);
    console.log(`PASS: ${result.marks} marks, ${result.lockups} lockups, ${result.boardConcepts} board concepts`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
