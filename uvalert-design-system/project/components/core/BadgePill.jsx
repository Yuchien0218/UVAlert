import React from "react";

/** Pill label. `variant="unverified"` marks incomplete product data without hiding it. */
export function BadgePill({ variant = "default", children, className = "", style, ...rest }) {
  return (
    <span
      className={`${variant === "unverified" ? "badge-unverified" : "badge-pill"} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </span>
  );
}
