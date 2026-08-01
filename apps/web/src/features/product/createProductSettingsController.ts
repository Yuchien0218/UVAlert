import type { ProductCatalogRecordV1, ProductLabelSnapshotV1 } from "@sunshield/contracts";
import type { ProductCatalogPort, ProductSettingsPort } from "@sunshield/platform";
import {
  shallowReadonly,
  shallowRef,
  type ShallowRef
} from "vue";

export type ProductSettingsPhase =
  | "idle"
  | "loading"
  | "ready"
  | "saving"
  | "error";

export interface ProductSettingsController {
  readonly phase: Readonly<ShallowRef<ProductSettingsPhase>>;
  readonly snapshot: Readonly<
    ShallowRef<ProductLabelSnapshotV1 | null>
  >;
  readonly products: Readonly<ShallowRef<ProductCatalogRecordV1[]>>;
  ensureLoaded(): Promise<void>;
  save(snapshot: ProductLabelSnapshotV1): Promise<boolean>;
  saveProduct(displayName: string, snapshot: ProductLabelSnapshotV1, productId?: string): Promise<boolean>;
  stopProduct(productId: string): Promise<boolean>;
  dispose(): void;
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
  const snapshotState =
    shallowRef<ProductLabelSnapshotV1 | null>(null);
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

  async function saveProduct(displayName: string, snapshot: ProductLabelSnapshotV1, productId?: string): Promise<boolean> {
    if (dependencies.catalog === undefined || dependencies.createId === undefined) return save(snapshot);
    phaseState.value = "saving";
    try {
      await dependencies.repository.saveCurrentProductSnapshot(snapshot);
      await dependencies.catalog.saveProduct({ productId: productId ?? dependencies.createId(), displayName, snapshot, now: (dependencies.now?.() ?? new Date()).toISOString() });
      snapshotState.value = snapshot;
      productsState.value = await dependencies.catalog.listProducts();
      loaded = true;
      phaseState.value = "ready";
      return true;
    } catch {
      phaseState.value = "error";
      return false;
    }
  }

  async function stopProduct(productId: string): Promise<boolean> {
    if (dependencies.catalog === undefined) return false;
    phaseState.value = "saving";
    try {
      await dependencies.catalog.stopProduct(productId, (dependencies.now?.() ?? new Date()).toISOString());
      productsState.value = await dependencies.catalog.listProducts();
      phaseState.value = "ready";
      return true;
    } catch {
      phaseState.value = "error";
      return false;
    }
  }

  function ensureLoaded(): Promise<void> {
    if (disposed || loaded) return Promise.resolve();
    loadPromise ??= performLoad().finally(() => {
      loadPromise = null;
    });
    return loadPromise;
  }

  async function save(
    snapshot: ProductLabelSnapshotV1
  ): Promise<boolean> {
    phaseState.value = "saving";
    try {
      await dependencies.repository.saveCurrentProductSnapshot(
        snapshot
      );
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
    dispose
  };
}
