import React from "react";

const ICON_BASE_DEFAULT = "assets/icons";

/**
 * The custom icon set (DESIGN.md §8). No third-party icon library: every glyph
 * comes from docs/design/icon-system, whose shape DNA is the 06 broadcast mark —
 * solid dot + capsule strokes, 24×24, stroke-width 2.5, round caps.
 * The SVG is fetched and inlined so `currentColor` and the amber accent resolve.
 */
export function Icon({ name, size = 24, basePath, className, style, title, accent }) {
  const base =
    basePath || (typeof window !== "undefined" && window.UVALERT_ICON_BASE) || ICON_BASE_DEFAULT;
  const [raw, setRaw] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    fetch(`${base}/${name}.svg`)
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        if (!alive) return;
        setRaw(
          text
            .replace(/<svg([^>]*)>/, '<svg$1 width="100%" height="100%">')
            .replace(/<title>[\s\S]*?<\/title>/, "")
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [base, name]);
  // Two-tone glyphs (data-tone="two") carry a fixed #C1832E accent fill for their
  // secondary shape; `accent` swaps just that fill (e.g. for an active nav state)
  // while the outer currentColor stroke stays put.
  const markup = raw && accent ? raw.replaceAll("#C1832E", accent) : raw;
  return (
    <span
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: "inline-block", width: size, height: size, flex: "0 0 auto", lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={markup ? { __html: markup } : undefined}
    />
  );
}
