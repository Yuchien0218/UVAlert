The logo. Amber sun dot + three fanned bulletin lines ("報" = a short broadcast).

```jsx
<BrandMark variant="lockup" size={44} basePath="../../assets/logo" />
```

- Icon/logo palette is its own scope: ink coffee `#33291F` + amber gold `#C1832E`. Do **not** recolour it with the UI palette (apricot `#9F5E42`), and do not use amber gold as a UI brand colour.
- On the espresso countdown panel or a dark footer, use `variant="dark"` (ivory strokes, amber dot preserved).
- App-icon geometry stays inside a 20px safe radius on the 64px canvas — don't rescale the glyph inside its own canvas.
