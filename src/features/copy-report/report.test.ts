import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './report';

describe('copyText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('copies through clipboard api', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyText(' hello ')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when clipboard fails', async () => {
    const textArea = {
      value: '',
      style: {},
      setAttribute: vi.fn(),
      select: vi.fn(),
      remove: vi.fn()
    };
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    vi.stubGlobal('document', {
      queryCommandSupported: vi.fn().mockReturnValue(true),
      createElement: vi.fn().mockReturnValue(textArea),
      body: { append: vi.fn() },
      execCommand: vi.fn().mockReturnValue(true)
    });

    await expect(copyText('report')).resolves.toBe(true);
    expect(textArea.value).toBe('report');
    expect(textArea.select).toHaveBeenCalled();
  });

  it('returns false for empty text', async () => {
    await expect(copyText('   ')).resolves.toBe(false);
  });
});
