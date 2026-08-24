import React from "react";
import { Icon } from "../brand/Icon.jsx";

/**
 * Context choice. Selected state changes BOTH the fill (surface-card) and the
 * border (primary) — never colour alone.
 */
export function ContextOption({ icon = "context-outdoor", label, description, selected = false, iconBase, style, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      style={{
        display: "grid",
        gridTemplateColumns: "auto minmax(0,1fr)",
        alignItems: "center",
        gap: "var(--space-sm)",
        width: "100%",
        minHeight: 64,
        padding: "var(--space-md)",
        border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-hairline)"}`,
        borderRadius: "var(--radius-md)",
        background: selected ? "var(--color-surface-card)" : "var(--color-canvas)",
        color: "var(--color-ink)",
        textAlign: "left",
        font: "inherit",
        cursor: "pointer",
        ...style
      }}
      {...rest}
    >
      <Icon name={icon} size={24} basePath={iconBase} />
      <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
        <span className="title-sm">{label}</span>
        {description ? <span className="body-sm" style={{ color: "var(--color-muted)" }}>{description}</span> : null}
      </span>
    </button>
  );
}
