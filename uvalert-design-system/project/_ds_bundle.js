/* @ds-bundle: {"format":4,"namespace":"UVAlertDesignSystem_d2ab25","components":[{"name":"BrandHeader","sourcePath":"components/brand/BrandHeader.jsx"},{"name":"BrandMark","sourcePath":"components/brand/BrandMark.jsx"},{"name":"Icon","sourcePath":"components/brand/Icon.jsx"},{"name":"AppCard","sourcePath":"components/core/AppCard.jsx"},{"name":"BadgePill","sourcePath":"components/core/BadgePill.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"PageHeading","sourcePath":"components/core/PageHeading.jsx"},{"name":"SafetyNote","sourcePath":"components/core/SafetyNote.jsx"},{"name":"StatFigure","sourcePath":"components/core/StatFigure.jsx"},{"name":"TextInput","sourcePath":"components/core/TextInput.jsx"},{"name":"TextLink","sourcePath":"components/core/TextLink.jsx"},{"name":"EducationCategoryCard","sourcePath":"components/education/EducationCategoryCard.jsx"},{"name":"EducationHeroCard","sourcePath":"components/education/EducationHeroCard.jsx"},{"name":"EducationSourceBlock","sourcePath":"components/education/EducationSourceBlock.jsx"},{"name":"GlobalStatusBanner","sourcePath":"components/feedback/GlobalStatusBanner.jsx"},{"name":"GearListItem","sourcePath":"components/gear/GearListItem.jsx"},{"name":"MoreEntryCard","sourcePath":"components/more/MoreEntryCard.jsx"},{"name":"BottomNav","sourcePath":"components/navigation/BottomNav.jsx"},{"name":"CountdownPanel","sourcePath":"components/reminder/CountdownPanel.jsx"},{"name":"StatusCard","sourcePath":"components/reminder/StatusCard.jsx"},{"name":"ZoneStatusRow","sourcePath":"components/reminder/ZoneStatusRow.jsx"},{"name":"BottomSheet","sourcePath":"components/setup/BottomSheet.jsx"},{"name":"ContextOption","sourcePath":"components/setup/ContextOption.jsx"},{"name":"SetupStepShell","sourcePath":"components/setup/SetupStepShell.jsx"},{"name":"FiveDayUvCard","sourcePath":"components/uv/FiveDayUvCard.jsx"},{"name":"UviBadge","sourcePath":"components/uv/UviBadge.jsx"}],"sourceHashes":{"components/brand/BrandHeader.jsx":"50e7caf7f0e7","components/brand/BrandMark.jsx":"194b5c69d83a","components/brand/Icon.jsx":"58631812b384","components/core/AppCard.jsx":"98e8142a7ce2","components/core/BadgePill.jsx":"295e98bab843","components/core/Button.jsx":"75679604b842","components/core/PageHeading.jsx":"9ced6daff32f","components/core/SafetyNote.jsx":"d43f28c2d2cf","components/core/StatFigure.jsx":"a8cd952f1a9f","components/core/TextInput.jsx":"3ca13a14ffe5","components/core/TextLink.jsx":"e5971e66114e","components/core/tweaks-panel.babel.js":"d259e3a86f73","components/education/EducationCategoryCard.jsx":"0cfd687707b6","components/education/EducationHeroCard.jsx":"5c0cd51314f8","components/education/EducationSourceBlock.jsx":"11a59d6a2d8a","components/feedback/GlobalStatusBanner.jsx":"c93b1bb57271","components/gear/GearListItem.jsx":"fcbfb1c34cd4","components/more/MoreEntryCard.jsx":"3dae2c099cd2","components/navigation/BottomNav.jsx":"b8f3f9094e5f","components/reminder/CountdownPanel.jsx":"2a146408dd5e","components/reminder/StatusCard.jsx":"807df3c343a6","components/reminder/ZoneStatusRow.jsx":"ecafad9ec0fa","components/setup/BottomSheet.jsx":"0c7b1df3f9bf","components/setup/ContextOption.jsx":"c263d869c111","components/setup/SetupStepShell.jsx":"ab5bbd101fe0","components/uv/FiveDayUvCard.jsx":"c56143c33887","components/uv/UviBadge.jsx":"2b71d903d26b"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.UVAlertDesignSystem_d2ab25 = window.UVAlertDesignSystem_d2ab25 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/BrandMark.jsx
try { (() => {
/**
 * The 06 broadcast mark: an amber sun dot with three fanned capsule "bulletin"
 * lines. `variant="lockup"` adds the 防曬晴報員 wordmark (GenSenRounded TW Medium,
 * outlined — the official horizontal lockup, 243×84).
 * Use the dark-surface file on espresso panels so the ink strokes stay visible.
 */
function BrandMark({
  variant = "mark",
  size = 40,
  basePath = "assets/logo",
  style,
  className
}) {
  const file = variant === "lockup" ? "lockup-horizontal.svg" : variant === "dark" ? "broadcast-mark-dark-surface.svg" : "broadcast-mark.svg";
  const isLockup = variant === "lockup";
  return /*#__PURE__*/React.createElement("img", {
    src: `${basePath}/${file}`,
    alt: "\u9632\u66EC\u6674\u5831\u54E1 UVAlert",
    className: className,
    style: {
      height: size,
      width: isLockup ? "auto" : size,
      display: "block",
      ...style
    }
  });
}
Object.assign(__ds_scope, { BrandMark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/BrandMark.jsx", error: String((e && e.message) || e) }); }

// components/brand/BrandHeader.jsx
try { (() => {
/**
 * Top brand bar: the broadcast-mark lockup on warm ivory, over a hairline rule.
 * Not navigation — navigation lives in the bottom nav.
 */
function BrandHeader({
  logoBase = "assets/logo",
  trailing,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-md)",
      minHeight: 64,
      padding: "0 var(--page-gutter-mobile)",
      background: "var(--color-canvas)",
      color: "var(--color-ink)",
      borderBottom: "1px solid var(--color-hairline-soft)",
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.BrandMark, {
    variant: "lockup",
    size: 44,
    basePath: logoBase
  }), trailing ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-xs)"
    }
  }, trailing) : null);
}
Object.assign(__ds_scope, { BrandHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/BrandHeader.jsx", error: String((e && e.message) || e) }); }

// components/brand/Icon.jsx
try { (() => {
const ICON_BASE_DEFAULT = "assets/icons";

/**
 * The custom icon set (DESIGN.md §8). No third-party icon library: every glyph
 * comes from docs/design/icon-system, whose shape DNA is the 06 broadcast mark —
 * solid dot + capsule strokes, 24×24, stroke-width 2.5, round caps.
 * The SVG is fetched and inlined so `currentColor` and the amber accent resolve.
 */
function Icon({
  name,
  size = 24,
  basePath,
  className,
  style,
  title,
  accent
}) {
  const base = basePath || typeof window !== "undefined" && window.UVALERT_ICON_BASE || ICON_BASE_DEFAULT;
  const [raw, setRaw] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    fetch(`${base}/${name}.svg`).then(response => response.ok ? response.text() : "").then(text => {
      if (!alive) return;
      setRaw(text.replace(/<svg([^>]*)>/, '<svg$1 width="100%" height="100%">').replace(/<title>[\s\S]*?<\/title>/, ""));
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [base, name]);
  // Two-tone glyphs (data-tone="two") carry a fixed #C1832E accent fill for their
  // secondary shape; `accent` swaps just that fill (e.g. for an active nav state)
  // while the outer currentColor stroke stays put.
  const markup = raw && accent ? raw.replaceAll("#C1832E", accent) : raw;
  return /*#__PURE__*/React.createElement("span", {
    className: className,
    role: title ? "img" : undefined,
    "aria-label": title,
    "aria-hidden": title ? undefined : true,
    style: {
      display: "inline-block",
      width: size,
      height: size,
      flex: "0 0 auto",
      lineHeight: 0,
      ...style
    },
    dangerouslySetInnerHTML: markup ? {
      __html: markup
    } : undefined
  });
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/AppCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Warm-ivory content card: 1px hairline border, radius-lg, 20px padding, no shadow. */
function AppCard({
  as = "section",
  children,
  className = "",
  style,
  ...rest
}) {
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: `app-card ${className}`.trim(),
    style: {
      display: "grid",
      gap: "var(--space-md)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { AppCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/AppCard.jsx", error: String((e && e.message) || e) }); }

// components/core/BadgePill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Pill label. `variant="unverified"` marks incomplete product data without hiding it. */
function BadgePill({
  variant = "default",
  children,
  className = "",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `${variant === "unverified" ? "badge-unverified" : "badge-pill"} ${className}`.trim(),
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { BadgePill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/BadgePill.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The system's button (DESIGN.md §5). Radius-md, min-height 44px, 14px/500 label.
 * Only default and pressed/disabled states exist — hover is deliberately undefined.
 * One primary CTA per screen.
 */
function Button({
  variant = "primary",
  as = "button",
  fullWidth = false,
  children,
  className = "",
  style,
  ...rest
}) {
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: `button button--${variant} ${className}`.trim(),
    style: {
      ...(fullWidth ? {
        width: "100%"
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/PageHeading.jsx
try { (() => {
/** Page title block: caption eyebrow, serif display-md title, body copy. */
function PageHeading({
  eyebrow,
  title,
  body,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "page-heading",
    style: style
  }, eyebrow ? /*#__PURE__*/React.createElement("p", {
    className: "page-heading__eyebrow"
  }, eyebrow) : null, /*#__PURE__*/React.createElement("h1", {
    className: "page-heading__title"
  }, title), body ? /*#__PURE__*/React.createElement("p", {
    className: "page-heading__body"
  }, body) : null);
}
Object.assign(__ds_scope, { PageHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/PageHeading.jsx", error: String((e && e.message) || e) }); }

// components/core/SafetyNote.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The standing disclaimer line at the bottom of a screen. Caption size, dimmed,
 * no left border, no box.
 */
function SafetyNote({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("p", _extends({
    className: "safety-note",
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { SafetyNote });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SafetyNote.jsx", error: String((e && e.message) || e) }); }

// components/core/StatFigure.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Instrument readout: mono, tabular-nums, weight 600, -0.02em. Real data only —
 * countdown minutes, UV index, timestamps, SPF values.
 */
function StatFigure({
  children,
  variant = "default",
  as = "span",
  className = "",
  style,
  ...rest
}) {
  const Tag = as;
  const variantClass = variant === "display" ? " stat-figure--display" : variant === "inline" ? " stat-figure--inline" : "";
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: `stat-figure${variantClass} ${className}`.trim(),
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { StatFigure });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatFigure.jsx", error: String((e && e.message) || e) }); }

// components/core/TextInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text field. 44px min height, hairline border, apricot focus ring at 15%. */
function TextInput({
  label,
  hint,
  id,
  error,
  as = "input",
  className = "",
  style,
  ...rest
}) {
  const Tag = as;
  const inputId = id || `field-${Math.random().toString(36).slice(2, 8)}`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-xs)"
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    className: "title-sm"
  }, label) : null, /*#__PURE__*/React.createElement(Tag, _extends({
    id: inputId,
    className: `text-input ${className}`.trim(),
    "aria-invalid": error ? "true" : undefined,
    style: error ? {
      borderColor: "var(--color-error)",
      ...style
    } : style
  }, rest)), error ? /*#__PURE__*/React.createElement("p", {
    className: "caption",
    style: {
      color: "var(--color-error)"
    },
    role: "alert"
  }, error) : hint ? /*#__PURE__*/React.createElement("p", {
    className: "caption"
  }, hint) : null);
}
Object.assign(__ds_scope, { TextInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/TextInput.jsx", error: String((e && e.message) || e) }); }

// components/core/TextLink.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Inline text action in the tracking blue. Used for quiet or destructive-entry actions. */
function TextLink({
  as = "a",
  children,
  className = "",
  style,
  ...rest
}) {
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: `text-link ${className}`.trim(),
    style: {
      ...(as === "button" ? {
        border: 0,
        background: "transparent",
        cursor: "pointer",
        padding: 0
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { TextLink });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/TextLink.jsx", error: String((e && e.message) || e) }); }

// components/core/tweaks-panel.babel.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // data-om-starter: inert presence marker — Claude Design's starter-usage
  // probe reads it. The closed panel renders nothing, so the marker rides
  // the <html> element as an attribute instead of a rendered node — zero
  // elements added, so page CSS (even structural selectors like
  // :nth-child) can never observe it. It records that the page WIRES a
  // tweaks panel, whether or not the panel is open. Keep this effect.
  React.useEffect(() => {
    document.documentElement.setAttribute('data-om-starter', 'tweaks-panel');
    return () => document.documentElement.removeAttribute('data-om-starter');
  }, []);
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/tweaks-panel.babel.js", error: String((e && e.message) || e) }); }

// components/education/EducationCategoryCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** One of the five ordinary education category cards. Cream surface, 18px/500 title.
 *  The icon leads: a 44px mark on its own line above the title. */
function EducationCategoryCard({
  icon = "education-reapply",
  title,
  summary,
  count,
  iconSize = 44,
  iconBase,
  as = "a",
  style,
  ...rest
}) {
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: "surface-card",
    style: {
      display: "grid",
      gap: "var(--space-xs)",
      padding: "var(--space-lg)",
      border: 0,
      textDecoration: "none",
      color: "var(--color-ink)",
      font: "inherit",
      textAlign: "left",
      cursor: "pointer",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: iconSize,
    basePath: iconBase,
    style: {
      marginBottom: "var(--space-xxs)"
    }
  }), /*#__PURE__*/React.createElement("h3", {
    className: "title-md"
  }, title), summary ? /*#__PURE__*/React.createElement("p", {
    className: "body-sm",
    style: {
      color: "var(--color-muted)"
    }
  }, summary) : null, count !== undefined ? /*#__PURE__*/React.createElement("p", {
    className: "caption"
  }, count, " \u7BC7") : null);
}
Object.assign(__ds_scope, { EducationCategoryCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/education/EducationCategoryCard.jsx", error: String((e && e.message) || e) }); }

// components/education/EducationHeroCard.jsx
try { (() => {
/**
 * The one enlarged card on the education home ("先從這裡開始"). Strongest warm
 * light surface, serif display-sm title. The icon leads at 72px above the text.
 */
function EducationHeroCard({
  eyebrow = "先從這裡開始",
  title,
  body,
  icon = "education-uv-basics",
  iconSize = 72,
  action,
  iconBase,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "grid",
      gap: "var(--space-sm)",
      padding: "var(--space-xl)",
      borderRadius: "var(--radius-lg)",
      background: "var(--color-surface-cream-strong)",
      color: "var(--color-ink)",
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: iconSize,
    basePath: iconBase
  }), /*#__PURE__*/React.createElement("p", {
    className: "caption",
    style: {
      color: "var(--color-body-strong)"
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h2", {
    className: "display-sm"
  }, title), body ? /*#__PURE__*/React.createElement("p", {
    className: "body-md prose",
    style: {
      color: "var(--color-body-strong)"
    }
  }, body) : null, action);
}
Object.assign(__ds_scope, { EducationHeroCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/education/EducationHeroCard.jsx", error: String((e && e.message) || e) }); }

// components/education/EducationSourceBlock.jsx
try { (() => {
/**
 * Sources and review info at the foot of an education article. Soft surface,
 * muted body-sm. Sources are never hidden behind an interaction — verifiability
 * is the basis of health content.
 */
function EducationSourceBlock({
  title = "資料來源與審閱",
  reviewedBy,
  reviewedAt,
  sources = [],
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "surface-soft",
    style: {
      display: "grid",
      gap: "var(--space-xs)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "caption",
    style: {
      color: "var(--color-body-strong)"
    }
  }, title), sources.length ? /*#__PURE__*/React.createElement("ul", {
    style: {
      display: "grid",
      gap: "var(--space-xxs)",
      margin: 0,
      paddingLeft: "1.1em",
      color: "var(--color-muted)",
      fontSize: "var(--font-size-body-sm)",
      lineHeight: 1.7
    }
  }, sources.map(source => /*#__PURE__*/React.createElement("li", {
    key: source.label
  }, source.href ? /*#__PURE__*/React.createElement("a", {
    href: source.href,
    style: {
      color: "var(--color-primary)"
    }
  }, source.label) : source.label))) : null, reviewedBy || reviewedAt ? /*#__PURE__*/React.createElement("p", {
    className: "body-sm",
    style: {
      color: "var(--color-muted)"
    }
  }, reviewedBy, reviewedBy && reviewedAt ? "・" : "", reviewedAt) : null);
}
Object.assign(__ds_scope, { EducationSourceBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/education/EducationSourceBlock.jsx", error: String((e && e.message) || e) }); }

// components/feedback/GlobalStatusBanner.jsx
try { (() => {
const ICONS = {
  offline: "state-offline",
  online: "state-online",
  "notification-off": "state-notification-off",
  "notification-pending": "state-notification-pending",
  warning: "state-warning"
};

/**
 * Cross-page system status (notifications off, background sync pending, offline,
 * back online). Soft surface, never an error fill — these states never block the
 * local countdown or manual actions, so the styling stays informational.
 */
function GlobalStatusBanner({
  kind = "offline",
  children,
  action,
  iconBase,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    className: "surface-soft",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-sm)",
      padding: "12px 16px",
      color: "var(--color-body)",
      fontSize: "var(--font-size-body-sm)",
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: ICONS[kind] || ICONS.warning,
    size: 20,
    basePath: iconBase
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, children), action);
}
Object.assign(__ds_scope, { GlobalStatusBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/GlobalStatusBanner.jsx", error: String((e && e.message) || e) }); }

// components/gear/GearListItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Gear list item: warm cream card, category icon, name, summary, optional badge.
 * The whole card is tappable. Never styled like a shopping listing.
 */
function GearListItem({
  category = "gear-sunscreen",
  name,
  summary,
  badge,
  iconBase,
  as = "button",
  style,
  ...rest
}) {
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: "surface-card",
    style: {
      display: "grid",
      gridTemplateColumns: "auto minmax(0,1fr) auto",
      alignItems: "center",
      gap: "var(--space-sm)",
      width: "100%",
      minHeight: "var(--tap-target)",
      border: 0,
      textAlign: "left",
      font: "inherit",
      cursor: as === "button" ? "pointer" : undefined,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: category,
    size: 32,
    basePath: iconBase
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "grid",
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "title-sm",
    style: {
      color: "var(--color-ink)"
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    className: "body-sm",
    style: {
      color: "var(--color-muted)",
      minHeight: 20
    }
  }, summary)), badge);
}
Object.assign(__ds_scope, { GearListItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/gear/GearListItem.jsx", error: String((e && e.message) || e) }); }

// components/more/MoreEntryCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Uniform entry card for the 更多 page. Every card shares the same size, icon
 * position, radius and text structure — grouping is done with light dividers or
 * small captions, never by making one card louder.
 */
function MoreEntryCard({
  icon = "more-about",
  title,
  status,
  iconBase,
  as = "button",
  style,
  ...rest
}) {
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: "surface-card",
    style: {
      display: "grid",
      gridTemplateColumns: "auto minmax(0,1fr) auto",
      alignItems: "center",
      gap: "var(--space-sm)",
      width: "100%",
      padding: "var(--space-lg)",
      border: 0,
      textAlign: "left",
      font: "inherit",
      cursor: as === "button" ? "pointer" : undefined,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 24,
    basePath: iconBase
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "grid",
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "title-sm",
    style: {
      color: "var(--color-ink)"
    }
  }, title), status ? /*#__PURE__*/React.createElement("span", {
    className: "caption"
  }, status) : null), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "tool-chevron-right",
    size: 20,
    basePath: iconBase
  }));
}
Object.assign(__ds_scope, { MoreEntryCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/more/MoreEntryCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/BottomNav.jsx
try { (() => {
const ITEMS = [{
  id: "reminder",
  label: "提醒",
  icon: "nav-reminder"
}, {
  id: "gear",
  label: "裝備",
  icon: "nav-gear"
}, {
  id: "more",
  label: "更多",
  icon: "nav-more"
}];

/**
 * Fixed bottom navigation: exactly three destinations — 提醒 / 裝備 / 更多.
 * Sits on the page canvas (no bar fill) behind a hairline top rule. The active
 * destination is marked by a cream pill behind its icon plus a bold label —
 * shape carries the state, so no glyph recolouring and no top-edge indicator.
 * Icon colours (ink stroke + amber accent) are identical in every state.
 * No separate home or education entry.
 */
function BottomNav({
  active = "reminder",
  onSelect,
  iconBase,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "\u4E3B\u8981\u5C0E\u89BD",
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      minHeight: "var(--bottom-nav-height)",
      background: "transparent",
      borderTop: "1px solid var(--color-hairline-soft)",
      ...style
    }
  }, ITEMS.map(item => {
    const isActive = item.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: item.id,
      type: "button",
      "aria-current": isActive ? "page" : undefined,
      onClick: onSelect ? () => onSelect(item.id) : undefined,
      style: {
        display: "grid",
        justifyItems: "center",
        alignContent: "center",
        gap: "var(--space-xs)",
        border: 0,
        padding: "var(--space-sm) 0",
        background: "transparent",
        color: "var(--color-body-strong)",
        fontSize: "var(--font-size-nav-label)",
        fontWeight: isActive ? 700 : 400,
        lineHeight: 1.4,
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "grid",
        placeItems: "center",
        width: 56,
        height: 32,
        borderRadius: "var(--radius-pill)",
        background: isActive ? "var(--color-surface-card)" : "transparent"
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: item.icon,
      size: 24,
      basePath: iconBase
    })), item.label);
  }));
}
Object.assign(__ds_scope, { BottomNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/BottomNav.jsx", error: String((e && e.message) || e) }); }

// components/reminder/CountdownPanel.jsx
try { (() => {
const BAR_TONE = {
  tracking: "var(--color-status-tracking)",
  soon: "var(--color-status-soon)",
  due: "var(--color-status-due)",
  untimed: "var(--color-hairline)"
};

/**
 * The product's core surface: the countdown to the next reapplication.
 * Light by design — it sits on the page canvas with a hairline rule, a large
 * numeral, and a slim linear progress bar (per the wireframes). No ring, no
 * dark panel: emphasis comes from the size of the number, not from a heavy
 * colour field. Tone colours the bar only, always beside an explicit label.
 */
function CountdownPanel({
  tone = "tracking",
  label = "追蹤中",
  minutes,
  unit = "分鐘",
  progress = 0.6,
  caption,
  action,
  style
}) {
  const pct = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "grid",
      gap: "var(--space-md)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-xxs)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--color-muted)",
      fontSize: "var(--font-size-body-sm)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: "var(--space-xs)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StatFigure, {
    variant: "display",
    style: {
      color: "var(--color-ink)"
    }
  }, minutes), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--color-body)",
      fontSize: "var(--font-size-body)",
      paddingBottom: "0.35em"
    }
  }, unit))), caption ? /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--color-body-strong)",
      fontSize: "var(--font-size-body)",
      lineHeight: 1.7
    }
  }, caption) : null, /*#__PURE__*/React.createElement("div", {
    role: "presentation",
    style: {
      height: 8,
      borderRadius: "var(--radius-pill)",
      background: "var(--color-surface-card)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct,
      height: "100%",
      background: BAR_TONE[tone]
    }
  })), action);
}
Object.assign(__ds_scope, { CountdownPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/reminder/CountdownPanel.jsx", error: String((e && e.message) || e) }); }

// components/reminder/StatusCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STATE_ICON = {
  tracking: "state-tracking",
  soon: "state-soon",
  due: "state-due",
  untimed: "state-untimed",
  saved: "state-success"
};

/**
 * Soft-filled status card (12% status colour over canvas) — same visual weight
 * across all five variants. No left bar, no shadow. "saved" is mauve, never green.
 */
function StatusCard({
  tone = "tracking",
  label,
  children,
  iconBase,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `status-card status-card--${tone}`,
    style: {
      display: "grid",
      gap: "var(--space-xs)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("p", {
    className: "status-card__label",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-xs)",
      margin: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: STATE_ICON[tone],
    size: 20,
    basePath: iconBase
  }), label), children ? /*#__PURE__*/React.createElement("div", {
    className: "body-sm"
  }, children) : null);
}
Object.assign(__ds_scope, { StatusCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/reminder/StatusCard.jsx", error: String((e && e.message) || e) }); }

// components/reminder/ZoneStatusRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STATE_ICON = {
  tracking: "state-tracking",
  soon: "state-soon",
  due: "state-due",
  untimed: "state-untimed"
};
const STATE_COLOR = {
  tracking: "var(--color-status-tracking)",
  soon: "var(--color-status-soon)",
  due: "var(--color-status-due)",
  untimed: "var(--color-status-untimed)"
};

/**
 * One tracked body zone: name, state icon (capsule-count meter), remaining time.
 * Transparent background, hairline-soft divider. 16 zones are text labels plus
 * state icons — never body-part illustrations.
 */
function ZoneStatusRow({
  zone,
  tone = "tracking",
  stateLabel,
  remaining,
  iconBase,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "grid",
      gridTemplateColumns: "auto minmax(0,1fr) auto",
      alignItems: "center",
      gap: "var(--space-sm)",
      padding: "12px 0",
      borderBottom: "1px solid var(--color-hairline-soft)",
      background: "transparent",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      color: STATE_COLOR[tone],
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: STATE_ICON[tone],
    size: 20,
    basePath: iconBase
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--color-ink)",
      fontSize: "var(--font-size-body-md)"
    }
  }, zone, stateLabel ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--color-muted)",
      fontSize: "var(--font-size-body-sm)"
    }
  }, "\u30FB", stateLabel) : null), remaining ? /*#__PURE__*/React.createElement(__ds_scope.StatFigure, null, remaining) : null);
}
Object.assign(__ds_scope, { ZoneStatusRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/reminder/ZoneStatusRow.jsx", error: String((e && e.message) || e) }); }

// components/setup/BottomSheet.jsx
try { (() => {
/**
 * Bottom sheet for in-flow detail edits (e.g. zone protection adjustment).
 * A sheet, not a new page — the flow must not break. The only element in the
 * system allowed a (very faint) shadow.
 */
function BottomSheet({
  title,
  children,
  actions,
  onClose,
  iconBase,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    role: "dialog",
    "aria-label": title,
    style: {
      display: "grid",
      gap: "var(--space-sm)",
      padding: "var(--space-xl)",
      borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
      border: "1px solid var(--color-hairline)",
      borderBottom: "none",
      background: "var(--color-canvas)",
      color: "var(--color-ink)",
      boxShadow: "var(--shadow-float)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "start",
      justifyContent: "space-between",
      gap: "var(--space-md)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "title-lg"
  }, title), onClose ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "\u95DC\u9589",
    style: {
      display: "grid",
      placeItems: "center",
      width: 44,
      height: 44,
      border: 0,
      background: "transparent",
      cursor: "pointer",
      color: "var(--color-muted)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "tool-close",
    size: 24,
    basePath: iconBase
  })) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-xs)"
    }
  }, children), actions ? /*#__PURE__*/React.createElement("div", {
    className: "button-group",
    style: {
      display: "grid"
    }
  }, actions) : null);
}
Object.assign(__ds_scope, { BottomSheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/setup/BottomSheet.jsx", error: String((e && e.message) || e) }); }

// components/setup/ContextOption.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Context choice. Selected state changes BOTH the fill (surface-card) and the
 * border (primary) — never colour alone.
 */
function ContextOption({
  icon = "context-outdoor",
  label,
  description,
  selected = false,
  iconBase,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-pressed": selected,
    style: {
      display: "grid",
      gridTemplateColumns: "auto minmax(0,1fr)",
      alignItems: "center",
      gap: "var(--space-sm)",
      width: "100%",
      minHeight: 64,
      padding: "var(--space-md)",
      border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-hairline)"}`,
      borderRadius: "var(--radius-md)",
      background: selected ? "var(--color-surface-card)" : "var(--color-canvas)",
      color: "var(--color-ink)",
      textAlign: "left",
      font: "inherit",
      cursor: "pointer",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 24,
    basePath: iconBase
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "grid",
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "title-sm"
  }, label), description ? /*#__PURE__*/React.createElement("span", {
    className: "body-sm",
    style: {
      color: "var(--color-muted)"
    }
  }, description) : null));
}
Object.assign(__ds_scope, { ContextOption });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/setup/ContextOption.jsx", error: String((e && e.message) || e) }); }

// components/setup/SetupStepShell.jsx
try { (() => {
/**
 * The frame for the two-step setup flow (1 情境, 2 塗抹時間與部位). The whole
 * flow happens inside this shell — product labels, zone adjustments and
 * notification prompts never navigate away to a parallel page.
 */
function SetupStepShell({
  step = 1,
  totalSteps = 2,
  title,
  description,
  children,
  actions,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "grid",
      gap: "var(--space-xl)",
      background: "var(--color-canvas)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-xs)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "caption"
  }, "\u6B65\u9A5F ", step, " / ", totalSteps), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-xxs)"
    }
  }, Array.from({
    length: totalSteps
  }).map((_, index) => /*#__PURE__*/React.createElement("span", {
    key: index,
    style: {
      height: 3,
      flex: 1,
      borderRadius: "var(--radius-pill)",
      background: index < step ? "var(--color-primary)" : "var(--color-hairline)"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-sm)"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    className: "display-sm"
  }, title), description ? /*#__PURE__*/React.createElement("p", {
    className: "body-md prose"
  }, description) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-sm)"
    }
  }, children), actions ? /*#__PURE__*/React.createElement("div", {
    className: "button-group",
    style: {
      display: "grid"
    }
  }, actions) : null);
}
Object.assign(__ds_scope, { SetupStepShell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/setup/SetupStepShell.jsx", error: String((e && e.message) || e) }); }

// components/uv/UviBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const LEVEL_LABEL = {
  low: "低量級",
  moderate: "中量級",
  high: "高量級",
  "very-high": "過量級",
  extreme: "危險級"
};

/** UV risk pill: 14% risk colour over canvas. Always shown with the index number. */
function UviBadge({
  level = "moderate",
  value,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `uvi-badge uvi-badge--${level}`,
    style: style
  }, rest), LEVEL_LABEL[level], value !== undefined ? /*#__PURE__*/React.createElement(__ds_scope.StatFigure, {
    variant: "inline",
    style: {
      color: "inherit"
    }
  }, value) : null);
}
Object.assign(__ds_scope, { UviBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/uv/UviBadge.jsx", error: String((e && e.message) || e) }); }

// components/uv/FiveDayUvCard.jsx
try { (() => {
const RISK_COLOR = {
  low: "var(--color-uvi-low)",
  moderate: "var(--color-uvi-moderate)",
  high: "var(--color-uvi-high)",
  "very-high": "var(--color-uvi-very-high)",
  extreme: "var(--color-uvi-extreme)"
};

/**
 * Five-day regional forecast. Fixed 5-column grid at every breakpoint (type
 * shrinks instead of the column count). Card border takes today's risk colour.
 * Source, update time and the "regional forecast, not a live station" note are
 * part of the component, not optional decoration.
 */
function FiveDayUvCard({
  days = [],
  source,
  updatedAt,
  note = "這是地區預報，不是即時測站觀測；UV 高低不會延長或縮短你的補擦計時。",
  style
}) {
  const todayRisk = days[0]?.level;
  return /*#__PURE__*/React.createElement("section", {
    className: "app-card",
    style: {
      display: "grid",
      gap: "var(--space-md)",
      borderColor: todayRisk ? RISK_COLOR[todayRisk] : "var(--color-hairline)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("ol", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(5, minmax(0,1fr))",
      gap: "var(--space-xs)",
      margin: 0,
      padding: 0,
      listStyle: "none"
    }
  }, days.map(day => /*#__PURE__*/React.createElement("li", {
    key: day.date,
    style: {
      display: "grid",
      justifyItems: "center",
      gap: "var(--space-xs)",
      textAlign: "center",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "caption"
  }, day.date), /*#__PURE__*/React.createElement(__ds_scope.StatFigure, {
    style: {
      fontSize: 24
    }
  }, day.uvi), /*#__PURE__*/React.createElement(__ds_scope.UviBadge, {
    level: day.level,
    style: {
      padding: "2px 8px",
      fontSize: 11
    }
  })))), source || updatedAt ? /*#__PURE__*/React.createElement("p", {
    className: "caption",
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-xs)"
    }
  }, source, updatedAt ? /*#__PURE__*/React.createElement("span", null, "\u66F4\u65B0 ", /*#__PURE__*/React.createElement(__ds_scope.StatFigure, {
    variant: "inline"
  }, updatedAt)) : null) : null, note ? /*#__PURE__*/React.createElement("p", {
    className: "safety-note"
  }, note) : null);
}
Object.assign(__ds_scope, { FiveDayUvCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/uv/FiveDayUvCard.jsx", error: String((e && e.message) || e) }); }

__ds_ns.BrandHeader = __ds_scope.BrandHeader;

__ds_ns.BrandMark = __ds_scope.BrandMark;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.AppCard = __ds_scope.AppCard;

__ds_ns.BadgePill = __ds_scope.BadgePill;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.PageHeading = __ds_scope.PageHeading;

__ds_ns.SafetyNote = __ds_scope.SafetyNote;

__ds_ns.StatFigure = __ds_scope.StatFigure;

__ds_ns.TextInput = __ds_scope.TextInput;

__ds_ns.TextLink = __ds_scope.TextLink;

__ds_ns.EducationCategoryCard = __ds_scope.EducationCategoryCard;

__ds_ns.EducationHeroCard = __ds_scope.EducationHeroCard;

__ds_ns.EducationSourceBlock = __ds_scope.EducationSourceBlock;

__ds_ns.GlobalStatusBanner = __ds_scope.GlobalStatusBanner;

__ds_ns.GearListItem = __ds_scope.GearListItem;

__ds_ns.MoreEntryCard = __ds_scope.MoreEntryCard;

__ds_ns.BottomNav = __ds_scope.BottomNav;

__ds_ns.CountdownPanel = __ds_scope.CountdownPanel;

__ds_ns.StatusCard = __ds_scope.StatusCard;

__ds_ns.ZoneStatusRow = __ds_scope.ZoneStatusRow;

__ds_ns.BottomSheet = __ds_scope.BottomSheet;

__ds_ns.ContextOption = __ds_scope.ContextOption;

__ds_ns.SetupStepShell = __ds_scope.SetupStepShell;

__ds_ns.FiveDayUvCard = __ds_scope.FiveDayUvCard;

__ds_ns.UviBadge = __ds_scope.UviBadge;

})();
