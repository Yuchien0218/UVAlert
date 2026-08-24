/** Mono tabular readout for real data. */
export interface StatFigureProps {
  /** "inline" inside a sentence · "display" clamp(40px,18vw,64px) for the countdown */
  variant?: "default" | "inline" | "display";
  as?: "span" | "strong" | "div";
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
export declare function StatFigure(props: StatFigureProps): JSX.Element;
