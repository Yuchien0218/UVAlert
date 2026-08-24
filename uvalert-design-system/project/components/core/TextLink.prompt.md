For low-emphasis actions and in-place destructive entry points (停止本次提醒, 暫不提供地區, 停止使用).

```jsx
<TextLink as="button" onClick={openConfirmation}>停止本次提醒</TextLink>
```

Destructive flows never open a dialog: the summary text is replaced in place by a confirm title, two buttons (`variant="tone" tone="due"` and `quiet`).
