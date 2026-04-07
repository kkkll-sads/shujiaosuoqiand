/**
 * 安全复制到剪贴板（兼容 Android >= 5 / iOS >= 10 WebView）
 *
 * 策略：先同步 execCommand（保留用户手势上下文，兼容性最广），
 * 再异步尝试 Clipboard API 作为补充。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  var str = String(text);
  if (!str) return false;

  if (execCommandCopy(str)) return true;

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch {
      /* Clipboard API 不可用，已经尝试过 execCommand */
    }
  }

  return false;
}

function execCommandCopy(text: string): boolean {
  try {
    var el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    // @ts-ignore — contentEditable 在 HTMLTextAreaElement 上类型为 string
    el.contentEditable = 'true';
    el.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:none;outline:none;box-shadow:none;opacity:0';
    document.body.appendChild(el);

    el.focus();
    el.setSelectionRange(0, text.length);

    var ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch (_) {
    return false;
  }
}
