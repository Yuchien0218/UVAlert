# Reminder UV-First Layout Design

## Goal

Keep today's UV as the first content on the reminder page while making location, navigation, and the start action clearer with less repeated information.

## Approved layout

- Keep `HomeUvHeadline` before the start-reminder action when no session is active.
- Keep the existing UV advice copy unchanged.
- Show the current region in the UV headline header, aligned opposite `今日 UV`; the region remains a link to `/region`.
- When a region and forecast are available, replace the global header's duplicated region/risk text with `五日 UV 預報`, linking to `/forecast`.
- When no region or forecast is available, keep the existing `今日全臺UV分布` link.
- Add the existing `nav-reminder` hourglass icon at 20px before `開始防曬提醒`.
- Do not add a visible page title, new card, empty-state paragraph, or additional explanatory copy.
- Keep the safety statement and existing UV risk advice verbatim.

## Component boundaries

- `BrandHeader.vue`: chooses the global header navigation label and destination.
- `HomeUvHeadline.vue`: receives an optional region name and renders the region link beside its eyebrow.
- `HomePage.vue`: passes the region name and renders the hourglass inside the no-session CTA.
- Existing services, forecast selection, session behavior, and routing remain unchanged.

## Spacing

Use existing spacing tokens only. Tighten the no-session relationship through component-local spacing without changing active-session information order or adding arbitrary values.

## Verification

- Component tests cover header label/destination, region placement/destination, unchanged advice, and CTA icon.
- Verify the focused tests fail before implementation and pass afterward.
- Run the complete project check.
- Inspect the no-session page at 375px with and without region data.
