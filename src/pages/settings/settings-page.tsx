import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSnapshot, useStore } from '@/entities/app-state';
import { accentColorPresets, type AccentColor } from '@/entities/settings';
import { exportBackup, importBackup } from '@/features/backup-data';
import { saveSettingsValues, type SettingsFormValues } from '@/features/settings-form';
import { normalizeNonNegativeNumber } from '@/shared/lib';
import { useToast } from '@/shared/ui';

export function SettingsPage() {
  const { settings } = useSnapshot();
  const { refresh } = useStore();
  const { showToast } = useToast();
  const [surname, setSurname] = useState(settings.surname);
  const [rate, setRate] = useState(settings.rate ? String(settings.rate) : '');
  const [startHoldSeconds, setStartHoldSeconds] = useState(String(settings.startHoldSeconds));
  const [endHoldSeconds, setEndHoldSeconds] = useState(String(settings.endHoldSeconds));
  const [accentColor, setAccentColor] = useState<AccentColor>(settings.accentColor);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSurname(settings.surname);
    setRate(settings.rate ? String(settings.rate) : '');
    setStartHoldSeconds(String(settings.startHoldSeconds));
    setEndHoldSeconds(String(settings.endHoldSeconds));
    setAccentColor(settings.accentColor);
  }, [
    settings.accentColor,
    settings.endHoldSeconds,
    settings.rate,
    settings.startHoldSeconds,
    settings.surname
  ]);

  function save(
    next: SettingsFormValues = {
      surname,
      rate: normalizeNonNegativeNumber(rate),
      startHoldSeconds,
      endHoldSeconds,
      accentColor
    }
  ) {
    const normalized = saveSettingsValues(next);
    setStartHoldSeconds(String(normalized.startHoldSeconds));
    setEndHoldSeconds(String(normalized.endHoldSeconds));
    refresh();
  }

  function getBaseSettingsFormValues(): SettingsFormValues {
    return {
      surname,
      rate: normalizeNonNegativeNumber(rate),
      startHoldSeconds: Number(startHoldSeconds),
      endHoldSeconds: Number(endHoldSeconds),
      accentColor
    };
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
