One primary CTA per screen — everything else is `quiet` or a `TextLink`.

```jsx
<Button variant="primary" fullWidth>記錄已補擦</Button>
<Button variant="quiet"><Icon name="tool-refresh" size={20} /> 再試一次</Button>
<Button variant="on-dark">調整部位</Button>
```

- Deep apricot `--color-primary` is the action colour; it darkens to `--color-primary-active` when pressed and fades to `--color-primary-disabled` when disabled.
- On the espresso countdown panel always use `on-dark` — the system never inverts a light secondary button onto a dark surface.
- Never set `min-height` on a button in local styles; it already carries `--tap-target` (a past bug shrank three components to 40px this way).
- No hover state is defined. Don't add one.
