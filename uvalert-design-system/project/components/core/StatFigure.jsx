import React from "react";

/**
 * Instrument readout: mono, tabular-nums, weight 600, -0.02em. Real data only —
 * countdown minutes, UV index, timestamps, SPF values.
 */
export function StatFigure({ children, variant = "default", as = "span", className = "", style, ...rest }) {
  const Tag = as;
  const variantClass =
    variant === "display" ? " stat-figure--display" : variant === "inline" ? " stat-figure--inline" : "";
  return (
    <Tag className={`stat-figure${variantClass} ${className}`.trim()} style={style} {...rest}>
      {children}
    </Tag>
  );
}
