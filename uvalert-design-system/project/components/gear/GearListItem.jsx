import React from "react";
import { Icon } from "../brand/Icon.jsx";

/**
 * Gear list item: warm cream card, category icon, name, summary, optional badge.
 * The whole card is tappable. Never styled like a shopping listing.
 */
export function GearListItem({
  category = "gear-sunscreen",
  name,
  summary,
  badge,
  iconBase,
  as = "button",
  style,
  ...rest
}) {
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
        minHeight: "var(--tap-target)",
        border: 0,
        textAlign: "left",
        font: "inherit",
        cursor: as === "button" ? "pointer" : undefined,
        ...style
      }}
      {...rest}
    >
      <Icon name={category} size={32} basePath={iconBase} />
      <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
        <span className="title-sm" style={{ color: "var(--color-ink)" }}>{name}</span>
        <span className="body-sm" style={{ color: "var(--color-muted)", minHeight: 20 }}>{summary}</span>
      </span>
      {badge}
    </Tag>
  );
}
