import {
  nextTick,
  onBeforeUnmount,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref
} from "vue";

interface UseOverlayOptions {
  open: MaybeRefOrGetter<boolean>;
  container: Readonly<Ref<HTMLElement | null>>;
  initialFocus?: Readonly<Ref<HTMLElement | null>>;
  onClose: () => void;
}

interface OverlayEntry {
  id: symbol;
  root: HTMLElement;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

const activeOverlayIds = new Set<symbol>();
const overlayStack: OverlayEntry[] = [];
const inertSnapshots = new Map<HTMLElement, boolean>();
let bodyOverflowBeforeLock = "";

export function useOverlay(options: UseOverlayOptions): {
  closeFromBackdrop: () => void;
} {
  const id = Symbol("overlay");
  let returnFocusTarget: HTMLElement | null = null;
  let activation = 0;

  function isTopmost(): boolean {
    return overlayStack.at(-1)?.id === id;
  }

  function requestClose(): void {
    if (isTopmost()) options.onClose();
  }

  function handleDocumentKeydown(event: KeyboardEvent): void {
    if (!isTopmost()) return;

    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
      return;
    }

    if (event.key !== "Tab") return;
    trapFocus(event, options.container.value);
  }

  async function activate(): Promise<void> {
    const currentActivation = ++activation;
    returnFocusTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    activeOverlayIds.add(id);
    lockPageScroll();
    document.addEventListener("keydown", handleDocumentKeydown);

    await nextTick();
    if (currentActivation !== activation || !toValue(options.open)) return;

    const container = options.container.value;
    if (container === null) return;
    const root =
      container.closest<HTMLElement>("[data-overlay-root]") ?? container;
    overlayStack.push({ id, root });
    updateBackgroundInertness();

    const initialTarget =
      options.initialFocus?.value ?? getFocusableElements(container)[0];
    (initialTarget ?? container).focus();
  }

  async function deactivate(restoreFocus = true): Promise<void> {
    activation += 1;
    if (!activeOverlayIds.has(id)) return;
    document.removeEventListener("keydown", handleDocumentKeydown);
    const entryIndex = overlayStack.findIndex((entry) => entry.id === id);
    if (entryIndex !== -1) overlayStack.splice(entryIndex, 1);
    activeOverlayIds.delete(id);
    unlockPageScroll();
    updateBackgroundInertness();

    if (restoreFocus) await nextTick();
    if (restoreFocus) returnFocusTarget?.focus();
    returnFocusTarget = null;
  }

  watch(
    () => toValue(options.open),
    (open) => {
      if (open) {
        void activate();
      } else {
        void deactivate();
      }
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    const target = returnFocusTarget;
    void deactivate(false);
    target?.focus();
  });

  return { closeFromBackdrop: requestClose };
}

function trapFocus(event: KeyboardEvent, container: HTMLElement | null): void {
  if (container === null) return;
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }

  const first = focusable[0]!;
  const last = focusable.at(-1)!;
  const active = document.activeElement;
  const movingBeforeFirst = event.shiftKey && active === first;
  const movingAfterLast = !event.shiftKey && active === last;
  const focusOutside = !(active instanceof Node) || !container.contains(active);

  if (!movingBeforeFirst && !movingAfterLast && !focusOutside) return;
  event.preventDefault();
  (event.shiftKey ? last : first).focus();
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelector)
  ).filter(
    (element) =>
      !element.hidden && element.getAttribute("aria-hidden") !== "true"
  );
}

function lockPageScroll(): void {
  if (activeOverlayIds.size !== 1) return;
  bodyOverflowBeforeLock = document.body.style.overflow;
  document.body.style.overflow = "hidden";
}

function unlockPageScroll(): void {
  if (activeOverlayIds.size !== 0) return;
  document.body.style.overflow = bodyOverflowBeforeLock;
  bodyOverflowBeforeLock = "";
}

function updateBackgroundInertness(): void {
  const activeRoot = overlayStack.at(-1)?.root ?? null;

  if (activeRoot === null) {
    for (const [element, wasInert] of inertSnapshots) {
      element.toggleAttribute("inert", wasInert);
    }
    inertSnapshots.clear();
    return;
  }

  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (!inertSnapshots.has(child)) {
      inertSnapshots.set(child, child.hasAttribute("inert"));
    }
    const containsActiveRoot =
      child === activeRoot || child.contains(activeRoot);
    child.toggleAttribute("inert", !containsActiveRoot);
  }
}
