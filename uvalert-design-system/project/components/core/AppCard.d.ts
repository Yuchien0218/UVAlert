/** General content card on canvas: hairline border, radius-lg, 20px padding, no shadow. */
export interface AppCardProps {
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
export declare function AppCard(props: AppCardProps): JSX.Element;
