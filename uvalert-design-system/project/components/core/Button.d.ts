/** The system's button. 44px min height, radius-md, deep-apricot primary. */
export interface ButtonProps {
  /**
   * "primary" deep apricot fill · "secondary" ink outline ·
   * "quiet" hairline outline (retry, dismiss) · "on-dark" for espresso surfaces
   */
  variant?: "primary" | "secondary" | "quiet" | "on-dark";
  as?: "button" | "a";
  fullWidth?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  href?: string;
  onClick?: (event: React.MouseEvent) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
