import React from "react";
import { Icon } from "../brand/Icon.jsx";

const STATE_ICON = {
  tracking: "state-tracking",
  soon: "state-soon",
  due: "state-due",
  untimed: "state-untimed",
  saved: "state-success"
};

/**
 * Soft-filled status card (12% status colour over canvas) — same visual weight
 * across all five variants. No left bar, no shadow. "saved" is mauve, never green.
 */
export function StatusCard({ tone = "tracking", label, children, iconBase, style, ...rest }) {
  return (
    <div className={`status-card status-card--${tone}`} style={{ display: "grid", gap: "var(--space-xs)", ...style }} {...rest}>
      <p className="status-card__label" style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", margin: 0 }}>
        <Icon name={STATE_ICON[tone]} size={20} basePath={iconBase} />
        {label}
      </p>
      {children ? <div className="body-sm">{children}</div> : null}
    </div>
  );
}
