Use for detail edits inside a flow (部位防護調整, 產品標示補充) so the user never leaves the step.

```jsx
<BottomSheet title="調整部位防護" onClose={close}
  actions={<Button variant="primary">套用</Button>}>…</BottomSheet>
```

Canvas background, radius-lg on the top corners, 24px padding. It is the one place the system allows a shadow, and only `--shadow-float`.
