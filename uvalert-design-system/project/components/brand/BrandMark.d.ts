/** The 06 broadcast mark — the product's only logo. */
export interface BrandMarkProps {
  /** "mark" glyph only · "lockup" glyph + wordmark · "dark" for espresso surfaces */
  variant?: "mark" | "lockup" | "dark";
  /** Rendered height in px. */
  size?: number;
  /** Path to the logo folder relative to the page. Default "assets/logo". */
  basePath?: string;
  className?: string;
  style?: React.CSSProperties;
}
export declare function BrandMark(props: BrandMarkProps): JSX.Element;
