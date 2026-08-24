import React from "react";
import { BrandMark } from "./BrandMark.jsx";


/**
 * Top brand bar: the broadcast-mark lockup on warm ivory, over a hairline rule.
 * Not navigation — navigation lives in the bottom nav.
 */
export function BrandHeader({ logoBase = "assets/logo", trailing, style }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-md)",
        minHeight: 64,
        padding: "0 var(--page-gutter-mobile)",
        background: "var(--color-canvas)",
        color: "var(--color-ink)",
        borderBottom: "1px solid var(--color-hairline-soft)",
        ...style
      }}
    >
      <BrandMark variant="lockup" size={44} basePath={logoBase} />
      {trailing ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>{trailing}</div>
      ) : null}
    </header>
  );
}
