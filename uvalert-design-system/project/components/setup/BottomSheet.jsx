import React from "react";
import { Icon } from "../brand/Icon.jsx";

/**
 * Bottom sheet for in-flow detail edits (e.g. zone protection adjustment).
 * A sheet, not a new page — the flow must not break. The only element in the
 * system allowed a (very faint) shadow.
 */
export function BottomSheet({ title, children, actions, onClose, iconBase, style }) {
  return (
    <section
      role="dialog"
      aria-label={title}
      style={{
        display: "grid",
        gap: "var(--space-sm)",
        padding: "var(--space-xl)",
        borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        border: "1px solid var(--color-hairline)",
        borderBottom: "none",
        background: "var(--color-canvas)",
        color: "var(--color-ink)",
        boxShadow: "var(--shadow-float)",
        ...style
      }}
    >
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "var(--space-md)" }}>
        <h2 className="title-lg">{title}</h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            style={{ display: "grid", placeItems: "center", width: 44, height: 44, border: 0, background: "transparent", cursor: "pointer", color: "var(--color-muted)" }}
          >
            <Icon name="tool-close" size={24} basePath={iconBase} />
          </button>
        ) : null}
      </div>
      <div style={{ display: "grid", gap: "var(--space-xs)" }}>{children}</div>
      {actions ? <div className="button-group" style={{ display: "grid" }}>{actions}</div> : null}
    </section>
  );
}
