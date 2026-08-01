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
      snapshot: makeProductSnapshot(),
      now: "2026-08-01T08:00:00.000Z"
    });
    const updatedSnapshot = makeProductSnapshot({ capturedAt: "2026-08-01T09:00:00.000Z" });
    const updated = await repository.saveProduct({
      productId: "product-a",
      displayName: "戶外防曬",
      snapshot: updatedSnapshot,
      now: "2026-08-01T09:00:00.000Z"
    });

    expect(updated.productId).toBe(created.productId);
    expect(updated.createdAt).toBe(created.createdAt);
    expect((await repository.listProducts())[0]?.displayName).toBe("戶外防曬");

    await repository.stopProduct("product-a", "2026-08-01T10:00:00.000Z");
    expect((await repository.getProduct("product-a"))?.status).toBe("stopped");
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
