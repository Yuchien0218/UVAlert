import React from "react";

/**
 * The standing disclaimer line at the bottom of a screen. Caption size, dimmed,
 * no left border, no box.
 */
export function SafetyNote({ children, style, ...rest }) {
  return (
    <p className="safety-note" style={style} {...rest}>
      {children}
    </p>
  );
}
