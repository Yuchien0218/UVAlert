import type { NationwideUvCounty, UvRiskLevel } from "@sunshield/contracts";

export interface UvRiskPresentation {
  readonly level: UvRiskLevel;
  readonly label: string;
  readonly rangeLabel: string;
  readonly classSuffix: string;
}

export interface UvCountyGroup {
  readonly id: "north" | "central" | "south" | "east" | "islands";
  readonly label: string;
  readonly counties: readonly NationwideUvCounty[];
}

const UVI_FULL_SCALE = 11;

const UV_RISK_PRESENTATION_BY_LEVEL = {
  low: { level: "low", label: "低量級", rangeLabel: "0–2", classSuffix: "low" },
  moderate: {
    level: "moderate",
    label: "中量級",
    rangeLabel: "3–5",
    classSuffix: "moderate"
  },
  high: {
    level: "high",
    label: "高量級",
    rangeLabel: "6–7",
    classSuffix: "high"
  },
  very_high: {
    level: "very_high",
    label: "過量級",
    rangeLabel: "8–10",
    classSuffix: "very-high"
  },
  extreme: {
    level: "extreme",
    label: "危險級",
    rangeLabel: "11+",
    classSuffix: "extreme"
  }
} as const satisfies Readonly<Record<UvRiskLevel, UvRiskPresentation>>;

export const UV_RISK_PRESENTATIONS: readonly UvRiskPresentation[] = [
  UV_RISK_PRESENTATION_BY_LEVEL.low,
  UV_RISK_PRESENTATION_BY_LEVEL.moderate,
  UV_RISK_PRESENTATION_BY_LEVEL.high,
  UV_RISK_PRESENTATION_BY_LEVEL.very_high,
  UV_RISK_PRESENTATION_BY_LEVEL.extreme
];

const COUNTY_GROUP_DEFINITIONS = [
  {
    id: "north",
    label: "北部",
    countyCodes: ["63000", "65000", "10017", "68000", "10018", "10004", "10002"]
  },
  {
    id: "central",
    label: "中部",
    countyCodes: ["10005", "66000", "10007", "10008", "10009"]
  },
  {
    id: "south",
    label: "南部",
    countyCodes: ["10020", "10010", "67000", "64000", "10013"]
  },
  { id: "east", label: "東部", countyCodes: ["10015", "10014"] },
  { id: "islands", label: "外島", countyCodes: ["10016", "09020", "09007"] }
] as const satisfies readonly {
  readonly id: UvCountyGroup["id"];
  readonly label: string;
  readonly countyCodes: readonly string[];
}[];

const KNOWN_COUNTY_CODES: ReadonlySet<string> = new Set(
  COUNTY_GROUP_DEFINITIONS.flatMap((group) => group.countyCodes)
);

export function getUvRiskPresentation(
  riskLevel: UvRiskLevel
): UvRiskPresentation {
  return UV_RISK_PRESENTATION_BY_LEVEL[riskLevel];
}

export function getUvRiskClassSuffix(riskLevel: UvRiskLevel): string {
  return getUvRiskPresentation(riskLevel).classSuffix;
}

export function getUviFillPercent(uvi: number): string {
  if (!Number.isFinite(uvi) || uvi < 0) return "0%";

  return `${Math.round(Math.min(uvi / UVI_FULL_SCALE, 1) * 100)}%`;
}

export function groupNationwideCounties(
  counties: readonly NationwideUvCounty[]
): readonly UvCountyGroup[] {
  const countiesByCode = new Map<string, NationwideUvCounty>();

  for (const county of counties) {
    if (!KNOWN_COUNTY_CODES.has(county.countyCode)) {
      throw new Error(`未知的縣市代碼：${county.countyCode}`);
    }
    if (countiesByCode.has(county.countyCode)) {
      throw new Error(`重複的縣市代碼：${county.countyCode}`);
    }
    countiesByCode.set(county.countyCode, county);
  }

  return COUNTY_GROUP_DEFINITIONS.map((group) => ({
    id: group.id,
    label: group.label,
    counties: group.countyCodes.flatMap((countyCode) => {
      const county = countiesByCode.get(countyCode);
      return county === undefined ? [] : [county];
    })
  }));
}
