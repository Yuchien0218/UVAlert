// 自動產生，請勿手動修改。來源：docs/design/icon-system/icons/。
// 重新產生：node tools/icon-system/generate-icons.mjs

export interface IconEntry {
  viewBox: string;
  title: string;
  body: string;
}

// 用 as const（不是 Record<string, IconEntry>）讓 key 保持字面量聯集，
// 這樣 ICONS[name] 在 name: IconName 時才推得出一定存在，不必判斷 undefined。
export const ICONS = {
  "nav-reminder": {
    viewBox: "0 0 24 24",
    title: "提醒",
    body: `<title>提醒</title>
  <path d="M7.9 5.1H16.1L12 11.7Z" fill="#C1832E"/><path d="M6.4 3.9H17.6L12 12L17.6 20.1H6.4L12 12Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  "nav-gear": {
    viewBox: "0 0 24 24",
    title: "裝備",
    body: `<title>裝備</title>
  <g transform="translate(0 -0.3)"><rect x="9.25" y="2.75" width="5.5" height="3.75" rx="1.5" fill="#C1832E"/><rect x="6.75" y="7.5" width="10.5" height="13.25" rx="3.25" fill="none" stroke="currentColor" stroke-width="2.5"/></g>`
  },
  "nav-more": {
    viewBox: "0 0 24 24",
    title: "更多",
    body: `<title>更多</title>
  <circle cx="6.8" cy="6.8" r="3.05" fill="currentColor"/><circle cx="17.2" cy="6.8" r="3.05" fill="#C1832E"/><circle cx="6.8" cy="17.2" r="3.05" fill="currentColor"/><circle cx="17.2" cy="17.2" r="3.05" fill="currentColor"/>`
  },
  "state-tracking": {
    viewBox: "0 0 24 24",
    title: "追蹤中",
    body: `<title>追蹤中</title>
  <rect x="2.75" y="8.2" width="18.5" height="7.6" rx="3.2" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="5.6" y="10.6" width="3.2" height="2.8" rx="1.1" fill="currentColor"/><rect x="10.4" y="10.6" width="3.2" height="2.8" rx="1.1" fill="currentColor"/><rect x="15.2" y="10.6" width="3.2" height="2.8" rx="1.1" fill="currentColor"/>`
  },
  "state-soon": {
    viewBox: "0 0 24 24",
    title: "即將到期",
    body: `<title>即將到期</title>
  <rect x="2.75" y="8.2" width="18.5" height="7.6" rx="3.2" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="5.6" y="10.6" width="3.2" height="2.8" rx="1.1" fill="currentColor"/>`
  },
  "state-due": {
    viewBox: "0 0 24 24",
    title: "已到期",
    body: `<title>已到期</title>
  <rect x="2.75" y="8.2" width="18.5" height="7.6" rx="3.2" fill="none" stroke="currentColor" stroke-width="2.5"/>`
  },
  "state-untimed": {
    viewBox: "0 0 24 24",
    title: "未計時",
    body: `<title>未計時</title>
  <rect x="2.75" y="8.2" width="18.5" height="7.6" rx="3.2" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M5.6 18.4L18.4 5.6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`
  },
  "state-notification-off": {
    viewBox: "0 0 24 24",
    title: "通知未開啟",
    body: `<title>通知未開啟</title>
  <g transform="translate(0 -0.2)"><path d="M6.6 15.8V10.2A5.4 5.4 0 0 1 17.4 10.2V15.8Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 15.8H19.2" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/><path d="M5.6 18.4L18.4 5.6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></g>`
  },
  "state-notification-pending": {
    viewBox: "0 0 24 24",
    title: "背景通知尚未完成",
    body: `<title>背景通知尚未完成</title>
  <g transform="translate(0 -0.2)"><path d="M6.6 15.8V10.2A5.4 5.4 0 0 1 17.4 10.2V15.8Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 15.8H10.4M13.6 15.8H19.2" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/></g>`
  },
  "state-offline": {
    viewBox: "0 0 24 24",
    title: "目前離線",
    body: `<title>目前離線</title>
  <g transform="translate(0 -0.45)"><path d="M7.5 18A4.5 4.5 0 0 1 7.5 9A6 6 0 0 1 18.5 11A3.6 3.6 0 0 1 18 18Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.6 19.4L18.4 5.6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></g>`
  },
  "state-online": {
    viewBox: "0 0 24 24",
    title: "背景通知已恢復",
    body: `<title>背景通知已恢復</title>
  <path d="M7.5 18A4.5 4.5 0 0 1 7.5 9A6 6 0 0 1 18.5 11A3.6 3.6 0 0 1 18 18Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  "state-success": {
    viewBox: "0 0 24 24",
    title: "已儲存",
    body: `<title>已儲存</title>
  <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M8 12.3L11 15.2L16 9.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  "state-warning": {
    viewBox: "0 0 24 24",
    title: "警告",
    body: `<title>警告</title>
  <g transform="translate(0 -0.65)"><path d="M10.3 5.1A2 2 0 0 1 13.7 5.1L20.9 18.6A2 2 0 0 1 19.2 21.5H4.8A2 2 0 0 1 3.1 18.6Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 11V13.8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="17.1" r="1.15" fill="currentColor"/></g>`
  },
  "state-unverified": {
    viewBox: "0 0 24 24",
    title: "標示尚未確認",
    body: `<title>標示尚未確認</title>
  <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M9.6 9.8A2.4 2.4 0 1 1 12 12.2V13.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="16.4" r="1.25" fill="currentColor"/>`
  },
  "more-notifications": {
    viewBox: "0 0 24 24",
    title: "通知設定",
    body: `<title>通知設定</title>
  <g transform="translate(0 -0.2)"><path d="M6.6 15.8V10.2A5.4 5.4 0 0 1 17.4 10.2V15.8Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 15.8H19.2" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="19" r="1.8" fill="#C1832E"/></g>`
  },
  "more-education": {
    viewBox: "0 0 24 24",
    title: "防曬衛教",
    body: `<title>防曬衛教</title>
  <g transform="translate(0 -0.45)"><path d="M12 7.6V18.6" fill="none" stroke="#C1832E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7.6C10.2 6.6 7.8 6.2 4.8 6.2V17.2C7.8 17.2 10.2 17.6 12 18.6C13.8 17.6 16.2 17.2 19.2 17.2V6.2C16.2 6.2 13.8 6.6 12 7.6Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`
  },
  "more-data": {
    viewBox: "0 0 24 24",
    title: "本機資料與隱私",
    body: `<title>本機資料與隱私</title>
  <path d="M5.25 12A6.75 2.9 0 0 0 18.75 12" fill="none" stroke="#C1832E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="12" cy="7.25" rx="6.75" ry="2.9" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M5.25 7.25V16.75A6.75 2.9 0 0 0 18.75 16.75V7.25" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  "more-feedback": {
    viewBox: "0 0 24 24",
    title: "問題回報",
    body: `<title>問題回報</title>
  <g transform="translate(0 -0.45)"><path d="M6 4.5H18A2.5 2.5 0 0 1 20.5 7V14.5A2.5 2.5 0 0 1 18 17H12.5L8 20.5V17H6A2.5 2.5 0 0 1 3.5 14.5V7A2.5 2.5 0 0 1 6 4.5Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="10.75" r="2" fill="#C1832E"/></g>`
  },
  "more-install": {
    viewBox: "0 0 24 24",
    title: "安裝到主畫面",
    body: `<title>安裝到主畫面</title>
  <g transform="translate(0 -0.65)"><path d="M4.4 13.4V18.4A2.2 2.2 0 0 0 6.6 20.6H17.4A2.2 2.2 0 0 0 19.6 18.4V13.4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 4.8V11.9" fill="none" stroke="#C1832E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.3 9.4L12 13.1L15.7 9.4" fill="none" stroke="#C1832E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`
  },
  "more-about": {
    viewBox: "0 0 24 24",
    title: "說明與關於",
    body: `<title>說明與關於</title>
  <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="12" cy="8" r="1.5" fill="#C1832E"/><path d="M12 11.75V16.25" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  "context-outdoor": {
    viewBox: "0 0 24 24",
    title: "一般戶外",
    body: `<title>一般戶外</title>
  <circle fill="#C1832E" stroke-width="0" cx="17.4" cy="6.3" r="2.1"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3.4,18.7l6.2-10.2,4.2,5.8,2.6-3,4.2,7.4H3.4Z"/>`
  },
  "context-exercise": {
    viewBox: "0 0 24 24",
    title: "戶外運動",
    body: `<title>戶外運動</title>
  <g transform="translate(0 -2.4)"><circle cx="6.6" cy="16.4" r="4" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="17.4" cy="16.4" r="4" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M6.6 16.4L12 9L17.4 16.4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.8 9H14.2" fill="none" stroke="#C1832E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`
  },
  "context-indoor": {
    viewBox: "0 0 24 24",
    title: "室內",
    body: `<title>室內</title>
  <rect fill="#C1832E" stroke-width="0" x="10.4" y="11.1" width="3.3" height="3.3" rx="1.1" ry="1.1"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.2,11.1l7.8-6.4,7.8,6.4"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6.6,9.5v9.8h10.8v-9.8"/>`
  },
  "context-water": {
    viewBox: "0 0 24 24",
    title: "水中",
    body: `<title>水中</title>
  <g transform="translate(0 -0.45)"><path d="M4.2 9.6Q6.15 7.90 8.10 9.6Q10.05 11.30 12.00 9.6Q13.95 7.90 15.90 9.6Q17.85 11.30 19.80 9.6" fill="none" stroke="#C1832E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.2 15.4Q6.15 13.70 8.10 15.4Q10.05 17.10 12.00 15.4Q13.95 13.70 15.90 15.4Q17.85 17.10 19.80 15.4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`
  },
  "event-heavy-sweat": {
    viewBox: "0 0 24 24",
    title: "大量流汗",
    body: `<title>大量流汗</title>
  <path stroke-width="0" fill="#C1832E" d="M16.3,5.4c-2.3,2.8-2.4,4.4-2.4,5.6s1.1,2.4,2.4,2.4,2.4-1.1,2.4-2.4-.1-2.9-2.4-5.6Z"/> <path fill="currentColor" stroke-width="0" d="M8.9,7.2c-3.4,4.1-3.6,6.6-3.6,8.4s1.6,3.6,3.6,3.6,3.6-1.6,3.6-3.6-.2-4.3-3.6-8.4Z"/>`
  },
  "event-towel": {
    viewBox: "0 0 24 24",
    title: "擦拭",
    body: `<title>擦拭</title>
  <path fill="none" stroke-width="2.5" stroke="#C1832E" stroke-linecap="round" stroke-linejoin="round" d="M6.4,9.5h11.2"/> <rect stroke="currentColor" fill="none" stroke-width="2.5" x="6.4" y="4.4" width="11.2" height="15.2" rx="2.4" ry="2.4"/>`
  },
  "event-friction": {
    viewBox: "0 0 24 24",
    title: "摩擦",
    body: `<title>摩擦</title>
  <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.4,6h15.2"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.4,18h15.2"/> <path fill="#C1832E" stroke-width="0" d="M15.3,8.7l-1,3.3,1,3.3-3.3-1-3.3,1,1-3.3-1-3.3,3.3,1,3.3-1Z"/>`
  },
  "event-hand-wash": {
    viewBox: "0 0 24 24",
    title: "洗手",
    body: `<title>洗手</title>
  <path fill="#C1832E" stroke-width="0" d="M9,2.1c-2.2,2.6-2.3,4.3-2.3,5.4s1,2.3,2.3,2.3,2.3-1,2.3-2.3-.1-2.8-2.3-5.4Z"/> <path fill="#C1832E" stroke-width="0" d="M15,3.8c-1.8,2.2-1.9,3.5-1.9,4.5,0,1,.9,1.9,1.9,1.9,1,0,1.9-.9,1.9-1.9,0-.9-.1-2.3-1.9-4.5Z"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.6,12.9c0,4.1,3.3,7.4,7.4,7.4,4.1,0,7.4-3.3,7.4-7.4H4.6Z"/>`
  },
  "gear-sunscreen": {
    viewBox: "0 0 24 24",
    title: "防曬乳",
    body: `<title>防曬乳</title>
  <rect fill="currentColor" stroke-width="0" x="9.3" y="2.4" width="5.4" height="3" rx="1.2" ry="1.2"/> <path fill="none" stroke-width="2.5" stroke="#C1832E" stroke-linecap="round" stroke-linejoin="round" d="M6.2,11.4h11.6"/> <rect stroke="currentColor" fill="none" stroke-width="2.5" x="6.2" y="6.4" width="11.6" height="13.9" rx="2.9" ry="2.9"/>`
  },
  "gear-clothing": {
    viewBox: "0 0 24 24",
    title: "防曬衣物",
    body: `<title>防曬衣物</title>
  <path stroke="#C1832E" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.1,5.7c.8,1.7,3.2,2.6,5.4,1.9,1.1-.3,2-1,2.5-1.9"/> <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" stroke="currentColor" d="M8.1,5.7l-5,2.7,1.9,3.9,1.8-.8v8.4h10.4v-8.4l1.8.8,1.9-3.9-5-2.7"/>`
  },
  "gear-sunglasses": {
    viewBox: "0 0 24 24",
    title: "太陽眼鏡",
    body: `<title>太陽眼鏡</title>
  <path fill="none" stroke-width="2.5" stroke="#C1832E" stroke-linecap="round" stroke-linejoin="round" d="M10,11.8c1.5-1,2.5-1,4,0"/> <circle stroke="currentColor" fill="none" stroke-width="2.5" cx="6.2" cy="12.7" r="3.9"/> <circle stroke="currentColor" fill="none" stroke-width="2.5" cx="17.8" cy="12.7" r="3.9"/>`
  },
  "gear-hat": {
    viewBox: "0 0 24 24",
    title: "帽子",
    body: `<title>帽子</title>
  <path stroke="#C1832E" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6.8,14.1h10.4"/> <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" stroke="currentColor" d="M6.8,14.8c0-3.2,2.3-5.8,5.2-5.8s5.2,2.6,5.2,5.8"/> <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" stroke="currentColor" d="M3.2,16.1h17.6"/>`
  },
  "gear-umbrella": {
    viewBox: "0 0 24 24",
    title: "陽傘",
    body: `<title>陽傘</title>
  <circle fill="#C1832E" stroke-width="0" cx="12" cy="4.5" r="1.7"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12,6.2"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12,5.1"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.2,14c0-4.3,3.5-7.8,7.8-7.8,4.3,0,7.8,3.5,7.8,7.8H4.2Z"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12,14v5.2c0,1.2-1.1,2-2.2,1.9-.4,0-.8-.2-1.2-.4"/>`
  },
  "gear-other": {
    viewBox: "0 0 24 24",
    title: "其他裝備",
    body: `<title>其他裝備</title>
  <path fill="none" stroke-width="2.5" stroke="#C1832E" stroke-linecap="round" stroke-linejoin="round" d="M8.8,9.3v-1.5c0-1.4,1.4-2.5,3.2-2.5,1.8,0,3.2,1.1,3.2,2.5v1.5"/> <rect stroke="currentColor" fill="none" stroke-width="2.5" x="4.2" y="9.3" width="15.6" height="10.8" rx="2.6" ry="2.6"/>`
  },
  "education-uv-basics": {
    viewBox: "0 0 24 24",
    title: "了解今天的 UV",
    body: `<title>了解今天的 UV</title>
  <g transform="translate(-0.25 -0.25)"><circle cx="10.6" cy="10.6" r="2.4" fill="#C1832E"/><circle cx="10.6" cy="10.6" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M15 15L20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`
  },
  "education-before-going-out": {
    viewBox: "0 0 24 24",
    title: "出門前準備",
    body: `<title>出門前準備</title>
  <g transform="translate(1.55 0)"><circle cx="8.4" cy="12" r="1.5" fill="#C1832E"/><path d="M16.9 4.2H4.1V19.8H16.9V4.2Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`
  },
  "education-reapply": {
    viewBox: "0 0 24 24",
    title: "外出中的補擦",
    body: `<title>外出中的補擦</title>
  <circle fill="none" stroke-width="2.5" stroke="currentColor" cx="12" cy="12" r="8"/> <path fill="none" stroke-width="2.5" stroke="#C1832E" stroke-linecap="round" stroke-linejoin="round" d="M11.9,12h4"/> <path fill="none" stroke-width="2.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M11.9,12v-4.6"/>`
  },
  "education-sweat-and-water": {
    viewBox: "0 0 24 24",
    title: "流汗或碰水後",
    body: `<title>流汗或碰水後</title>
  <path fill="#C1832E" stroke-width="0" d="M12,4.6c-2.7,3.3-2.9,5.3-2.9,6.7s1.3,2.9,2.9,2.9,2.9-1.3,2.9-2.9-.1-3.4-2.9-6.7Z"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.2,17c1.3-1.1,2.6-1.1,3.9,0,1.3,1.1,2.6,1.1,3.9,0s2.6-1.1,3.9,0c1.3,1.1,2.6,1.1,3.9,0"/>`
  },
  "education-after-sun-care": {
    viewBox: "0 0 24 24",
    title: "回家後與皮膚照顧",
    body: `<title>回家後與皮膚照顧</title>
  <path stroke="#C1832E" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.7,4.3v4.2M15.6,6.4h4.2"/> <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" stroke="currentColor" d="M8.9,4.7c-4.4,1.6-6.6,6.4-5,10.8,1.6,4.4,6.4,6.6,10.8,5,2.3-.9,4.1-2.7,5-5-4.4,1.6-9.2-.6-10.8-5-.7-1.9-.7-3.9,0-5.8Z"/>`
  },
  "education-special-situations": {
    viewBox: "0 0 24 24",
    title: "特殊情況",
    body: `<title>特殊情況</title>
  <path fill="#C1832E" stroke-width="0" d="M7.6,5.6h10.7l-2,4,2,4H7.6v-8Z"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7.6,4.1v16"/>`
  },
  "tool-arrow-right": {
    viewBox: "0 0 24 24",
    title: "前往",
    body: `<title>前往</title>
  <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M5.9 12H17"/> <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M13 6.5L18.5 12L13 17.5"/>`
  },
  "tool-arrow-left": {
    viewBox: "0 0 24 24",
    title: "返回",
    body: `<title>返回</title>
  <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M18.1 12H7"/> <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M11 6.5L5.5 12L11 17.5"/>`
  },
  "tool-arrow-down": {
    viewBox: "0 0 24 24",
    title: "向下",
    body: `<title>向下</title>
  <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M12 5.9V17"/> <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M6.5 13L12 18.5L17.5 13"/>`
  },
  "tool-chevron-down": {
    viewBox: "0 0 24 24",
    title: "展開",
    body: `<title>展開</title>
  <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M6 9.2L12 15.2L18 9.2"/>`
  },
  "tool-chevron-right": {
    viewBox: "0 0 24 24",
    title: "進入",
    body: `<title>進入</title>
  <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M9.2 6L15.2 12L9.2 18"/>`
  },
  "tool-close": {
    viewBox: "0 0 24 24",
    title: "關閉",
    body: `<title>關閉</title>
  <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M6 6L18 18"/> <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M18 6L6 18"/>`
  },
  "tool-plus": {
    viewBox: "0 0 24 24",
    title: "新增",
    body: `<title>新增</title>
  <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M12 6V18"/> <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M6 12H18"/>`
  },
  "tool-download": {
    viewBox: "0 0 24 24",
    title: "匯出",
    body: `<title>匯出</title>
  <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M15.2 5H7.7A2.5 2.5 0 0 0 5.2 7.5V16.5A2.5 2.5 0 0 0 7.7 19H15.2"/> <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M10.7 12H18.1"/> <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M15.6 8.5L19.1 12L15.6 15.5"/>`
  },
  "tool-refresh": {
    viewBox: "0 0 24 24",
    title: "重新整理",
    body: `<title>重新整理</title>
  <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" d="M18.5 11.45A6.6 6.6 0 1 1 12 6"/> <path fill="currentColor" d="M11.4 3.4L16.4 6L11.4 8.6Z"/>`
  },
  "tool-reset": {
    viewBox: "0 0 24 24",
    title: "重置",
    body: `<title>重置</title>
  <path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" d="M5.5 11.45A6.6 6.6 0 1 0 12 6"/> <path fill="currentColor" d="M12.6 3.4L7.6 6L12.6 8.6Z"/>`
  },
  "tool-loading": {
    viewBox: "0 0 24 24",
    title: "載入中",
    body: `<title>載入中</title>
  <path d="M12 4.25A7.75 7.75 0 1 1 4.25 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`
  },
  "tool-edit": {
    viewBox: "0 0 24 24",
    title: "編輯",
    body: `<title>編輯</title>
  <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" stroke-linejoin="round" d="M15.5,5.6l3.7,3.7-9.1,9.1-4.1.9.9-4.1L15.5,5.6Z"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" d="M13,8.4l3.6,3.5"/>`
  },
  "tool-delete": {
    viewBox: "0 0 24 24",
    title: "刪除",
    body: `<title>刪除</title>
  <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" d="M4.4,8.4h15.2"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" stroke-linejoin="round" d="M9.4,8.4v-2.3c0-.7.6-1.3,1.3-1.3h2.6c.7,0,1.3.6,1.3,1.3h0v2.3"/> <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.5" stroke-linejoin="round" d="M6.5,8.4l.8,10.5c.1,1,.9,1.7,1.9,1.7h5.6c1,0,1.8-.7,1.9-1.7l.8-10.5"/>`
  },
  "tool-share": {
    viewBox: "0 0 24 24",
    title: "分享",
    body: `<title>分享</title>
  <path d="M5.8 12L18.2 5.9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/> <path d="M5.8 12L18.2 18.1" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/> <circle cx="5.8" cy="12" r="2.75" fill="currentColor"/> <circle cx="18.2" cy="5.9" r="2.75" fill="currentColor"/> <circle cx="18.2" cy="18.1" r="2.75" fill="currentColor"/>`
  },
  "tool-favorite": {
    viewBox: "0 0 24 24",
    title: "收藏",
    body: `<title>收藏</title>
  <path d="M5.8 3.9H18.2A0.9 0.9 0 0 1 19.1 4.8V20.1L12 15.5L4.9 20.1V4.8A0.9 0.9 0 0 1 5.8 3.9Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  "feature-uv-forecast": {
    viewBox: "0 0 24 24",
    title: "五日 UV 預報",
    body: `<title>五日 UV 預報</title>
  <circle cx="12" cy="11.8" r="3.7" fill="#C1832E"/> <path d="M12 5.8L12 3.6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/> <path d="M17.2 8.8L19.1 7.7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/> <path d="M17.2 14.8L19.1 15.9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/> <path d="M12 17.8L12 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/> <path d="M6.8 14.8L4.9 15.9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/> <path d="M6.8 8.8L4.9 7.7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`
  },
  "feature-region": {
    viewBox: "0 0 24 24",
    title: "地區",
    body: `<title>地區</title>
  <circle cx="12" cy="9.9" r="2.3" fill="#C1832E"/> <path d="M12 20.6C12 20.6 18.4 14.9 18.4 9.9A6.4 6.4 0 0 0 5.6 9.9C5.6 14.9 12 20.6 12 20.6Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  "feature-protection-summary": {
    viewBox: "0 0 24 24",
    title: "快速防護摘要",
    body: `<title>快速防護摘要</title>
  <path d="M13.6 3.8L6.4 13.3L12.1 13.4L12.7 10.8Z" fill="#C1832E" stroke="#C1832E" stroke-width="2.5" stroke-linejoin="round"/> <path d="M11.7 13.3L10.4 20.2L17.6 10.7L12.3 10.7Z" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>`
  },
  "feature-setup-steps": {
    viewBox: "0 0 24 24",
    title: "設定流程",
    body: `<title>設定流程</title>
  <rect x="8.8" y="2.6" width="6.4" height="3.4" rx="1.3" ry="1.3" fill="#C1832E"/> <path d="M8.8 4.3H6.9A1.9 1.9 0 0 0 5 6.2V18.8A1.9 1.9 0 0 0 6.9 20.7H17.1A1.9 1.9 0 0 0 19 18.8V6.2A1.9 1.9 0 0 0 17.1 4.3H15.2" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/> <path d="M9 11.4H15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/> <path d="M9 15.8H15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`
  },
  "feature-session-product": {
    viewBox: "0 0 24 24",
    title: "本次使用的防曬乳",
    body: `<title>本次使用的防曬乳</title>
  <circle cx="8.8" cy="8.8" r="2.3" fill="#C1832E"/> <path d="M11.2 3.5H5.9A2.4 2.4 0 0 0 3.5 5.9V11.2A2 2 0 0 0 4.1 12.6L11.6 20.1A2.4 2.4 0 0 0 15 20.1L20.1 15A2.4 2.4 0 0 0 20.1 11.6L12.6 4.1A2 2 0 0 0 11.2 3.5Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  "feature-locate": {
    viewBox: "0 0 24 24",
    title: "取得目前位置",
    body: `<title>取得目前位置</title>
  <path d="M4.6 11.6L19.4 4.6L12.4 19.4L11.6 11.6Z" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>`
  }
} as const satisfies Record<string, IconEntry>;

export type IconName = keyof typeof ICONS;
