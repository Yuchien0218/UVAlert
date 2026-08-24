/** Education category card (five of them, in a two-column grid). */
export interface EducationCategoryCardProps {
  /** education-uv-basics · -before-going-out · -reapply · -sweat-and-water · -after-sun-care · -special-situations */
  icon?: string;
  title: string;
  summary?: string;
  /** Article count. */
  count?: number;
  iconBase?: string;
  /** Leading icon size in px. Defaults to 44 — the icon is the card's lead element. */
  iconSize?: number;
  as?: "a" | "button" | "div";
  href?: string;
  style?: React.CSSProperties;
}
export declare function EducationCategoryCard(props: EducationCategoryCardProps): JSX.Element;
