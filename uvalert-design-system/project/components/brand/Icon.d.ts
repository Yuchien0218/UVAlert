/**
 * A glyph from the product's own icon set. No icon library is used anywhere.
 * Names are the file stems in assets/icons: nav-* (3), state-* (11), gear-* (6),
 * context-* (4), event-* (4), education-* (6), more-* (6), tool-* (10).
 */
export interface IconProps {
  /** e.g. "nav-reminder", "state-due", "gear-sunscreen", "tool-chevron-down". */
  name: string;
  /** 16 · 20 · 24 only — do not invent sizes. */
  size?: 16 | 20 | 24;
  /** Path to the icon folder relative to the page. Default "assets/icons". */
  basePath?: string;
  /** Overrides the two-tone glyph's fixed #C1832E accent fill (e.g. an active state). Leave unset to keep the icon-scope amber. */
  accent?: string;
  /** Accessible name. Omit for decorative use (then it is aria-hidden). */
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
