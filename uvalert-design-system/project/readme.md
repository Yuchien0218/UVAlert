# UVAlert 防曬晴報員 — Design System

A design system extracted from **UVAlert / 防曬晴報員**: a Traditional-Chinese, Taiwan-focused, offline-first PWA whose core job is a sunscreen re-application countdown, with a five-day regional UV forecast and an edited sun-care education section.

**Synced from the 2026-08 redesign.** The authority is now the repo's root `DESIGN.md` (v alpha, 2026-08-22), which supersedes the old `DESIGN_SYSTEM.md`. Note DESIGN.md's own §10: its colours and fonts are the *target* direction and `packages/ui/src/styles.css` still ships the old neutral-grey demo palette. **This design system implements the target direction**, since that is the agreed design language — expect the running app to look older than these cards until the tokens land in code.

## Source

- Repository: <https://github.com/Yuchien0218/UVAlert> (branch `main`)
- Design authority: `DESIGN.md`
- Icon system: `docs/design/icon-system/README.md` (+ 50 SVGs, all imported here)
- Logo: `docs/design/logo-concepts/README.md` (concept 06 播報印記, adopted 2026-08-18)
- Direction & structure: `docs/design/current-direction.md`, `docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`
- Code truth: `packages/ui/src/styles.css`, `apps/web/src/assets/app.css`

Explore those repositories further before building anything substantial — `DESIGN.md` explains *why* every rule exists and keeps an honest list of gaps (§13) you should confirm rather than invent around.

## Brand essence

The voice is a **sunscreen weather broadcaster** — someone who knows the science and reports it in everyday language. Not a medical warning tool, not a cute reminder toy. Two halves: a *sun-care weather butler* (sourced data, timestamps, risk levels) and a *sun-care lifestyle desk* (education content with editorial rhythm).

**Tone.** Practical, sourced, never anxiety-inducing. Conclusion first, conditions second; risk always comes with a next step. When the countdown expires it says 「該補擦了」, never 「你的皮膚正在受損」. Warmth is allowed; cuteness is not — sun protection is a health behaviour, not a game achievement.

**Copy examples**
- 「通知未開啟，倒數仍會在這台裝置繼續。」— states the fact, then the reassurance.
- 「這是地區預報，不是即時測站觀測；UV 高低不會延長或縮短你的補擦計時。」— pre-empts the wrong inference.
- 「防曬提醒是協助你回看紀錄的工具，不是安全曝曬時間或防護效果保證。」— the standing safety note.
- 「標示尚未確認」— names the uncertainty instead of hiding the item.

Traditional Chinese throughout (`lang="zh-Hant-TW"`), full-width punctuation, no emoji, no exclamation marks, sentence-style headings. Short Latin words appear inside CJK sentences (UVI、SPF、PWA) and stay unbroken from their numbers: `UV&nbsp;6`.

## Visual foundations

**Colour.** A warm ivory canvas (`#FAF5EC`) with espresso ink (`#2E2925`) — warmer than white, calmer than sunlight yellow. Personality comes from ivory + apricot + mauve. Roughly 60% ivory floor, 20% cream cards, 12% espresso panel, 6% deep-apricot action colour, 2% status and risk colour. Saturated sunlight yellow is deliberately avoided as the cliché of the category; green is never used to imply "safe" or "protected".

**Surfaces & depth.** Three modes alternate: warm ivory floor → cream cards (gear, more, education) → one espresso dark panel (the countdown). Depth is colour-first: flat blocks, 1px hairline borders that read as one step of elevation, and essentially no shadows (only a bottom sheet gets `0 1px 3px rgba(20,20,19,0.08)`). No gradients, no textures, no glass.

**Type.** Display is **LXGW WenKai TC (霞鶩文楷 TC)** at weight 400 with negative tracking — display sizes only. All UI, titles and body copy stay **Noto Sans TC** (with Inter for Latin). Headings are never bolded — if something needs emphasis, go up a display size, never switch face. Data readouts use a mono face with `tabular-nums` at weight 600: the mono is an instrument voice for real numbers, never a decorative techy label. CJK body copy runs at line-height 1.75, max-width 38em, `text-wrap: pretty`, `line-break: strict`.

**Shape.** Radii 4 / 8 / 14 (buttons, inputs) / 20 (cards) / pill (badges). 4px spacing base, tighter than a marketing site so countdown + status + next step fit one mobile screen. 752px reading column, 44px minimum tap targets, 16px mobile / 24px desktop gutters.

**Motion.** Opacity only — no translate, no scale, no bounce. `page-stack` children fade in 0.08s apart, capped at 0.4s. 160ms fast / 240ms base, `cubic-bezier(0.22, 1, 0.36, 1)`. Full `prefers-reduced-motion` support.

**States.** The system defines default, pressed/active, selected and disabled — **hover is deliberately undefined**; don't add one. Pressed primary darkens to `#804536`; selected context options change fill *and* border; focus is a 2px apricot ring (inputs get a 3px 15%-alpha ring). Status is always carried by colour **plus** icon **plus** text, and the state icons encode meaning as capsule count so they survive greyscale.

**Imagery.** Abstract geometric diagrams and simple apricot-on-ivory line illustrations, real product screenshots, and user-uploaded gear photos — that's all. Never stock or AI-generated people, never realistic skin lesions, never medical warning visuals, never cartoon suns or mascots, never decorative fake dashboards.

## Iconography

One source only: the product's **own** 24×24 icon set, whose shape DNA comes from the logo — a solid dot plus capsule strokes, stroke-width 2.5, round caps, ~2px optical padding, no dashes, no gradients, no sharp corners. All 50 SVGs are in `assets/icons/` (imported from `docs/design/icon-system/icons/`), grouped `nav-*` (3), `state-*` (11), `gear-*` (6), `context-*` (4), `event-*` (4), `education-*` (6), `more-*` (6), `tool-*` (10). Sizes: 16 / 20 / 24 only.

Two colour regimes: **two-tone** families (nav, gear, context, event, education, more) use ink coffee `#33291F` structure with an amber-gold `#C1832E` accent in the upper half; **mono** `state-*` icons are pure `currentColor` so they inherit whatever semantic colour they sit in. UV levels get no icon at all — the number plus the Chinese level is the information. No emoji, no Unicode glyphs-as-icons, and **no third-party icon library**: the repo is still migrating ~20 components off `@lucide/vue`, and this system contains no Lucide.

The logo is concept 06 播報印記 (`assets/logo/`): mark, lockup, filled, outlined and dark-surface variants, plus the shipped PWA rasters. The icon/logo palette (ink coffee `--icon-ink`, amber gold `--icon-amber`) is a **separate scope** from the UI palette — never substitute one for the other, and never reach for `--color-accent-amber` to colour a glyph.

## Components

**components/brand/** — `BrandMark`, `BrandHeader`, `Icon`
**components/core/** — `Button`, `TextLink`, `TextInput`, `AppCard`, `PageHeading`, `StatFigure`, `BadgePill`, `SafetyNote`
**components/navigation/** — `BottomNav` (提醒 / 裝備 / 更多, fixed)
**components/feedback/** — `GlobalStatusBanner`
**components/reminder/** — `CountdownPanel`, `StatusCard`, `ZoneStatusRow`
**components/uv/** — `UviBadge`, `FiveDayUvCard`
**components/gear/** — `GearListItem`
**components/more/** — `MoreEntryCard`
**components/education/** — `EducationHeroCard`, `EducationCategoryCard`, `EducationSourceBlock`
**components/setup/** — `SetupStepShell`, `ContextOption`, `BottomSheet`

Each has a `.d.ts` props contract and a `.prompt.md` with usage rules. Shared classes (`.page-stack`, `.app-card`, `.status-card--*`, `.uvi-badge--*`, `.button--*`, `.stat-figure`, `.safety-note`, type roles) live in `tokens/patterns.css` so hand-written markup matches the components.

**Intentional addition:** `Icon` and `BrandMark` are thin asset wrappers, not new design objects — `DESIGN.md` specifies inline SVG from the custom set, and these load exactly those files.

## Index

- `styles.css` — the single entry point consumers link (imports only)
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `motion.css`, `base.css`, `patterns.css`
- `components/` — the component library (see above)
- `guidelines/` — specimen cards: colours (brand, surfaces, text, status, UV, logo scope), type (display, titles, labels, readout), spacing, radii, elevation, layout, icons, logo
- `assets/` — `icons/` (50 SVGs), `logo/` (official horizontal lockup + 5 mark variants), PWA rasters, `manifest.webmanifest`
- `thumbnail.html` — homepage tile · `SKILL.md` — Agent Skills wrapper · `github.md` — upstream sync record

## Fonts (substitution flagged)

The repo ships no webfont binaries. This system loads **LXGW WenKai TC, Inter, Noto Sans TC and Noto Sans Mono** from Google Fonts (weights 400/500/600, `display=swap`). Two notes from DESIGN.md §3: readout mono only ever renders bare numerals (Chinese units sit in adjacent elements in the body font), so no CJK mono is needed; and the 防曬晴報員 wordmark is a deliberate exception — **GenSenRounded TW (月版) Medium**, shipped as outlined paths inside the lockup SVG, never used for headings or body. Upstream self-hosts subset `.woff2` files (748 KB total) and renders CJK body in the system gothic; **upload real `.woff2` files if you want exact parity.**

## Known gaps (from DESIGN.md §13 — confirm, don't invent)

Focus rings are only specified for inputs; disabled states only for the primary button; form-error visuals, the seven-zone education diagram and `/reminder/reapply`'s final form are all undefined. **Now defined here (not upstream):** the espresso surface's secondary text, hairline and status colours (`--color-hairline-on-dark`, `--color-status-*-on-dark`) — see the "On the espresso surface" card. The horizontal lockup has no dark-surface (reversed) version yet — the ink wordmark is near-invisible on the espresso panel; use the mark alone there. The gear share-image layout is now defined in `templates/gear-share/` (1080×1350). Hi-fi starting screens now exist in `templates/app-screens/` (提醒主頁進行中 / 裝備清單 / 設定步驟 1); `templates/wireframes/` holds the black-and-white set.
