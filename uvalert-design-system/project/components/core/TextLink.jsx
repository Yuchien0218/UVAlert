import React from "react";

/** Inline text action in the tracking blue. Used for quiet or destructive-entry actions. */
export function TextLink({ as = "a", children, className = "", style, ...rest }) {
  const Tag = as;
  return (
    <Tag
      className={`text-link ${className}`.trim()}
      style={{
        ...(as === "button" ? { border: 0, background: "transparent", cursor: "pointer", padding: 0 } : null),
        ...style
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
