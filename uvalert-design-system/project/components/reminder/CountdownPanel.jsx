import React from "react";
import { StatFigure } from "../core/StatFigure.jsx";

const BAR_TONE = {
  tracking: "var(--color-status-tracking)",
  soon: "var(--color-status-soon)",
  due: "var(--color-status-due)",
  untimed: "var(--color-hairline)"
};

/**
 * The product's core surface: the countdown to the next reapplication.
 * Light by design — it sits on the page canvas with a hairline rule, a large
 * numeral, and a slim linear progress bar (per the wireframes). No ring, no
 * dark panel: emphasis comes from the size of the number, not from a heavy
 * colour field. Tone colours the bar only, always beside an explicit label.
 */
export function CountdownPanel({
  tone = "tracking",
  label = "追蹤中",
  minutes,
  unit = "分鐘",
  progress = 0.6,
  caption,
  action,
  style
}) {
  const pct = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  return (
    <section style={{ display: "grid", gap: "var(--space-md)", ...style }}>
      <div style={{ display: "grid", gap: "var(--space-xxs)" }}>
        <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "var(--font-size-body-sm)" }}>{label}</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-xs)" }}>
          <StatFigure variant="display" style={{ color: "var(--color-ink)" }}>
            {minutes}
          </StatFigure>
          <span
            style={{
              color: "var(--color-body)",
              fontSize: "var(--font-size-body)",
              paddingBottom: "0.35em"
            }}
          >
            {unit}
          </span>
        </div>
      </div>
      {caption ? (
        <p style={{ margin: 0, color: "var(--color-body-strong)", fontSize: "var(--font-size-body)", lineHeight: 1.7 }}>
          {caption}
        </p>
      ) : null}
      <div
        role="presentation"
        style={{
          height: 8,
          borderRadius: "var(--radius-pill)",
          background: "var(--color-surface-card)",
          overflow: "hidden"
        }}
      >
        <div style={{ width: pct, height: "100%", background: BAR_TONE[tone] }} />
      </div>
      {action}
    </section>
  );
}
