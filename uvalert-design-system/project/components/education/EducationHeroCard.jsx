import React from "react";
import { Icon } from "../brand/Icon.jsx";

/**
 * The one enlarged card on the education home ("先從這裡開始"). Strongest warm
 * light surface, serif display-sm title. The icon leads at 72px above the text.
 */
export function EducationHeroCard({ eyebrow = "先從這裡開始", title, body, icon = "education-uv-basics", iconSize = 72, action, iconBase, style }) {
  return (
    <section
      style={{
        display: "grid",
        gap: "var(--space-sm)",
        padding: "var(--space-xl)",
        borderRadius: "var(--radius-lg)",
        background: "var(--color-surface-cream-strong)",
        color: "var(--color-ink)",
        ...style
      }}
    >
      <Icon name={icon} size={iconSize} basePath={iconBase} />
      <p className="caption" style={{ color: "var(--color-body-strong)" }}>{eyebrow}</p>
      <h2 className="display-sm">{title}</h2>
      {body ? <p className="body-md prose" style={{ color: "var(--color-body-strong)" }}>{body}</p> : null}
      {action}
    </section>
  );
}
