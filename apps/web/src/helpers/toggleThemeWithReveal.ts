/**
 * 主題切換過場：從觸發按鈕位置展開一個圓形，把新主題「揭露」出來，
 * 概念呼應日出/日落，而不是霧氣噪點紋理（跟 ICON_DESIGN_SYSTEM.md
 * 的「無紋理、非物理性」規則衝突，所以沒有做躁點版本）。
 *
 * 使用原生 View Transitions API，不需要額外動畫函式庫。
 * 不支援的瀏覽器（例如較舊的 Safari）會自動退回無動畫的即時切換，
 * 不會壞掉，只是沒有過場效果。
 */
export function toggleThemeWithReveal(
  nextTheme: "light" | "dark",
  triggerElement: HTMLElement
) {
  const applyTheme = () => {
    document.documentElement.dataset.theme = nextTheme;
  };

  // 不支援 View Transitions API 的瀏覽器，直接套用，不做動畫
  if (!document.startViewTransition) {
    applyTheme();
    return;
  }

  // 用觸發按鈕的位置當作圓心，算出展開到蓋滿整個畫面需要的半徑
  const rect = triggerElement.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const maxRadius = Math.hypot(
    Math.max(originX, window.innerWidth - originX),
    Math.max(originY, window.innerHeight - originY)
  );

  const transition = document.startViewTransition(applyTheme);

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${originX}px ${originY}px)`,
          `circle(${maxRadius}px at ${originX}px ${originY}px)`
        ]
      },
      {
        duration: 500,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)"
      }
    );
  });
}
