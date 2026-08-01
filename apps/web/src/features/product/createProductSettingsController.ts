import type { ProductLabelSnapshotV1 } from "@sunshield/contracts";
import type { ProductSettingsPort } from "@sunshield/platform";
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
  ensureLoaded(): Promise<void>;
  save(snapshot: ProductLabelSnapshotV1): Promise<boolean>;
  dispose(): void;
}

interface ProductSettingsControllerDependencies {
  repository: ProductSettingsPort;
}

export function createProductSettingsController(
  dependencies: ProductSettingsControllerDependencies
): ProductSettingsController {
  const phaseState = shallowRef<ProductSettingsPhase>("idle");
  const snapshotState =
    shallowRef<ProductLabelSnapshotV1 | null>(null);
  let loadPromise: Promise<void> | null = null;
  let loaded = false;
  let disposed = false;

  async function performLoad(): Promise<void> {
    phaseState.value = "loading";
    try {
      snapshotState.value =
        await dependencies.repository.getCurrentProductSnapshot();
      loaded = true;
      phaseState.value = "ready";
    } catch {
      phaseState.value = "error";
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
    ensureLoaded,
    save,
    dispose
  };
}
