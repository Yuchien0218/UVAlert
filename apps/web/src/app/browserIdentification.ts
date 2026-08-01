export function isSamsungInternet(userAgent: string): boolean {
  return /SamsungBrowser\//i.test(userAgent);
}
