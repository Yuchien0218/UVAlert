The only icon source in the system — the product's own set, inherited from the broadcast-mark logo (solid dot + capsule strokes).

```jsx
<Icon name="state-soon" size={20} title="即將到期" />
<Icon name="gear-sunscreen" size={24} basePath="../../assets/icons" />
```

- Sizes: 16 / 20 / 24 only.
- `state-*` icons are mono (`currentColor`) so they inherit the semantic colour of their context; the two-tone families (nav, gear, context, event, education, more) carry a fixed amber accent `#C1832E` over ink coffee `#33291F`.
- Countdown/zone status is distinguished by **capsule count**, not colour: tracking (3) → soon (1) → due (empty) → untimed (empty + slash). A slash always means "disabled / not applicable".
- UV levels get no icon — the forecast already shows the number and the Chinese level.
- Never substitute Lucide or any other library glyph.
