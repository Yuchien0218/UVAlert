import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shellSource = readFileSync(
  new URL("./AppShell.vue", import.meta.url),
  "utf8"
);
const tokenSource = readFileSync(
  new URL(
    "../../../../../packages/ui/src/styles.css",
    import.meta.url
  ),
  "utf8"
);

describe("AppShell fixed navigation layout", () => {
  it("以共用 token 為顯示導覽的頁面保留底部空間", () => {
    expect(tokenSource).toContain("--bottom-nav-height:");
    expect(shellSource).toContain("navigationVisible");
    expect(shellSource).toContain("app-shell--with-navigation");
    expect(shellSource).toContain("var(--bottom-nav-height)");
    expect(shellSource).toContain("env(safe-area-inset-bottom)");
    expect(shellSource).toContain(
      "route.meta.hideNavigation !== true"
    );
  });
});
