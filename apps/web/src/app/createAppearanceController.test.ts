// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import {
  APPEARANCE_STORAGE_KEY,
  createAppearanceController
} from "./createAppearanceController";

class MemoryAppearanceStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class FakeAppearanceMediaQuery {
  matches: boolean;
  private readonly listeners = new Set<
    (event: MediaQueryListEvent) => void
  >();

  constructor(matches: boolean) {
    this.matches = matches;
  }

  addEventListener(
    _type: "change",
    listener: (event: MediaQueryListEvent) => void
  ): void {
    this.listeners.add(listener);
  }

  removeEventListener(
    _type: "change",
    listener: (event: MediaQueryListEvent) => void
  ): void {
    this.listeners.delete(listener);
  }

  setMatches(matches: boolean): void {
    this.matches = matches;
    const event = { matches } as MediaQueryListEvent;
    this.listeners.forEach((listener) => listener(event));
  }
}

afterEach(() => {
  delete globalThis.document.documentElement.dataset.theme;
});

describe("createAppearanceController", () => {
  it("defaults to the system preference and follows system changes", () => {
    const storage = new MemoryAppearanceStorage();
    const mediaQuery = new FakeAppearanceMediaQuery(true);
    const controller = createAppearanceController({
      storage,
      mediaQuery
    });

    expect(controller.preference.value).toBe("system");
    expect(controller.resolvedAppearance.value).toBe("dark");
    expect(globalThis.document.documentElement.dataset.theme).toBe(
      "dark"
    );

    mediaQuery.setMatches(false);

    expect(controller.resolvedAppearance.value).toBe("light");
    expect(globalThis.document.documentElement.dataset.theme).toBe(
      "light"
    );

    controller.dispose();
  });

  it("restores an explicit preference instead of the system value", () => {
    const storage = new MemoryAppearanceStorage();
    storage.setItem(APPEARANCE_STORAGE_KEY, "light");
    const controller = createAppearanceController({
      storage,
      mediaQuery: new FakeAppearanceMediaQuery(true)
    });

    expect(controller.preference.value).toBe("light");
    expect(controller.resolvedAppearance.value).toBe("light");
    expect(globalThis.document.documentElement.dataset.theme).toBe(
      "light"
    );

    controller.dispose();
  });

  it("persists an explicit choice and applies it immediately", () => {
    const storage = new MemoryAppearanceStorage();
    const controller = createAppearanceController({
      storage,
      mediaQuery: new FakeAppearanceMediaQuery(false)
    });

    controller.setPreference("dark");

    expect(storage.getItem(APPEARANCE_STORAGE_KEY)).toBe("dark");
    expect(controller.resolvedAppearance.value).toBe("dark");
    expect(globalThis.document.documentElement.dataset.theme).toBe(
      "dark"
    );

    controller.dispose();
  });

  it("ignores an invalid stored value", () => {
    const storage = new MemoryAppearanceStorage();
    storage.setItem(APPEARANCE_STORAGE_KEY, "sepia");
    const controller = createAppearanceController({
      storage,
      mediaQuery: new FakeAppearanceMediaQuery(false)
    });

    expect(controller.preference.value).toBe("system");
    expect(controller.resolvedAppearance.value).toBe("light");

    controller.dispose();
  });
});
