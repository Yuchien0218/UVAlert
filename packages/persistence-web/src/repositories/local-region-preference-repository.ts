import {
  REGION_PREFERENCE_SCHEMA_VERSION,
  RegionPreferenceV1Schema,
  RegionReferenceSchema,
  type RegionPreferenceV1,
  type RegionSelection
} from "@sunshield/contracts";
import type { RegionPreferencePort } from "@sunshield/platform";
import type { SunshieldDatabase } from "../db/database";

const CURRENT_PREFERENCE_KEY = "uvRegionPreferenceV1";
const LEGACY_SELECTION_KEY = "uvRegionSelection";

export interface LegacyRegionLookup {
  resolve(
    regionCode: string
  ): Omit<RegionSelection, "selectionMethod"> | RegionSelection | null;
}

export interface LocalRegionPreferenceRepositoryOptions {
  legacyRegionLookup?: LegacyRegionLookup;
}

export class LocalRegionPreferenceRepository
  implements RegionPreferencePort
{
  readonly #database: SunshieldDatabase;
  readonly #legacyRegionLookup: LegacyRegionLookup | undefined;

  constructor(
    database: SunshieldDatabase,
    options: LocalRegionPreferenceRepositoryOptions = {}
  ) {
    this.#database = database;
    this.#legacyRegionLookup = options.legacyRegionLookup;
  }

  async getPreference(): Promise<RegionPreferenceV1 | null> {
    const stored = await this.#database.AppMetadata.get(
      CURRENT_PREFERENCE_KEY
    );
    if (stored !== undefined) {
      return parsePreference(stored.value);
    }

    return this.#migrateLegacySelection();
  }

  async savePreference(
    preference: RegionPreferenceV1
  ): Promise<void> {
    const parsed = RegionPreferenceV1Schema.parse(preference);

    await this.#database.transaction(
      "rw",
      this.#database.AppMetadata,
      async () => {
        await this.#database.AppMetadata.put({
          key: CURRENT_PREFERENCE_KEY,
          value: JSON.stringify(parsed)
        });
        await this.#database.AppMetadata.delete(
          LEGACY_SELECTION_KEY
        );
      }
    );
  }

  async #migrateLegacySelection(): Promise<RegionPreferenceV1 | null> {
    const stored = await this.#database.AppMetadata.get(
      LEGACY_SELECTION_KEY
    );
    if (stored === undefined || this.#legacyRegionLookup === undefined) {
      return null;
    }

    const legacyReference = parseLegacyReference(stored.value);
    if (legacyReference === null) return null;

    const resolved = this.#legacyRegionLookup.resolve(
      legacyReference.regionCode
    );
    if (resolved === null) return null;

    const preference = RegionPreferenceV1Schema.parse({
      schemaVersion: REGION_PREFERENCE_SCHEMA_VERSION,
      mode: "selected",
      selection: {
        ...resolved,
        selectionMethod: "manual"
      }
    });

    await this.#database.transaction(
      "rw",
      this.#database.AppMetadata,
      async () => {
        await this.#database.AppMetadata.put({
          key: CURRENT_PREFERENCE_KEY,
          value: JSON.stringify(preference)
        });
        await this.#database.AppMetadata.delete(
          LEGACY_SELECTION_KEY
        );
      }
    );

    return preference;
  }
}

function parsePreference(value: string): RegionPreferenceV1 | null {
  try {
    const parsed = RegionPreferenceV1Schema.safeParse(
      JSON.parse(value)
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function parseLegacyReference(value: string) {
  try {
    const parsed = RegionReferenceSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
