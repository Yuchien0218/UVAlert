/** A single tracked zone row: state icon + zone name + remaining readout. */
export interface ZoneStatusRowProps {
  /** Zone name, e.g. "臉部", "頸部", "手背". */
  zone: string;
  tone?: "tracking" | "soon" | "due" | "untimed";
  /** Chinese state label appended after the zone name. */
  stateLabel?: string;
  /** Remaining time, rendered as a mono readout (e.g. "28 分"). */
  remaining?: React.ReactNode;
  iconBase?: string;
  style?: React.CSSProperties;
}
export declare function ZoneStatusRow(props: ZoneStatusRowProps): JSX.Element;
