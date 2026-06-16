import { useEffect, useRef, type ReactNode } from 'react';
import { useSnapshot } from './store-provider';
import { useToast } from '../../widgets/toast/toast-provider';
import { notify } from '../../features/notifications/notification-service';
import { getNextReminderState, type ReminderState } from '../../features/notifications/shift-end-reminder';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { settings, startedAt } = useSnapshot();
  const { showToast } = useToast();
  const reminderStateRef = useRef<ReminderState>({ activeShiftStartedAt: null, lastNotifiedAt: null });

  useEffect(() => {
    const checkReminder = () => {
      const result = getNextReminderState(reminderStateRef.current, settings, startedAt, Date.now());
      reminderStateRef.current = result.state;

      if (result.shouldNotify) {
        notify(
          {
            title: 'Shifter',
            body: 'Активна зміна триває довго. Не забудьте завершити її.',
            tag: 'shift-end-reminder'
          },
          showToast
        );
      }
    };

    checkReminder();
    const interval = window.setInterval(checkReminder, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [settings, showToast, startedAt]);

  return children;
}
