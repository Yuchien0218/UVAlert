/** Frame for the two-step setup flow: progress, heading, content, action row. */
export interface SetupStepShellProps {
  step?: 1 | 2;
  /** The flow is two steps. Don't add a third. */
  totalSteps?: number;
  title: string;
  description?: string;
  children?: React.ReactNode;
  /** Bottom action row — one primary button plus at most one quiet one. */
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function SetupStepShell(props: SetupStepShellProps): JSX.Element;
