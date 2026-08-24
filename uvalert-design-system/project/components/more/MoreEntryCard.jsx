import React from "react";
import { Icon } from "../brand/Icon.jsx";

/**
 * Uniform entry card for the 更多 page. Every card shares the same size, icon
 * position, radius and text structure — grouping is done with light dividers or
 * small captions, never by making one card louder.
 */
export function MoreEntryCard({ icon = "more-about", title, status, iconBase, as = "button", style, ...rest }) {
  const Tag = as;
  return (
    <Tag
      className="surface-card"
      style={{
        display: "grid",
        gridTemplateColumns: "auto minmax(0,1fr) auto",
        alignItems: "center",
        gap: "var(--space-sm)",
        width: "100%",
        padding: "var(--space-lg)",
        border: 0,
        textAlign: "left",
        font: "inherit",
        cursor: as === "button" ? "pointer" : undefined,
        ...style
      }}
      {...rest}
    >
      <Icon name={icon} size={24} basePath={iconBase} />
      <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
        <span className="title-sm" style={{ color: "var(--color-ink)" }}>{title}</span>
        {status ? <span className="caption">{status}</span> : null}
      </span>
      <Icon name="tool-chevron-right" size={20} basePath={iconBase} />
    </Tag>
  );
}
