The forecast block on the reminder page, shown once a region is set.

```jsx
<FiveDayUvCard source="中央氣象署・F-D0047-091" updatedAt="8/22 06:00" days={[
  { date: "8/22", uvi: 9, level: "very-high" }, …
]} />
```

- Always 5 columns — shrink the type at narrow widths, never the column count.
- Keep the source, update time and the regional-forecast disclaimer; verifiability is the point of the card.
