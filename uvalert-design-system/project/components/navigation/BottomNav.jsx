import React from "react";
import { Icon } from "../brand/Icon.jsx";

const ITEMS = [
  { id: "reminder", label: "提醒", icon: "nav-reminder" },
  { id: "gear", label: "裝備", icon: "nav-gear" },
  { id: "more", label: "更多", icon: "nav-more" }
];

/**
 * Fixed bottom navigation: exactly three destinations — 提醒 / 裝備 / 更多.
 * Sits on the page canvas (no bar fill) behind a hairline top rule. The active
 * destination is marked by a cream pill behind its icon plus a bold label —
 * shape carries the state, so no glyph recolouring and no top-edge indicator.
 * Icon colours (ink stroke + amber accent) are identical in every state.
 * No separate home or education entry.
 */
export function BottomNav({ active = "reminder", onSelect, iconBase, style }) {
  return (
    <nav
      aria-label="主要導覽"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        minHeight: "var(--bottom-nav-height)",
        background: "transparent",
        borderTop: "1px solid var(--color-hairline-soft)",
        ...style
      }}
    >
      {ITEMS.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={onSelect ? () => onSelect(item.id) : undefined}
            style={{
              display: "grid",
              justifyItems: "center",
              alignContent: "center",
              gap: "var(--space-xs)",
              border: 0,
              padding: "var(--space-sm) 0",
              background: "transparent",
              color: "var(--color-body-strong)",
              fontSize: "var(--font-size-nav-label)",
              fontWeight: isActive ? 700 : 400,
              lineHeight: 1.4,
              cursor: "pointer"
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 56,
                height: 32,
                borderRadius: "var(--radius-pill)",
                background: isActive ? "var(--color-surface-card)" : "transparent"
              }}
            >
              <Icon name={item.icon} size={24} basePath={iconBase} />
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
