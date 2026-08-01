import {
  computed,
  shallowReadonly,
  shallowRef,
  watch,
  type ComputedRef,
  type ShallowRef
} from "vue";

export type AppearancePreference = "light" | "dark" | "system";
export type ResolvedAppearance = Exclude<AppearancePreference, "system">;

export const APPEARANCE_STORAGE_KEY = "sunshield.appearance";

interface AppearanceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface AppearanceMediaQuery {
  readonly matches: boolean;
  addEventListener(
    type: "change",
    listener: (event: MediaQueryListEvent) => void
  ): void;
  removeEventListener(
    type: "change",
    listener: (event: MediaQueryListEvent) => void
  ): void;
}

interface AppearanceRoot {
  readonly dataset: DOMStringMap;
}

export interface AppearanceController {
  readonly preference: Readonly<ShallowRef<AppearancePreference>>;
  readonly resolvedAppearance: ComputedRef<ResolvedAppearance>;
  setPreference(preference: AppearancePreference): void;
  dispose(): void;
}

export interface AppearanceControllerOptions {
  storage?: AppearanceStorage;
  mediaQuery?: AppearanceMediaQuery;
  root?: AppearanceRoot;
}

export function createAppearanceController(
  options: AppearanceControllerOptions = {}
): AppearanceController {
  const storage = options.storage ?? globalThis.localStorage;
  const mediaQuery =
    options.mediaQuery ??
    globalThis.matchMedia("(prefers-color-scheme: dark)");
  const root = options.root ?? globalThis.document.documentElement;
  const preference = shallowRef<AppearancePreference>(
    readStoredPreference(storage)
  );
  const systemAppearance = shallowRef<ResolvedAppearance>(
    mediaQuery.matches ? "dark" : "light"
  );
  const resolvedAppearance = computed<ResolvedAppearance>(() =>
    preference.value === "system"
      ? systemAppearance.value
      : preference.value
  );

  const stopApplyingAppearance = watch(
    resolvedAppearance,
    (appearance) => {
      root.dataset.theme = appearance;
    },
    { immediate: true, flush: "sync" }
  );

  const handleSystemAppearanceChange = (
    event: MediaQueryListEvent
  ): void => {
    systemAppearance.value = event.matches ? "dark" : "light";
  };

  mediaQuery.addEventListener("change", handleSystemAppearanceChange);

  return {
    preference: shallowReadonly(preference),
    resolvedAppearance,
    setPreference(nextPreference): void {
      preference.value = nextPreference;
      writeStoredPreference(storage, nextPreference);
    },
    dispose(): void {
      stopApplyingAppearance();
      mediaQuery.removeEventListener(
        "change",
        handleSystemAppearanceChange
      );
    }
  };
}

function readStoredPreference(
  storage: AppearanceStorage
): AppearancePreference {
  try {
    const storedPreference = storage.getItem(APPEARANCE_STORAGE_KEY);
    return isAppearancePreference(storedPreference)
      ? storedPreference
      : "system";
  } catch {
    return "system";
  }
}

function writeStoredPreference(
  storage: AppearanceStorage,
  preference: AppearancePreference
): void {
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, preference);
  } catch {
    // The visual preference still applies for this session when storage
    // is unavailable, such as in a restricted private-browsing context.
  }
}

function isAppearancePreference(
  value: string | null
): value is AppearancePreference {
  return value === "light" || value === "dark" || value === "system";
}
