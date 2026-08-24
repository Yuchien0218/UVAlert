import React from "react";

/**
 * The 06 broadcast mark: an amber sun dot with three fanned capsule "bulletin"
 * lines. `variant="lockup"` adds the 防曬晴報員 wordmark (GenSenRounded TW Medium,
 * outlined — the official horizontal lockup, 243×84).
 * Use the dark-surface file on espresso panels so the ink strokes stay visible.
 */
export function BrandMark({
  variant = "mark",
  size = 40,
  basePath = "assets/logo",
  style,
  className
}) {
  const file =
    variant === "lockup"
      ? "lockup-horizontal.svg"
      : variant === "dark"
        ? "broadcast-mark-dark-surface.svg"
        : "broadcast-mark.svg";
  const isLockup = variant === "lockup";
  return (
    <img
      src={`${basePath}/${file}`}
      alt="防曬晴報員 UVAlert"
      className={className}
      style={{ height: size, width: isLockup ? "auto" : size, display: "block", ...style }}
    />
  );
}
