/** Top brand bar on warm ivory. Carries the lockup; never navigation links. */
export interface BrandHeaderProps {
  /** Path to the logo folder relative to the page. */
  logoBase?: string;
  /** Optional right-side slot — a single quiet status or action, nothing more. */
  trailing?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function BrandHeader(props: BrandHeaderProps): JSX.Element;
