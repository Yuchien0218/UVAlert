/** Five-day regional UV forecast card. Fixed 5 columns; border = today's risk. */
export interface FiveDayUvForecastDay {
  /** Short date, e.g. "8/22". */
  date: string;
  uvi: number | string;
  level: "low" | "moderate" | "high" | "very-high" | "extreme";
}
export interface FiveDayUvCardProps {
  days?: FiveDayUvForecastDay[];
  /** Data source name, e.g. "中央氣象署・F-D0047-091". */
  source?: string;
  /** Update timestamp, rendered as a mono readout. */
  updatedAt?: string;
  /** Defaults to the standard regional-forecast disclaimer. */
  note?: string;
  style?: React.CSSProperties;
}
export declare function FiveDayUvCard(props: FiveDayUvCardProps): JSX.Element;
