/** The product's only navigation: three fixed destinations, 64px tall. */
export interface BottomNavProps {
  active?: "reminder" | "gear" | "more";
  onSelect?: (id: "reminder" | "gear" | "more") => void;
  /** Passed through to Icon (e.g. "../../assets/icons"). */
  iconBase?: string;
  style?: React.CSSProperties;
}
export declare function BottomNav(props: BottomNavProps): JSX.Element;
