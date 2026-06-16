import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNotificationPermission, notify } from './notification-service';

describe('notification service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns unsupported when Notification is missing', () => {
    vi.stubGlobal('window', {});

    expect(getNotificationPermission()).toBe('unsupported');
  });

  it('falls back to toast when permission is not granted', () => {
    const showToast = vi.fn();
    const NotificationMock = vi.fn();
    vi.stubGlobal('window', { Notification: NotificationMock });
    vi.stubGlobal('Notification', Object.assign(NotificationMock, { permission: 'default' }));

    expect(notify({ title: 'Title', body: 'Body', tag: 'tag' }, showToast)).toBe(false);
    expect(NotificationMock).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Body', 'info');
  });

  it('shows system notification and toast when permission is granted', () => {
    const showToast = vi.fn();
    const NotificationMock = vi.fn();
    vi.stubGlobal('window', { Notification: NotificationMock });
    vi.stubGlobal('Notification', Object.assign(NotificationMock, { permission: 'granted' }));

    expect(notify({ title: 'Title', body: 'Body', tag: 'tag' }, showToast)).toBe(true);
    expect(NotificationMock).toHaveBeenCalledWith('Title', expect.objectContaining({ body: 'Body', tag: 'tag' }));
    expect(showToast).toHaveBeenCalledWith('Body', 'info');
  });
});
