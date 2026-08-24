/** Labelled text field with hint / error slot. */
export interface TextInputProps {
  label?: string;
  /** Muted caption under the field. */
  hint?: string;
  /** Error message; also turns the border to --color-error. */
  error?: string;
  id?: string;
  as?: "input" | "select" | "textarea";
  type?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (event: React.ChangeEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}
export declare function TextInput(props: TextInputProps): JSX.Element;
