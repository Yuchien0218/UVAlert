/** Selectable context card for setup step 1. */
export interface ContextOptionProps {
  /** context-outdoor · context-exercise · context-indoor · context-water */
  icon?: string;
  label: string;
  description?: string;
  selected?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  iconBase?: string;
  style?: React.CSSProperties;
}
export declare function ContextOption(props: ContextOptionProps): JSX.Element;
