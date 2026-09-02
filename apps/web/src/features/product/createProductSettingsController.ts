import type {
  GearCategory,
  ProductCatalogRecordV1,
  ProductLabelSnapshotV1
} from "@sunshield/contracts";
import type {
  ProductCatalogPort,
  ProductSettingsPort
} from "@sunshield/platform";
import { shallowReadonly, shallowRef, type ShallowRef } from "vue";

export type ProductSettingsPhase =
  "idle" | "loading" | "ready" | "saving" | "error";

export interface ProductSettingsController {
  readonly phase: Readonly<ShallowRef<ProductSettingsPhase>>;
  readonly snapshot: Readonly<ShallowRef<ProductLabelSnapshotV1 | null>>;
  readonly products: Readonly<ShallowRef<ProductCatalogRecordV1[]>>;
  ensureLoaded(): Promise<void>;
  save(snapshot: ProductLabelSnapshotV1): Promise<boolean>;
  saveProduct(input: SaveGearInput): Promise<boolean>;
  stopProduct(productId: string): Promise<boolean>;
  archiveProduct(productId: string): Promise<boolean>;
  restoreProduct(productId: string): Promise<boolean>;
  deleteProduct(productId: string): Promise<boolean>;
  refresh(): Promise<void>;
  dispose(): void;
}

export interface SaveGearInput {
  displayName: string;
  gearCategory: GearCategory;
  snapshot: ProductLabelSnapshotV1;
  purchaseMonth?: string | null | undefined;
  expiryDate?: string | null | undefined;
  note?: string | null | undefined;
  /** 2026-08-30：純紀錄，不進 reducer。 */
  priceTwd?: number | null | undefined;
  /** 2026-08-30：純紀錄，不進 reducer。 */
  usageRating?: "good" | "ok" | "bad" | null | undefined;
  /** 2026-09-01：純紀錄，不進 reducer。 */
  size?: string | null | undefined;
  /** 2026-09-01：純紀錄，不進 reducer。 */
  color?: string | null | undefined;
  productId?: string | undefined;
  /**
   * 只有 sunscreen 會成為「目前使用產品」。記錄一副墨鏡不該改變
   * 設定流程要沿用的產品，否則使用者會以為提醒行為跟著變了。
   */
  setAsCurrent?: boolean;
}

interface ProductSettingsControllerDependencies {
  repository: ProductSettingsPort;
  catalog?: ProductCatalogPort;
  createId?: () => string;
  now?: () => Date;
}

export function createProductSettingsController(
  dependencies: ProductSettingsControllerDependencies
): ProductSettingsController {
  const phaseState = shallowRef<ProductSettingsPhase>("idle");
  const snapshotState = shallowRef<ProductLabelSnapshotV1 | null>(null);
  const productsState = shallowRef<ProductCatalogRecordV1[]>([]);
  let loadPromise: Promise<void> | null = null;
  let loaded = false;
  let disposed = false;

  async function performLoad(): Promise<void> {
    phaseState.value = "loading";
    try {
      const [snapshot, products] = await Promise.all([
        dependencies.repository.getCurrentProductSnapshot(),
        dependencies.catalog?.listProducts() ?? Promise.resolve([])
      ]);
      snapshotState.value = snapshot;
      productsState.value = products;
      loaded = true;
      phaseState.value = "ready";
    } catch {
      phaseState.value = "error";
    }
  }

  function nowIso(): string {
    return (dependencies.now?.() ?? new Date()).toISOString();
  }

  async function saveProduct(input: SaveGearInput): Promise<boolean> {
    if (
      dependencies.catalog === undefined ||
      dependencies.createId === undefined
    )
      return save(input.snapshot);
    const setAsCurrent =
      input.setAsCurrent ?? input.gearCategory === "sunscreen";
    phaseState.value = "saving";
    try {
      const now = nowIso();
      const saved = await dependencies.catalog.saveProduct({
        productId: input.productId ?? dependencies.createId(),
        displayName: input.displayName,
        gearCategory: input.gearCategory,
        snapshot: input.snapshot,
        purchaseMonth: input.purchaseMonth ?? null,
        expiryDate: input.expiryDate ?? null,
        note: input.note ?? null,
        priceTwd: input.priceTwd ?? null,
        usageRating: input.usageRating ?? null,
        size: input.size ?? null,
        color: input.color ?? null,
        now
      });
      if (setAsCurrent) {
        // 保存 catalog 修正過到期狀態後的 snapshot，不是表單原值。
        await dependencies.repository.saveCurrentProductSnapshot(
          saved.currentSnapshot
        );
        snapshotState.value = saved.currentSnapshot;
      }
      productsState.value = await dependencies.catalog.listProducts(now);
      loaded = true;
      phaseState.value = "ready";
      return true;
    } catch {
      phaseState.value = "error";
      return false;
    }
  }

  async function mutate(
    run: (catalog: ProductCatalogPort, now: string) => Promise<void>
  ): Promise<boolean> {
    if (dependencies.catalog === undefined) return false;
    phaseState.value = "saving";
    try {
      const now = nowIso();
      await run(dependencies.catalog, now);
      productsState.value = await dependencies.catalog.listProducts(now);
      phaseState.value = "ready";
      return true;
    } catch {
      phaseState.value = "error";
      return false;
    }
  }

  async function stopProduct(productId: string): Promise<boolean> {
    return mutate((catalog, now) => catalog.stopProduct(productId, now));
  }

  async function archiveProduct(productId: string): Promise<boolean> {
    return mutate((catalog, now) => catalog.archiveProduct(productId, now));
  }

  async function restoreProduct(productId: string): Promise<boolean> {
    return mutate((catalog, now) => catalog.restoreProduct(productId, now));
  }

  async function deleteProduct(productId: string): Promise<boolean> {
    return mutate((catalog) => catalog.deleteProduct(productId));
  }

  async function refresh(): Promise<void> {
    loaded = false;
    await ensureLoaded();
  }

  function ensureLoaded(): Promise<void> {
    if (disposed || loaded) return Promise.resolve();
    loadPromise ??= performLoad().finally(() => {
      loadPromise = null;
    });
    return loadPromise;
  }

  async function save(snapshot: ProductLabelSnapshotV1): Promise<boolean> {
    phaseState.value = "saving";
    try {
      await dependencies.repository.saveCurrentProductSnapshot(snapshot);
      snapshotState.value = snapshot;
      loaded = true;
      phaseState.value = "ready";
      return true;
    } catch {
      phaseState.value = "error";
      return false;
    }
  }

  function dispose(): void {
    disposed = true;
  }

  return {
    phase: shallowReadonly(phaseState),
    snapshot: shallowReadonly(snapshotState),
    products: shallowReadonly(productsState),
    ensureLoaded,
    save,
    saveProduct,
    stopProduct,
    archiveProduct,
    restoreProduct,
    deleteProduct,
    refresh,
    dispose
  };
}
