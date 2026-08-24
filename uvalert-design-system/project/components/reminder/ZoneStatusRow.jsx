import React from "react";
import { Icon } from "../brand/Icon.jsx";
import { StatFigure } from "../core/StatFigure.jsx";

const STATE_ICON = {
  tracking: "state-tracking",
  soon: "state-soon",
  due: "state-due",
  untimed: "state-untimed"
};
const STATE_COLOR = {
  tracking: "var(--color-status-tracking)",
  soon: "var(--color-status-soon)",
  due: "var(--color-status-due)",
  untimed: "var(--color-status-untimed)"
};

/**
 * One tracked body zone: name, state icon (capsule-count meter), remaining time.
 * Transparent background, hairline-soft divider. 16 zones are text labels plus
 * state icons — never body-part illustrations.
 */
export function ZoneStatusRow({ zone, tone = "tracking", stateLabel, remaining, iconBase, style, ...rest }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto minmax(0,1fr) auto",
        alignItems: "center",
        gap: "var(--space-sm)",
        padding: "12px 0",
        borderBottom: "1px solid var(--color-hairline-soft)",
        background: "transparent",
        ...style
      }}
      {...rest}
    >
      <span style={{ color: STATE_COLOR[tone], display: "inline-flex" }}>
        <Icon name={STATE_ICON[tone]} size={20} basePath={iconBase} />
      </span>
      <span style={{ color: "var(--color-ink)", fontSize: "var(--font-size-body-md)" }}>
        {zone}
        {stateLabel ? (
          <span style={{ color: "var(--color-muted)", fontSize: "var(--font-size-body-sm)" }}>・{stateLabel}</span>
        ) : null}
      </span>
      {remaining ? <StatFigure>{remaining}</StatFigure> : null}
    </div>
  );
}
