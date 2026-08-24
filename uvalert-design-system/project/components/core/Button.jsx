import React from "react";

/**
 * The system's button (DESIGN.md §5). Radius-md, min-height 44px, 14px/500 label.
 * Only default and pressed/disabled states exist — hover is deliberately undefined.
 * One primary CTA per screen.
 */
export function Button({
  variant = "primary",
  as = "button",
  fullWidth = false,
  children,
  className = "",
  style,
  ...rest
}) {
  const Tag = as;
  return (
    <Tag
      className={`button button--${variant} ${className}`.trim()}
      style={{ ...(fullWidth ? { width: "100%" } : null), ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
