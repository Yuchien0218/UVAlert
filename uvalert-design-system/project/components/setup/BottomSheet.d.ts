/** In-flow bottom sheet for detail adjustments. */
export interface BottomSheetProps {
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
  iconBase?: string;
  style?: React.CSSProperties;
}
export declare function BottomSheet(props: BottomSheetProps): JSX.Element;
