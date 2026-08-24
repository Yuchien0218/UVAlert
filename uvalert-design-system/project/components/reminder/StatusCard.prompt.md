Communicates urgency with a soft fill — colour, icon and text together.

```jsx
<StatusCard tone="due" label="該補擦了">臉部與頸部已超過建議間隔。</StatusCard>
```

- All five fills are `color-mix(<status> 12%, canvas)` so no variant shouts louder than the others.
- 已儲存 uses mauve `--color-status-saved`, deliberately not green: sunscreen has no "done" state, only "this record saved".
- Never express status with a coloured left border or an outline.
