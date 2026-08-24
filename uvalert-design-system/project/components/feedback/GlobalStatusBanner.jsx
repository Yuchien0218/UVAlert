import React from "react";
import { Icon } from "../brand/Icon.jsx";

const ICONS = {
  offline: "state-offline",
  online: "state-online",
  "notification-off": "state-notification-off",
  "notification-pending": "state-notification-pending",
  warning: "state-warning"
};

/**
 * Cross-page system status (notifications off, background sync pending, offline,
 * back online). Soft surface, never an error fill — these states never block the
 * local countdown or manual actions, so the styling stays informational.
 */
export function GlobalStatusBanner({ kind = "offline", children, action, iconBase, style }) {
  return (
    <div
      role="status"
      className="surface-soft"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        padding: "12px 16px",
        color: "var(--color-body)",
        fontSize: "var(--font-size-body-sm)",
        ...style
      }}
    >
      <Icon name={ICONS[kind] || ICONS.warning} size={20} basePath={iconBase} />
      <span style={{ flex: 1 }}>{children}</span>
      {action}
    </div>
  );
}
