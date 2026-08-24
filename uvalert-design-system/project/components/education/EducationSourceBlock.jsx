import React from "react";

/**
 * Sources and review info at the foot of an education article. Soft surface,
 * muted body-sm. Sources are never hidden behind an interaction — verifiability
 * is the basis of health content.
 */
export function EducationSourceBlock({ title = "資料來源與審閱", reviewedBy, reviewedAt, sources = [], style }) {
  return (
    <section className="surface-soft" style={{ display: "grid", gap: "var(--space-xs)", ...style }}>
      <p className="caption" style={{ color: "var(--color-body-strong)" }}>{title}</p>
      {sources.length ? (
        <ul style={{ display: "grid", gap: "var(--space-xxs)", margin: 0, paddingLeft: "1.1em", color: "var(--color-muted)", fontSize: "var(--font-size-body-sm)", lineHeight: 1.7 }}>
          {sources.map((source) => (
            <li key={source.label}>
              {source.href ? (
                <a href={source.href} style={{ color: "var(--color-primary)" }}>{source.label}</a>
              ) : (
                source.label
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {(reviewedBy || reviewedAt) ? (
        <p className="body-sm" style={{ color: "var(--color-muted)" }}>
          {reviewedBy}
          {reviewedBy && reviewedAt ? "・" : ""}
          {reviewedAt}
        </p>
      ) : null}
    </section>
  );
}
