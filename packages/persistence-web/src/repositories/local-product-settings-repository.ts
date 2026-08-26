import {
  ProductLabelSnapshotV1Schema,
  type ProductLabelSnapshotV1
} from "@sunshield/contracts";
import type { ProductSettingsPort } from "@sunshield/platform";
import type { SunshieldDatabase } from "../db/database";

const CURRENT_PRODUCT_SNAPSHOT_KEY = "currentProductLabelSnapshotV1";

export class LocalProductSettingsRepository implements ProductSettingsPort {
  readonly #database: SunshieldDatabase;

  constructor(database: SunshieldDatabase) {
    this.#database = database;
  }

  async getCurrentProductSnapshot(): Promise<ProductLabelSnapshotV1 | null> {
    const stored = await this.#database.AppMetadata.get(
      CURRENT_PRODUCT_SNAPSHOT_KEY
    );
    if (stored === undefined) return null;

    try {
      const parsed = ProductLabelSnapshotV1Schema.safeParse(
        JSON.parse(stored.value)
      );
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  async saveCurrentProductSnapshot(
    snapshot: ProductLabelSnapshotV1
  ): Promise<void> {
    const parsed = ProductLabelSnapshotV1Schema.parse(snapshot);
    await this.#database.AppMetadata.put({
      key: CURRENT_PRODUCT_SNAPSHOT_KEY,
      value: JSON.stringify(parsed)
    });
  }

  async clearCurrentProductSnapshot(): Promise<void> {
    await this.#database.AppMetadata.delete(CURRENT_PRODUCT_SNAPSHOT_KEY);
  }
}
