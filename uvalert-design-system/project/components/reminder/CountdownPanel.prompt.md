The heart of the 提醒 page: the one place the countdown lives.

```jsx
<CountdownPanel tone="soon" label="即將到期" minutes={28} progress={0.24}
  caption="預計 20:15 需要補擦"
  action={<Button>記錄補擦</Button>} />
```

- One per app. Never show a mini countdown on another page — that creates a second reminder screen.
- Light by design: it sits directly on the page canvas. No ring, no dark panel — the large numeral carries the emphasis.
- Progress is a slim linear bar: `--color-primary` while tracking, `--color-status-soon` near expiry, `--color-status-due` when due, always with the matching text label above.
- The CTA is the standard primary Button.
