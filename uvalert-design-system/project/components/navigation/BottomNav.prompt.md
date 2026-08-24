Fixed to the bottom of every main screen.

```jsx
<BottomNav active="gear" onSelect={setTab} iconBase="../../assets/icons" />
```

The three items are fixed: 提醒 / 裝備 / 更多. Do not add a home tab or an education tab — education is reached from the 更多 page. Icon above, 12px label below. The active item is marked by a cream pill (`--color-surface-card`) behind its icon plus a bold (700) label — shape carries the state. Icon colours (ink stroke + amber accent) and label colour are identical in every state; there is no top-edge indicator and no recolouring.
