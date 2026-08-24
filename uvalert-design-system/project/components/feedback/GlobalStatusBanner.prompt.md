Carries system-level state across pages: 通知未開啟 / 背景通知尚未完成 / 目前離線 / 背景通知已恢復.

```jsx
<GlobalStatusBanner kind="notification-off" action={<TextLink as="button">開啟</TextLink>}>
  通知未開啟，倒數仍會在這台裝置繼續。
</GlobalStatusBanner>
```

These states never block the local countdown, so the banner is a hint, not an alert — soft surface, no red fill, no warning triangle wall.
