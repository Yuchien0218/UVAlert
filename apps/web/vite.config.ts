import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

/**
 * `PORT` 交給 vite（2026-09-03）。
 *
 * preview 工具在 5173 被佔用時會改指派一個空的 port，並用 `PORT` 環境變數
 * 傳進來——但 **vite 不讀 `PORT`**，它會自己往上找（5173 → 5174）。結果是
 * 工具說「開在 11567」、伺服器其實在 5174，畫面全空而且看不出原因
 * （2026-09-03 實際踩到）。
 *
 * 這個 repo 常常同時跑著別的專案（CLAUDE.md 記過 5173／5174 互相擠掉的
 * 事故），所以讓 vite 聽指派的 port 比讓它自己漂移安全。
 */
const port = Number(process.env.PORT);

export default defineConfig({
  plugins: [vue()],
  server: Number.isInteger(port) && port > 0 ? { port, strictPort: true } : {}
});
