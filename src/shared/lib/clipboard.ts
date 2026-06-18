export async function copyText(text: string): Promise<boolean> {
  const normalizedText = String(text || '').trim();
  if (!normalizedText) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(normalizedText);
      return true;
    }
  } catch {
    // Fall back to the legacy selection-based copy below.
  }

  if (!document.queryCommandSupported?.('copy')) return false;

  const textArea = document.createElement('textarea');
  textArea.value = normalizedText;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.left = '-9999px';
  document.body.append(textArea);
  textArea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textArea.remove();
  }
}
