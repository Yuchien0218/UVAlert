import React from "react";
import { Icon } from "../brand/Icon.jsx";

/** One of the five ordinary education category cards. Cream surface, 18px/500 title.
 *  The icon leads: a 44px mark on its own line above the title. */
export function EducationCategoryCard({ icon = "education-reapply", title, summary, count, iconSize = 44, iconBase, as = "a", style, ...rest }) {
  const Tag = as;
  return (
    <Tag
      className="surface-card"
      style={{
        display: "grid",
        gap: "var(--space-xs)",
        padding: "var(--space-lg)",
        border: 0,
        textDecoration: "none",
        color: "var(--color-ink)",
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
        ...style
      }}
      {...rest}
    >
      <Icon name={icon} size={iconSize} basePath={iconBase} style={{ marginBottom: "var(--space-xxs)" }} />
      <h3 className="title-md">{title}</h3>
      {summary ? <p className="body-sm" style={{ color: "var(--color-muted)" }}>{summary}</p> : null}
      {count !== undefined ? <p className="caption">{count} 篇</p> : null}
    </Tag>
  );
}
