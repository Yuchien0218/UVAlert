/**
 * 讓瀏覽器把文字內容存成檔案。
 *
 * 用 Blob URL 而不是 data: URL，匯出的 Session 歷史可能有數 MB，
 * data: URL 在部分瀏覽器有長度上限。
 */
export function downloadTextFile(fileName: string, contents: string): void {
  const blob = new Blob([contents], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // 立刻 revoke 會讓部分瀏覽器來不及開始下載。
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
