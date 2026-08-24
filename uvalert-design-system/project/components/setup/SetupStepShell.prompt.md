The 開始提醒 flow: step 1 情境, step 2 塗抹時間與部位.

```jsx
<SetupStepShell step={1} title="你現在主要在哪種情境？"
  description="選擇最符合這次活動的情境。"
  actions={<Button variant="primary">下一步</Button>}>
  …ContextOption cards…
</SetupStepShell>
```

Keep everything inside the shell — detail edits open a `BottomSheet`, not a new page. Two steps only.
