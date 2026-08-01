import {
  ProductCatalogRecordV1Schema,
  fingerprintProductLabelSnapshot,
  ProductLabelSnapshotV1Schema,
  type ProductCatalogRecordV1,
  type ProductLabelSnapshotV1
} from "@sunshield/contracts";
import type { ProductCatalogPort } from "@sunshield/platform";
import type { SunshieldDatabase } from "../db/database";

export class LocalProductCatalogRepository implements ProductCatalogPort {
  readonly #database: SunshieldDatabase;

  constructor(database: SunshieldDatabase) {
    this.#database = database;
  }

  async listProducts(): Promise<ProductCatalogRecordV1[]> {
    await this.#importLegacyCurrentSnapshot();
    return this.#database.SunscreenProducts.orderBy("updatedAt").reverse().toArray();
  }

  async getProduct(productId: string): Promise<ProductCatalogRecordV1 | null> {
    return (await this.#database.SunscreenProducts.get(productId)) ?? null;
  }

  async saveProduct(input: {
    productId: string;
    displayName: string;
    snapshot: ProductLabelSnapshotV1;
    now: string;
  }): Promise<ProductCatalogRecordV1> {
    const snapshot = ProductLabelSnapshotV1Schema.parse(input.snapshot);
    const existing = await this.#database.SunscreenProducts.get(input.productId);
    const record = ProductCatalogRecordV1Schema.parse({
      schemaVersion: "1.0.0",
      productId: input.productId,
      displayName: input.displayName,
      currentSnapshot: snapshot,
      snapshotFingerprint: fingerprintProductLabelSnapshot(snapshot),
      createdAt: existing?.createdAt ?? input.now,
      updatedAt: input.now,
      status: "active"
    });
    await this.#database.SunscreenProducts.put(record);
    return record;
  }

  async stopProduct(productId: string, now: string): Promise<void> {
    const existing = await this.#database.SunscreenProducts.get(productId);
    if (existing === undefined) return;
    await this.#database.SunscreenProducts.put({
      ...existing,
      status: "stopped",
      updatedAt: now
    });
  }

  async #importLegacyCurrentSnapshot(): Promise<void> {
    if ((await this.#database.SunscreenProducts.count()) > 0) return;
    const legacy = await this.#database.AppMetadata.get("currentProductLabelSnapshotV1");
    if (legacy === undefined) return;
    let raw: unknown;
    try { raw = JSON.parse(legacy.value); } catch { return; }
    const parsed = ProductLabelSnapshotV1Schema.safeParse(raw);
    if (!parsed.success) return;
    const fingerprint = fingerprintProductLabelSnapshot(parsed.data);
    await this.#database.SunscreenProducts.put(ProductCatalogRecordV1Schema.parse({
      schemaVersion: "1.0.0",
      productId: `legacy-${fingerprint}`,
      displayName: "目前使用產品",
      currentSnapshot: parsed.data,
      snapshotFingerprint: fingerprint,
      createdAt: parsed.data.capturedAt,
      updatedAt: parsed.data.capturedAt,
      status: "active"
    }));
  }
}
