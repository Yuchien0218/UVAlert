import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { makeProductSnapshot } from "../../../test-fixtures/src/index";
import { SunshieldDatabase } from "../db/database";
import { LocalProductCatalogRepository } from "./local-product-catalog-repository";

const databases: SunshieldDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

describe("LocalProductCatalogRepository", () => {
  it("建立、更新、列出與停止產品，並保留穩定 productId", async () => {
    const database = new SunshieldDatabase(`catalog-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new LocalProductCatalogRepository(database);
    const created = await repository.saveProduct({
      productId: "product-a",
      displayName: "日常防曬",
      gearCategory: "sunscreen",
      snapshot: makeProductSnapshot(),
      now: "2026-08-01T08:00:00.000Z"
    });
    const updatedSnapshot = makeProductSnapshot({ capturedAt: "2026-08-01T09:00:00.000Z" });
    const updated = await repository.saveProduct({
      productId: "product-a",
      displayName: "戶外防曬",
      gearCategory: "sunscreen",
      snapshot: updatedSnapshot,
      now: "2026-08-01T09:00:00.000Z"
    });

    expect(updated.productId).toBe(created.productId);
    expect(updated.createdAt).toBe(created.createdAt);
    expect((await repository.listProducts())[0]?.displayName).toBe("戶外防曬");

    await repository.stopProduct("product-a", "2026-08-01T10:00:00.000Z");
    expect((await repository.getProduct("product-a"))?.status).toBe("stopped");
  });

  it("1.0.0 舊紀錄讀取時升級為新版並視為防曬產品", async () => {
    const database = new SunshieldDatabase(`catalog-migrate-${crypto.randomUUID()}`);
    databases.push(database);
    // 直接塞一筆 1.0.0 的紀錄，模擬擴充前存下的資料。
    await database.SunscreenProducts.put({
      schemaVersion: "1.0.0",
      productId: "legacy-product",
      displayName: "舊資料",
      currentSnapshot: makeProductSnapshot(),
      snapshotFingerprint: "fp-legacy",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      status: "active"
    } as never);

    const products = await new LocalProductCatalogRepository(
      database
    ).listProducts("2026-08-01T00:00:00.000Z");

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      schemaVersion: "1.1.0",
      gearCategory: "sunscreen",
      purchaseMonth: null,
      expiryDate: null,
      note: null,
      archivedAt: null
    });
    // 升級後就地寫回，下次讀取不必再轉換。
    const stored = await database.SunscreenProducts.get("legacy-product");
    expect(stored?.schemaVersion).toBe("1.1.0");
  });

  it("到期日已過時推導出 expired，維持過期產品不建立期限", async () => {
    const database = new SunshieldDatabase(`catalog-expiry-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new LocalProductCatalogRepository(database);

    const saved = await repository.saveProduct({
      productId: "product-expiring",
      displayName: "快過期的防曬",
      gearCategory: "sunscreen",
      snapshot: makeProductSnapshot(),
      expiryDate: "2026-08-31",
      now: "2026-08-01T00:00:00.000Z"
    });
    expect(saved.currentSnapshot.expiryStatus).toBe("not_expired");

    // 同一筆紀錄在到期日之後讀取，狀態必須跟著改變並就地寫回。
    const later = await repository.getProduct(
      "product-expiring",
      "2026-09-05T00:00:00.000Z"
    );
    expect(later?.currentSnapshot.expiryStatus).toBe("expired");
    expect(later?.snapshotFingerprint).not.toBe(saved.snapshotFingerprint);
  });

  it("安全狀態被封鎖的產品不得直接恢復", async () => {
    const database = new SunshieldDatabase(`catalog-restore-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new LocalProductCatalogRepository(database);
    await repository.saveProduct({
      productId: "product-blocked",
      displayName: "用了不舒服的產品",
      gearCategory: "sunscreen",
      snapshot: makeProductSnapshot({
        conditionStatus: "discomfort_reported",
        ruleEligibilityAtApplication: "discomfort_reported"
      }),
      now: "2026-08-01T00:00:00.000Z"
    });
    await repository.archiveProduct("product-blocked", "2026-08-02T00:00:00.000Z");

    await repository.restoreProduct("product-blocked", "2026-08-03T00:00:00.000Z");

    expect(
      (await repository.getProduct("product-blocked"))?.archivedAt
    ).not.toBeNull();
  });

  it("一般封存的裝備可以恢復", async () => {
    const database = new SunshieldDatabase(`catalog-restore-ok-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new LocalProductCatalogRepository(database);
    await repository.saveProduct({
      productId: "product-hat",
      displayName: "寬邊帽",
      gearCategory: "other_gear",
      snapshot: makeProductSnapshot(),
      now: "2026-08-01T00:00:00.000Z"
    });
    await repository.archiveProduct("product-hat", "2026-08-02T00:00:00.000Z");
    await repository.restoreProduct("product-hat", "2026-08-03T00:00:00.000Z");

    expect((await repository.getProduct("product-hat"))?.archivedAt).toBeNull();
  });

  it("以中性名稱匯入既有 current snapshot，不捏造品牌", async () => {
    const database = new SunshieldDatabase(`catalog-legacy-${crypto.randomUUID()}`);
    databases.push(database);
    const snapshot = makeProductSnapshot();
    await database.AppMetadata.put({ key: "currentProductLabelSnapshotV1", value: JSON.stringify(snapshot) });
    const products = await new LocalProductCatalogRepository(database).listProducts();
    expect(products).toHaveLength(1);
    expect(products[0]?.displayName).toBe("目前使用產品");
    expect(products[0]?.currentSnapshot).toEqual(snapshot);
  });
});
