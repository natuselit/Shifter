import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSnapshot, useStore } from '../../app/providers/store-provider';
import { accentColorPresets } from '../../entities/settings/model';
import type { AccentColor } from '../../entities/settings/types';
import { exportBackup, importBackup } from '../../features/backup-data/backup-data';
import { useToast } from '../../widgets/toast/toast-provider';
import { saveSettingsValues, type SettingsFormValues } from '../../features/settings-form/save-settings';
import {
  getNotificationPermission,
  requestNotificationPermission
} from '../../features/notifications/notification-service';
import { normalizeNonNegativeNumber } from '../../shared/lib/number';

export function SettingsPage() {
  const { settings } = useSnapshot();
  const { refresh } = useStore();
  const { showToast } = useToast();
  const [surname, setSurname] = useState(settings.surname);
  const [rate, setRate] = useState(settings.rate ? String(settings.rate) : '');
  const [startHoldSeconds, setStartHoldSeconds] = useState(String(settings.startHoldSeconds));
  const [endHoldSeconds, setEndHoldSeconds] = useState(String(settings.endHoldSeconds));
  const [accentColor, setAccentColor] = useState<AccentColor>(settings.accentColor);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);
  const [shiftEndReminderEnabled, setShiftEndReminderEnabled] = useState(settings.shiftEndReminderEnabled);
  const [shiftEndReminderHours, setShiftEndReminderHours] = useState(String(settings.shiftEndReminderHours));
  const [shiftEndReminderRepeatMinutes, setShiftEndReminderRepeatMinutes] = useState(
    String(settings.shiftEndReminderRepeatMinutes)
  );
  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationPermission());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSurname(settings.surname);
    setRate(settings.rate ? String(settings.rate) : '');
    setStartHoldSeconds(String(settings.startHoldSeconds));
    setEndHoldSeconds(String(settings.endHoldSeconds));
    setAccentColor(settings.accentColor);
    setNotificationsEnabled(settings.notificationsEnabled);
    setShiftEndReminderEnabled(settings.shiftEndReminderEnabled);
    setShiftEndReminderHours(String(settings.shiftEndReminderHours));
    setShiftEndReminderRepeatMinutes(String(settings.shiftEndReminderRepeatMinutes));
    setNotificationPermission(getNotificationPermission());
  }, [
    settings.accentColor,
    settings.endHoldSeconds,
    settings.notificationsEnabled,
    settings.rate,
    settings.shiftEndReminderEnabled,
    settings.shiftEndReminderHours,
    settings.shiftEndReminderRepeatMinutes,
    settings.startHoldSeconds,
    settings.surname
  ]);

  function save(
    next: SettingsFormValues = {
      surname,
      rate: normalizeNonNegativeNumber(rate),
      startHoldSeconds,
      endHoldSeconds,
      accentColor,
      notificationsEnabled,
      shiftEndReminderEnabled,
      shiftEndReminderHours,
      shiftEndReminderRepeatMinutes
    }
  ) {
    const normalized = saveSettingsValues(next);
    setStartHoldSeconds(String(normalized.startHoldSeconds));
    setEndHoldSeconds(String(normalized.endHoldSeconds));
    setShiftEndReminderHours(String(normalized.shiftEndReminderHours));
    setShiftEndReminderRepeatMinutes(String(normalized.shiftEndReminderRepeatMinutes));
    refresh();
  }

  function getBaseSettingsFormValues(): SettingsFormValues {
    return {
      surname,
      rate: normalizeNonNegativeNumber(rate),
      startHoldSeconds: Number(startHoldSeconds),
      endHoldSeconds: Number(endHoldSeconds),
      accentColor,
      notificationsEnabled,
      shiftEndReminderEnabled,
      shiftEndReminderHours: Number(shiftEndReminderHours),
      shiftEndReminderRepeatMinutes: Number(shiftEndReminderRepeatMinutes)
    };
  }

  async function enableSystemNotifications() {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    const enabled = permission === 'granted';
    setNotificationsEnabled(enabled);
    save({ ...getBaseSettingsFormValues(), notificationsEnabled: enabled });
    showToast(enabled ? 'Системні сповіщення увімкнено' : 'Сповіщення не дозволено', enabled ? 'success' : 'error');
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;

    try {
      await importBackup(file);
      refresh();
      showToast('Дані імпортовано', 'success');
    } catch {
      showToast('Не вдалося імпортувати JSON', 'error');
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Дані працівника</p>
        <h1>Налаштування</h1>
      </header>
      <section className="panel settings">
        <label>
          Прізвище
          <input
            value={surname}
            onChange={(event) => {
              const value = event.target.value;
              setSurname(value);
              save({
                ...getBaseSettingsFormValues(),
                surname: value
              });
            }}
            type="text"
            autoComplete="family-name"
            placeholder="Прізвище"
          />
        </label>
        <label>
          Базова ставка, грн/год
          <input
            value={rate}
            onChange={(event) => {
              const value = event.target.value;
              setRate(value);
              save({
                ...getBaseSettingsFormValues(),
                rate: normalizeNonNegativeNumber(value)
              });
            }}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0"
          />
        </label>
        <div className="accent-control">
          <span>Акцентний колір</span>
          <div className="accent-swatches" aria-label="Акцентний колір">
            {accentColorPresets.map((preset) => (
              <button
                key={preset.id}
                className={`accent-swatch ${accentColor === preset.id ? 'selected' : ''}`}
                type="button"
                aria-pressed={accentColor === preset.id}
                aria-label={preset.label}
                title={preset.label}
                style={{ '--swatch-color': preset.primary } as CSSProperties}
                onClick={() => {
                  setAccentColor(preset.id);
                  save({
                    ...getBaseSettingsFormValues(),
                    accentColor: preset.id
                  });
                }}
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        <label>
          Затримка початку, с
          <input
            value={startHoldSeconds}
            onChange={(event) => setStartHoldSeconds(event.target.value)}
            onBlur={() => save()}
            type="number"
            min="1"
            max="10"
            step="1"
            inputMode="numeric"
            placeholder="3"
          />
        </label>
        <label>
          Затримка виходу, с
          <input
            value={endHoldSeconds}
            onChange={(event) => setEndHoldSeconds(event.target.value)}
            onBlur={() => save()}
            type="number"
            min="1"
            max="10"
            step="1"
            inputMode="numeric"
            placeholder="5"
          />
        </label>
        <div className="data-tools">
          <strong>Сповіщення</strong>
          <div className="notification-status">
            <span>
              {notificationPermission === 'unsupported'
                ? 'Не підтримуються'
                : notificationPermission === 'granted'
                  ? 'Системні сповіщення дозволено'
                  : notificationPermission === 'denied'
                    ? 'Системні сповіщення заблоковано'
                    : 'Системні сповіщення не увімкнено'}
            </span>
            {notificationPermission !== 'unsupported' && notificationPermission !== 'granted' && (
              <button className="clear save-action" type="button" onClick={() => void enableSystemNotifications()}>
                Увімкнути
              </button>
            )}
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={shiftEndReminderEnabled}
              onChange={(event) => {
                const checked = event.target.checked;
                setShiftEndReminderEnabled(checked);
                save({ ...getBaseSettingsFormValues(), shiftEndReminderEnabled: checked });
              }}
            />
            Нагадувати завершити зміну
          </label>
          <label>
            Нагадати після, год
            <input
              value={shiftEndReminderHours}
              onChange={(event) => setShiftEndReminderHours(event.target.value)}
              onBlur={() => save()}
              type="number"
              min="1"
              max="16"
              step="1"
              inputMode="numeric"
              placeholder="8"
              disabled={!shiftEndReminderEnabled}
            />
          </label>
          <label>
            Повторювати кожні, хв
            <input
              value={shiftEndReminderRepeatMinutes}
              onChange={(event) => setShiftEndReminderRepeatMinutes(event.target.value)}
              onBlur={() => save()}
              type="number"
              min="5"
              max="120"
              step="5"
              inputMode="numeric"
              placeholder="15"
              disabled={!shiftEndReminderEnabled}
            />
          </label>
        </div>
        <div className="data-tools">
          <strong>Дані</strong>
          <div className="calendar-actions">
            <button
              className="clear"
              type="button"
              onClick={() => {
                exportBackup();
                showToast('JSON експортовано', 'success');
              }}
            >
              Експорт JSON
            </button>
            <button className="clear" type="button" onClick={() => fileInputRef.current?.click()}>
              Імпорт JSON
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              void handleImport(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </div>
        <p className="saved">Збережено автоматично</p>
      </section>
    </main>
  );
}
