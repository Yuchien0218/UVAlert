/** Inline text action, tracking blue, weight 500. */
export interface TextLinkProps {
  as?: "a" | "button";
  href?: string;
  onClick?: (event: React.MouseEvent) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
export declare function TextLink(props: TextLinkProps): JSX.Element;
