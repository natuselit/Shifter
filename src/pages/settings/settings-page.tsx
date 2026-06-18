import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useSnapshot, useStore } from '@/entities/app-state';
import { exportBackup, importBackup } from '@/features/backup-data';
import { saveSettingsValues, type SettingsFormValues } from '@/features/settings-form';
import { normalizeNonNegativeNumber } from '@/shared/lib';
import { useToast } from '@/shared/ui';

const updatedAtFormatter = new Intl.DateTimeFormat('uk-UA', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return updatedAtFormatter.format(date);
}

export function SettingsPage() {
  const { settings } = useSnapshot();
  const { refresh } = useStore();
  const { showToast } = useToast();
  const [surname, setSurname] = useState(settings.surname);
  const [rate, setRate] = useState(settings.rate ? String(settings.rate) : '');
  const [startHoldSeconds, setStartHoldSeconds] = useState(String(settings.startHoldSeconds));
  const [endHoldSeconds, setEndHoldSeconds] = useState(String(settings.endHoldSeconds));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const appUpdatedAt = formatUpdatedAt(__APP_UPDATED_AT__);

  useEffect(() => {
    setSurname(settings.surname);
    setRate(settings.rate ? String(settings.rate) : '');
    setStartHoldSeconds(String(settings.startHoldSeconds));
    setEndHoldSeconds(String(settings.endHoldSeconds));
  }, [settings.endHoldSeconds, settings.rate, settings.startHoldSeconds, settings.surname]);

  function save(
    next: SettingsFormValues = {
      surname,
      rate: normalizeNonNegativeNumber(rate),
      startHoldSeconds,
      endHoldSeconds,
      accentColor: 'yellow'
    }
  ) {
    const normalized = saveSettingsValues(next);
    setStartHoldSeconds(String(normalized.startHoldSeconds));
    setEndHoldSeconds(String(normalized.endHoldSeconds));
    refresh();
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

  function commitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.currentTarget.blur();
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
            onChange={(event) => setSurname(event.target.value)}
            onBlur={() => save()}
            onKeyDown={commitOnEnter}
            type="text"
            autoComplete="family-name"
            placeholder="Прізвище"
          />
        </label>
        <label>
          Базова ставка, грн/год
          <input
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            onBlur={() => save()}
            onKeyDown={commitOnEnter}
            type="number"
            min="0"
            step="0.001"
            inputMode="decimal"
            placeholder="0"
          />
        </label>
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
        <div className="app-info" aria-label="Інформація про застосунок">
          <strong>Застосунок</strong>
          <div>
            <span>Версія</span>
            <b>v{__APP_VERSION__}</b>
          </div>
          <div>
            <span>Оновлено</span>
            <b>{appUpdatedAt}</b>
          </div>
        </div>
      </section>
    </main>
  );
}
