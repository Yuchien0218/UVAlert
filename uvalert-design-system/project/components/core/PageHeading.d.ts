/** Page heading: optional eyebrow + serif 36px title + optional body. */
export interface PageHeadingProps {
  /** 13px/500 muted. Only if it adds information the title lacks. */
  eyebrow?: string;
  title: string;
  /** 16px body, max-width 38rem. */
  body?: string;
  style?: React.CSSProperties;
}
export declare function PageHeading(props: PageHeadingProps): JSX.Element;
