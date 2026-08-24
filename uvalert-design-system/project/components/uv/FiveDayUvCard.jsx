import React from "react";
import { StatFigure } from "../core/StatFigure.jsx";
import { UviBadge } from "./UviBadge.jsx";

const RISK_COLOR = {
  low: "var(--color-uvi-low)",
  moderate: "var(--color-uvi-moderate)",
  high: "var(--color-uvi-high)",
  "very-high": "var(--color-uvi-very-high)",
  extreme: "var(--color-uvi-extreme)"
};

/**
 * Five-day regional forecast. Fixed 5-column grid at every breakpoint (type
 * shrinks instead of the column count). Card border takes today's risk colour.
 * Source, update time and the "regional forecast, not a live station" note are
 * part of the component, not optional decoration.
 */
export function FiveDayUvCard({ days = [], source, updatedAt, note = "這是地區預報，不是即時測站觀測；UV 高低不會延長或縮短你的補擦計時。", style }) {
  const todayRisk = days[0]?.level;
  return (
    <section
      className="app-card"
      style={{
        display: "grid",
        gap: "var(--space-md)",
        borderColor: todayRisk ? RISK_COLOR[todayRisk] : "var(--color-hairline)",
        ...style
      }}
    >
      <ol
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0,1fr))",
          gap: "var(--space-xs)",
          margin: 0,
          padding: 0,
          listStyle: "none"
        }}
      >
        {days.map((day) => (
          <li key={day.date} style={{ display: "grid", justifyItems: "center", gap: "var(--space-xs)", textAlign: "center", minWidth: 0 }}>
            <span className="caption">{day.date}</span>
            <StatFigure style={{ fontSize: 24 }}>{day.uvi}</StatFigure>
            <UviBadge level={day.level} style={{ padding: "2px 8px", fontSize: 11 }} />
          </li>
        ))}
      </ol>
      {(source || updatedAt) ? (
        <p className="caption" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xs)" }}>
          {source}
          {updatedAt ? (
            <span>
              更新 <StatFigure variant="inline">{updatedAt}</StatFigure>
            </span>
          ) : null}
        </p>
      ) : null}
      {note ? <p className="safety-note">{note}</p> : null}
    </section>
  );
}
