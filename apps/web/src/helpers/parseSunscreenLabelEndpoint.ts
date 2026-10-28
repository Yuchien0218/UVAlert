import { readConfiguredEnvironmentValue } from "../adapters/configuredEnvironment";

const PRODUCTION_SUPABASE_EDGE_FUNCTION =
  "https://ykfdnltaqpdytmrszbbk.supabase.co/functions/v1/parse-sunscreen-label";

/**
 * 解析防曬乳包裝拍照辨識之 API 端點。
 *
 * 設計考量：
 * 1. 本地開發環境（Vite dev）支援使用 `/v1/parse-sunscreen-label` proxy。
 * 2. 正式環境（Vercel）若未配置環境變數，直接呼叫 Supabase Edge Function，
 *    避免請求打到 Vercel 靜態主機導致 HTTP 405 Method Not Allowed。
 * 3. 支援透過 VITE_API_BASE_URL 或自訂參數覆蓋端點。
 */
export function resolveParseSunscreenLabelEndpoint(options: {
  baseUrl?: string;
  isDev?: boolean;
} = {}): string {
  const customBase = readConfiguredEnvironmentValue(options.baseUrl);
  if (customBase) {
    const normalized = customBase.replace(/\/+$/, "");
    return `${normalized}/parse-sunscreen-label`;
  }

  const envBase = readConfiguredEnvironmentValue(
    import.meta.env?.VITE_API_BASE_URL
  );

  // 若環境變數有指定完整的 HTTP(S) URL，直接採用
  if (envBase && /^https?:\/\//u.test(envBase)) {
    return `${envBase.replace(/\/+$/, "")}/parse-sunscreen-label`;
  }

  // 開發模式且未指定遠端時，可使用本地 Vite proxy
  const isDev = options.isDev ?? Boolean(import.meta.env?.DEV);
  if (isDev && envBase === "/v1") {
    return "/v1/parse-sunscreen-label";
  }

  // 正式環境一律直連 Supabase Edge Function 端點
  return PRODUCTION_SUPABASE_EDGE_FUNCTION;
}
