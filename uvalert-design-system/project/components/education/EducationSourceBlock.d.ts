/** Article footer: sources + review status, always visible. */
export interface EducationSource {
  label: string;
  href?: string;
}
export interface EducationSourceBlockProps {
  /** Defaults to "資料來源與審閱". */
  title?: string;
  /** Reviewer name / role. */
  reviewedBy?: string;
  /** Review date, e.g. "2026-08-20 審閱". */
  reviewedAt?: string;
  sources?: EducationSource[];
  style?: React.CSSProperties;
}
export declare function EducationSourceBlock(props: EducationSourceBlockProps): JSX.Element;
