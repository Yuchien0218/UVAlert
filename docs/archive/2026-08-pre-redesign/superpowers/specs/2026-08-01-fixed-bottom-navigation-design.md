# Fixed Bottom Navigation Design

## Goal

Keep the shared 「首頁｜提醒｜產品｜更多」 navigation visible at the bottom of the viewport while preventing the final page content from being covered on mobile devices.

## Existing Structure

- `App.vue` renders every route through `AppShell.vue`.
- `AppShell.vue` owns the single `BottomNavigation.vue` instance.
- Routes with `route.meta.hideNavigation === true` intentionally hide the navigation.
- Individual pages do not render or position their own bottom navigation.

## Selected Approach

Use viewport-fixed positioning and reserve matching space in the shared App Shell.

### Shared Tokens

Define a global `--bottom-nav-height` token for the navigation's content height. The iOS safe-area inset remains additive because its value varies by device:

```css
calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))
```

### Bottom Navigation

`BottomNavigation.vue` will:

- use `position: fixed` with `bottom: 0`, `left: 0`, and `right: 0`;
- use the same maximum width as the App Shell and remain horizontally centered;
- use an opaque surface background, top border, and explicit z-index;
- include `padding-bottom: env(safe-area-inset-bottom)`;
- keep the existing four routes and active-route presentation unchanged.

### App Shell Content Clearance

`AppShell.vue` will derive one layout state from `route.meta.hideNavigation`:

- when navigation is visible, the main content receives bottom padding equal to its existing footer spacing plus `--bottom-nav-height` and the safe-area inset;
- when navigation is hidden, no navigation-specific clearance is added;
- the fixed navigation is removed from normal grid flow, so the shell grid only allocates rows for header, status banner, and main content.

No route page will receive page-specific navigation padding.

## Component Boundaries

- `App.vue`: continues to mount the shared App Shell only.
- `AppShell.vue`: owns visibility and content-clearance policy.
- `BottomNavigation.vue`: owns navigation markup and fixed visual positioning.
- Route pages: remain unaware of bottom-navigation geometry.

No new component or composable is required because there is no new reactive state beyond the existing route metadata.

## Testing

Automated checks will verify:

1. the four navigation destinations remain unchanged;
2. the navigation CSS contract includes fixed positioning, safe-area padding, opaque background, and z-index;
3. the App Shell applies navigation clearance only when navigation is visible;
4. type checking, the complete test suite, and production build pass.

Manual responsive-browser verification will use a mobile viewport and confirm:

1. the navigation remains at the same viewport-bottom position before and after scrolling;
2. the final disclaimer or final content block remains fully visible above the navigation;
3. Home, Reminder, Products, and More all use the same fixed navigation;
4. a route with hidden navigation does not retain unnecessary bottom clearance.

## Non-goals

- No changes to navigation labels, routes, icons, or active-state behavior.
- No per-page sticky or fixed navigation implementations.
- No JavaScript scroll listeners or scroll-position state.
- No changes to reminder, persistence, contracts, or domain logic.
