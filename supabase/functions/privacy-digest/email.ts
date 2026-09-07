export type PrivacyDigestItem = {
  feedbackId: string;
  message: string;
  contactEmail: string | null;
  createdAt: string;
};

export type PrivacyDigestEmail = {
  subject: string;
  text: string;
  html: string;
};

export function renderPrivacyDigestEmail(input: {
  digestDate: string;
  items: PrivacyDigestItem[];
}): PrivacyDigestEmail {
  const { digestDate, items } = input;
  const itemText = items.map((item, index) => {
    const contactEmail = item.contactEmail?.trim() || "未提供聯絡信箱";
    return [
      `案件 ${index + 1}（${item.feedbackId}）`,
      `建立時間：${item.createdAt}`,
      `聯絡信箱：${contactEmail}`,
      `訊息：${item.message}`
    ].join("\n");
  });
  const text = [
    `UVAlert 隱私資料請求摘要（${digestDate}）`,
    `案件數：${items.length}`,
    ...itemText
  ].join("\n\n");

  const htmlItems = items
    .map((item, index) => {
      const contactEmail = item.contactEmail?.trim() || "未提供聯絡信箱";
      return [
        "<li>",
        `<p><strong>案件 ${index + 1}</strong>（${escapeHtml(item.feedbackId)}）</p>`,
        `<p>建立時間：${escapeHtml(item.createdAt)}</p>`,
        `<p>聯絡信箱：${escapeHtml(contactEmail)}</p>`,
        `<p>訊息：${escapeHtml(item.message).replaceAll("\n", "<br />")}</p>`,
        "</li>"
      ].join("");
    })
    .join("");
  const html = [
    "<!doctype html>",
    '<html lang="zh-Hant">',
    "<body>",
    `<h1>UVAlert 隱私資料請求摘要</h1>`,
    `<p>日期：${escapeHtml(digestDate)}</p>`,
    `<p>案件數：${items.length}</p>`,
    `<ol>${htmlItems}</ol>`,
    "</body>",
    "</html>"
  ].join("");

  return {
    subject: `UVAlert 隱私資料請求摘要｜${digestDate}`,
    text,
    html
  };
}

export async function sendResendEmail(
  fetch: typeof globalThis.fetch,
  apiKey: string,
  recipient: string,
  email: PrivacyDigestEmail,
  idempotencyKey: string
): Promise<{ messageId: string }> {
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        from: "UVAlert <onboarding@resend.dev>",
        to: [recipient],
        subject: email.subject,
        text: email.text,
        html: email.html
      })
    });
  } catch {
    throw resendSendFailed();
  }

  if (!response.ok) {
    throw resendSendFailed();
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw resendSendFailed();
  }

  const messageId = readMessageId(payload);
  if (messageId === null) {
    throw resendSendFailed();
  }

  return { messageId };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function readMessageId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const id = (payload as { id?: unknown }).id;
  if (typeof id !== "string") return null;
  const trimmedId = id.trim();
  return trimmedId.length > 0 ? trimmedId : null;
}

function resendSendFailed(): Error {
  return new Error("RESEND_SEND_FAILED");
}
