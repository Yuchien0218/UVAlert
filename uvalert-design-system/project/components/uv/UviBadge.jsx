import React from "react";
import { StatFigure } from "../core/StatFigure.jsx";

const LEVEL_LABEL = {
  low: "低量級",
  moderate: "中量級",
  high: "高量級",
  "very-high": "過量級",
  extreme: "危險級"
};

/** UV risk pill: 14% risk colour over canvas. Always shown with the index number. */
export function UviBadge({ level = "moderate", value, style, ...rest }) {
  return (
    <span className={`uvi-badge uvi-badge--${level}`} style={style} {...rest}>
      {LEVEL_LABEL[level]}
      {value !== undefined ? <StatFigure variant="inline" style={{ color: "inherit" }}>{value}</StatFigure> : null}
    </span>
  );
}
