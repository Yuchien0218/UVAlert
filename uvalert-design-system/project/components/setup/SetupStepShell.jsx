import React from "react";

/**
 * The frame for the two-step setup flow (1 情境, 2 塗抹時間與部位). The whole
 * flow happens inside this shell — product labels, zone adjustments and
 * notification prompts never navigate away to a parallel page.
 */
export function SetupStepShell({ step = 1, totalSteps = 2, title, description, children, actions, style }) {
  return (
    <section style={{ display: "grid", gap: "var(--space-xl)", background: "var(--color-canvas)", ...style }}>
      <div style={{ display: "grid", gap: "var(--space-xs)" }}>
        <p className="caption">
          步驟 {step} / {totalSteps}
        </p>
        <div style={{ display: "flex", gap: "var(--space-xxs)" }}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              style={{
                height: 3,
                flex: 1,
                borderRadius: "var(--radius-pill)",
                background: index < step ? "var(--color-primary)" : "var(--color-hairline)"
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gap: "var(--space-sm)" }}>
        <h1 className="display-sm">{title}</h1>
        {description ? <p className="body-md prose">{description}</p> : null}
      </div>
      <div style={{ display: "grid", gap: "var(--space-sm)" }}>{children}</div>
      {actions ? <div className="button-group" style={{ display: "grid" }}>{actions}</div> : null}
    </section>
  );
}
