export type NotificationPermissionState = 'unsupported' | NotificationPermission;

export interface NotifyPayload {
  title: string;
  body: string;
  tag: string;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

export function notify(payload: NotifyPayload, showToast: (message: string, type?: 'info') => void): boolean {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/Shifter/icon.svg'
    });
    showToast(payload.body, 'info');
    return true;
  }

  showToast(payload.body, 'info');
  return false;
}
