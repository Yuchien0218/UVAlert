/** The single enlarged card on the education home page. */
export interface EducationHeroCardProps {
  /** Defaults to "先從這裡開始". */
  eyebrow?: string;
  title: string;
  body?: string;
  /** An education-* icon name. */
  icon?: string;
  /** Leading icon size in px. Defaults to 72 — the icon leads the card. */
  iconSize?: number;
  action?: React.ReactNode;
  iconBase?: string;
  style?: React.CSSProperties;
}
export declare function EducationHeroCard(props: EducationHeroCardProps): JSX.Element;
