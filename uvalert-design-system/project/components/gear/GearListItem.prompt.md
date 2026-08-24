Rows in the 裝備 page — sunscreen, hats, clothing, sunglasses, umbrellas.

```jsx
<GearListItem category="gear-sunscreen" name="每日防曬乳"
  summary="SPF 50 · 一般補擦 120 分鐘"
  badge={<BadgePill variant="unverified">標示尚未確認</BadgePill>} />
```

- Cream `--color-surface-card`, radius-lg, 16px padding, entire card tappable.
- Products with unconfirmed labels stay in the list with the badge — never hidden or demoted.
- No prices, no store-like presentation; this is a personal record, not a shop.
