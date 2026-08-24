/**
 * The countdown to the next reapplication: large numeral plus a slim linear
 * progress bar on the page canvas. Light by design — no ring, no dark panel.
 */
export interface CountdownPanelProps {
  /** Drives the progress-bar colour. Always pair with an explicit `label`. */
  tone?: "tracking" | "soon" | "due" | "untimed";
  /** Chinese status label, e.g. "追蹤中" / "即將到期" / "該補擦了". */
  label?: string;
  /** The countdown readout (number or string). */
  minutes?: React.ReactNode;
  /** Unit under the figure. Default "分鐘". */
  unit?: string;
  /** 0–1 remaining fraction. */
  progress?: number;
  /** Secondary line, e.g. "預計 20:15 需要補擦". */
  caption?: string;
  /** The panel's CTA — the standard primary Button. */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function CountdownPanel(props: CountdownPanelProps): JSX.Element;
