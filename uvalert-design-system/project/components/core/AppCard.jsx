import React from "react";

/** Warm-ivory content card: 1px hairline border, radius-lg, 20px padding, no shadow. */
export function AppCard({ as = "section", children, className = "", style, ...rest }) {
  const Tag = as;
  return (
    <Tag className={`app-card ${className}`.trim()} style={{ display: "grid", gap: "var(--space-md)", ...style }} {...rest}>
      {children}
    </Tag>
  );
}
