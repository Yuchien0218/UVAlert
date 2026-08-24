/** Informational cross-page status strip on soft surface. Never an error fill. */
export interface GlobalStatusBannerProps {
  kind?: "offline" | "online" | "notification-off" | "notification-pending" | "warning";
  /** The message. Plain sentence, no exclamation. */
  children?: React.ReactNode;
  /** Optional quiet action (e.g. a TextLink to 通知設定). */
  action?: React.ReactNode;
  iconBase?: string;
  style?: React.CSSProperties;
}
export declare function GlobalStatusBanner(props: GlobalStatusBannerProps): JSX.Element;
