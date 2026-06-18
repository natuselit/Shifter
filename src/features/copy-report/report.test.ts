import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '@/shared/lib';
import { buildReportText } from './report';

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

describe('buildReportText', () => {
  it('builds report summary with shift rows', () => {
    const text = buildReportText({
      title: 'Звіт за червень',
      shifts: [
        {
          id: '1',
          startedAt: new Date(2026, 5, 15, 6, 30).getTime(),
          endedAt: new Date(2026, 5, 15, 14, 30).getTime(),
          rate: 100,
          shiftType: '1 зміна',
          rateMultiplier: 1,
          doubleRate: false
        }
      ]
    });

    expect(text).toContain('Звіт за червень');
    expect(text).toContain('Зміни: 1');
    expect(text).toContain('1 зміна');
  });
});
