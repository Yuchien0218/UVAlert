import {
  deriveExpiryStatus,
  deriveRuleEligibility,
  fingerprintProductLabelSnapshot,
  PRODUCT_CATALOG_RECORD_VERSION,
  ProductCatalogRecordV1Schema,
  ProductLabelSnapshotV1Schema,
  type ProductCatalogRecordV1
} from "@sunshield/contracts";
import type { ProductCatalogPort, SaveProductInput } from "@sunshield/platform";
import type { SunshieldDatabase } from "../db/database";

export class LocalProductCatalogRepository implements ProductCatalogPort {
  readonly #database: SunshieldDatabase;

  constructor(database: SunshieldDatabase) {
    this.#database = database;
  }

  async listProducts(
    now = new Date().toISOString()
  ): Promise<ProductCatalogRecordV1[]> {
    await this.#importLegacyCurrentSnapshot();
    const rows = await this.#database.SunscreenProducts.orderBy("updatedAt")
      .reverse()
      .toArray();
    const records: ProductCatalogRecordV1[] = [];
    for (const row of rows) {
      const record = await this.#normalize(row, now);
      if (record !== null) records.push(record);
    }
    return records;
  }

  async getProduct(
    productId: string,
    now = new Date().toISOString()
  ): Promise<ProductCatalogRecordV1 | null> {
    const row = await this.#database.SunscreenProducts.get(productId);
    if (row === undefined) return null;
    return this.#normalize(row, now);
  }

  async saveProduct(input: SaveProductInput): Promise<ProductCatalogRecordV1> {
    const expiryDate = input.expiryDate ?? null;
    // 到期日是四個新欄位裡唯一進 reducer 的，必須落回 snapshot 才會
    // 保留「過期產品不建立期限」的既有行為。
    const expiryStatus = deriveExpiryStatus(expiryDate, input.now);
    const snapshot = ProductLabelSnapshotV1Schema.parse({
      ...input.snapshot,
      expiryStatus,
      ruleEligibilityAtApplication: deriveRuleEligibility({
        ...input.snapshot,
        expiryStatus
      })
    });
    const existing = await this.#database.SunscreenProducts.get(
      input.productId
    );
    const record = ProductCatalogRecordV1Schema.parse({
      schemaVersion: PRODUCT_CATALOG_RECORD_VERSION,
      productId: input.productId,
      displayName: input.displayName,
      gearCategory: input.gearCategory,
      currentSnapshot: snapshot,
      snapshotFingerprint: fingerprintProductLabelSnapshot(snapshot),
      purchaseMonth: input.purchaseMonth ?? null,
      expiryDate,
      note: input.note ?? null,
      archivedAt: existing?.archivedAt ?? null,
      createdAt: existing?.createdAt ?? input.now,
      updatedAt: input.now,
      status: "active"
    });
    await this.#database.SunscreenProducts.put(record);
    return record;
  }

  async stopProduct(productId: string, now: string): Promise<void> {
    await this.#patch(productId, now, { status: "stopped" });
  }

  async archiveProduct(productId: string, now: string): Promise<void> {
    await this.#patch(productId, now, { archivedAt: now });
  }

  async restoreProduct(productId: string, now: string): Promise<void> {
    const existing = await this.#database.SunscreenProducts.get(productId);
    if (existing === undefined) return;
    // 安全狀態被封鎖的產品不得直接恢復（S-13）；需要另建新版。
    const eligibility = existing.currentSnapshot?.ruleEligibilityAtApplication;
    if (
      eligibility === "abnormal_reported" ||
      eligibility === "discomfort_reported"
    ) {
      return;
    }
    await this.#patch(productId, now, { archivedAt: null, status: "active" });
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.#database.SunscreenProducts.delete(productId);
  }

  async #patch(
    productId: string,
    now: string,
    changes: Partial<ProductCatalogRecordV1>
  ): Promise<void> {
    const existing = await this.#database.SunscreenProducts.get(productId);
    if (existing === undefined) return;
    const upgraded = await this.#normalize(existing, now);
    if (upgraded === null) return;
    await this.#database.SunscreenProducts.put({
      ...upgraded,
      ...changes,
      updatedAt: now
    });
  }

  /**
   * 舊資料 migration 與到期狀態同步。
   *
   * 1.0.0 的紀錄沒有品類，一律視為 `sunscreen`——那是當時唯一能存的東西。
   * 另外到期是會隨時間改變的：存檔時還沒過期、今天過期了，snapshot 必須
   * 跟著改，否則 reducer 會繼續用過期產品建立倒數。修正後就地寫回，
   * fingerprint 才不會與 snapshot 脫節。
   */
  async #normalize(
    row: ProductCatalogRecordV1,
    now: string
  ): Promise<ProductCatalogRecordV1 | null> {
    const raw = row as ProductCatalogRecordV1 & { schemaVersion: string };
    const candidate =
      raw.schemaVersion === PRODUCT_CATALOG_RECORD_VERSION
        ? raw
        : {
            ...raw,
            schemaVersion: PRODUCT_CATALOG_RECORD_VERSION,
            gearCategory: "sunscreen" as const,
            purchaseMonth: null,
            expiryDate: null,
            note: null,
            archivedAt: null
          };

    const expiryStatus = deriveExpiryStatus(candidate.expiryDate, now);
    const needsExpirySync =
      candidate.expiryDate !== null &&
      candidate.currentSnapshot.expiryStatus !== expiryStatus;
    const syncedSnapshot = needsExpirySync
      ? {
          ...candidate.currentSnapshot,
          expiryStatus,
          // 資格狀態與 expiryStatus 是綁在一起的不變式，
          // 只改其中一個 snapshot 會過不了自己的 superRefine。
          ruleEligibilityAtApplication: deriveRuleEligibility({
            ...candidate.currentSnapshot,
            expiryStatus
          })
        }
      : candidate.currentSnapshot;
    const synced = needsExpirySync
      ? { ...candidate, currentSnapshot: syncedSnapshot }
      : candidate;
    const withFingerprint = needsExpirySync
      ? {
          ...synced,
          snapshotFingerprint: fingerprintProductLabelSnapshot(
            synced.currentSnapshot
          )
        }
      : synced;

    const parsed = ProductCatalogRecordV1Schema.safeParse(withFingerprint);
    if (!parsed.success) return null;
    if (raw.schemaVersion !== PRODUCT_CATALOG_RECORD_VERSION || needsExpirySync) {
      await this.#database.SunscreenProducts.put(parsed.data);
    }
    return parsed.data;
  }

  async #importLegacyCurrentSnapshot(): Promise<void> {
    if ((await this.#database.SunscreenProducts.count()) > 0) return;
    const legacy = await this.#database.AppMetadata.get(
      "currentProductLabelSnapshotV1"
    );
    if (legacy === undefined) return;
    let raw: unknown;
    try {
      raw = JSON.parse(legacy.value);
    } catch {
      return;
    }
    const parsed = ProductLabelSnapshotV1Schema.safeParse(raw);
    if (!parsed.success) return;
    const fingerprint = fingerprintProductLabelSnapshot(parsed.data);
    await this.#database.SunscreenProducts.put(
      ProductCatalogRecordV1Schema.parse({
        schemaVersion: PRODUCT_CATALOG_RECORD_VERSION,
        productId: `legacy-${fingerprint}`,
        displayName: "目前使用產品",
        gearCategory: "sunscreen",
        currentSnapshot: parsed.data,
        snapshotFingerprint: fingerprint,
        purchaseMonth: null,
        expiryDate: null,
        note: null,
        archivedAt: null,
        createdAt: parsed.data.capturedAt,
        updatedAt: parsed.data.capturedAt,
        status: "active"
      })
    );
  }
}
