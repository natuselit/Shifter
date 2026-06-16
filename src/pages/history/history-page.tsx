import { useEffect, useMemo, useState } from 'react';
import { detectShiftType, getDateKey, getTimestampFromDateKey } from '../../entities/shift/model';
import type { ActiveShift, Shift } from '../../entities/shift/types';
import { formatDateOnly } from '../../shared/lib/format';
import {
  clearRangeState,
  filterShiftsByRange,
  getNextRangeState,
  getRangeKeys,
  getRangeLabel
} from '../../features/range-select/model';
import { storage } from '../../shared/storage/local-storage';
import { useSnapshot, useStore } from '../../app/providers/store-provider';
import { EditShiftForm, getDefaultNewShift } from '../../features/edit-shift/edit-shift-form';
import { CalendarPanel } from '../../widgets/calendar/calendar-grid';
import { ShiftCard } from '../../widgets/shift-list/shift-card';
import { useToast } from '../../widgets/toast/toast-provider';
import { useConfirm } from '../../shared/ui/confirm-provider';

type HistoryFilter = 'all' | 'shift-1' | 'shift-2' | 'off' | 'x15' | 'x2' | 'week';

const filters: Array<{ value: HistoryFilter; label: string }> = [
  { value: 'all', label: 'Усі' },
  { value: 'shift-1', label: '1 зміна' },
  { value: 'shift-2', label: '2 зміна' },
  { value: 'off', label: 'Поза графіком' },
  { value: 'x15', label: 'x1.5' },
  { value: 'x2', label: 'x2' },
  { value: 'week', label: 'Цей тиждень' }
];

function getWeekStart(date = new Date()): number {
  const weekStart = new Date(date);
  const offset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - offset);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.getTime();
}

function matchesHistoryFilter(shift: Shift | ActiveShift, filter: HistoryFilter): boolean {
  const shiftType = shift.shiftType || detectShiftType(shift.startedAt);
  const multiplier = shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1);

  if (filter === 'shift-1') return shiftType === '1 зміна';
  if (filter === 'shift-2') return shiftType === '2 зміна';
  if (filter === 'off') return shiftType === 'Поза графіком';
  if (filter === 'x15') return multiplier === 1.5;
  if (filter === 'x2') return multiplier === 2;
  if (filter === 'week') {
    const weekStart = getWeekStart();
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    return shift.startedAt >= weekStart && shift.startedAt < weekEnd;
  }

  return true;
}

export function HistoryPage() {
  const { settings, shifts, startedAt, activeRate, rateMultiplier, refresh } = useSnapshot();
  const { refresh: forceRefresh } = useStore();
  const { showToast } = useToast();
  const { confirmAction } = useConfirm();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [rangeState, setRangeState] = useState(clearRangeState);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [creatingShift, setCreatingShift] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>('all');

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (storage.startedAt && !editingShiftId) refresh();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [editingShiftId, refresh]);

  const activeShift: ActiveShift | null = startedAt
    ? {
        id: '__active_shift__',
        active: true,
        startedAt,
        endedAt: Date.now(),
        rate: activeRate ?? settings.rate,
        shiftType: detectShiftType(startedAt),
        rateMultiplier,
        doubleRate: rateMultiplier === 2
      }
    : null;
  const allHistoryShifts = activeShift ? [activeShift, ...shifts] : shifts;
  const shiftDateKeys = useMemo(() => {
    const keys = new Set(shifts.map((shift) => getDateKey(shift.startedAt)));
    if (startedAt) keys.add(getDateKey(startedAt));
    return keys;
  }, [shifts, startedAt]);
  const range = getRangeKeys(rangeState);
  const rangedShifts = filterShiftsByRange(allHistoryShifts, rangeState);
  const dateFilteredShifts = range
    ? rangedShifts
    : selectedDateKey
      ? allHistoryShifts.filter((shift) => getDateKey(shift.startedAt) === selectedDateKey)
      : allHistoryShifts;
  const filteredShifts = dateFilteredShifts.filter((shift) => matchesHistoryFilter(shift, filter));
  const rangeLabel = getRangeLabel(rangeState);
  const title = rangeLabel
    ? `Зміни за ${rangeLabel}`
    : selectedDateKey
      ? `Зміни за ${formatDateOnly(getTimestampFromDateKey(selectedDateKey) || Date.now())}`
      : 'Усі зміни';
  const fullTitle =
    filter === 'all' ? title : `${title} · ${filters.find((item) => item.value === filter)?.label || 'Усі'}`;

  function chooseDate(date: Date, dateKey: string) {
    setSelectedDateKey(dateKey);
    setRangeState((current) => getNextRangeState(current, dateKey));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setCreatingShift(false);
  }

  async function clearHistory() {
    if (!(await confirmAction('Очистити всю історію?'))) return;
    storage.shifts = [];
    storage.lastShift = null;
    setSelectedDateKey(null);
    setRangeState(clearRangeState());
    setCreatingShift(false);
    setEditingShiftId(null);
    forceRefresh();
    showToast('Історію очищено', 'success');
  }

  async function deleteShift(shift: Shift) {
    if (!(await confirmAction('Видалити цю зміну?'))) return;
    const nextShifts = storage.shifts.filter((savedShift) => savedShift.id !== shift.id);
    storage.shifts = nextShifts;
    storage.lastShift = nextShifts[0] || null;
    if (editingShiftId === shift.id) setEditingShiftId(null);
    forceRefresh();
    showToast('Зміну видалено', 'success');
  }

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Записи змін</p>
        <h1>Історія</h1>
      </header>
      <CalendarPanel
        visibleMonth={visibleMonth}
        selectedDateKey={selectedDateKey}
        rangeState={rangeState}
        shiftDateKeys={shiftDateKeys}
        ariaLabel="Календар"
        onMonthChange={(month) => {
          setVisibleMonth(month);
          setCreatingShift(false);
        }}
        onDateClick={chooseDate}
      >
        <div className="filter-actions" aria-label="Фільтри історії">
          {filters.map((item) => (
            <button
              key={item.value}
              className={`filter-chip ${filter === item.value ? 'active' : ''}`}
              type="button"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CalendarPanel>
      {creatingShift && (
        <section className="panel create-shift-panel">
          <EditShiftForm
            mode="create"
            shift={getDefaultNewShift(selectedDateKey, settings.rate)}
            onCancel={() => setCreatingShift(false)}
            onSaved={(shift) => {
              setCreatingShift(false);
              setSelectedDateKey(getDateKey(shift.startedAt));
              setVisibleMonth(
                new Date(new Date(shift.startedAt).getFullYear(), new Date(shift.startedAt).getMonth(), 1)
              );
            }}
          />
        </section>
      )}
      <section className="panel">
        <div className="section-header">
          <h2>{fullTitle}</h2>
          <div className="section-actions">
            <button
              className="clear save-action"
              type="button"
              disabled={creatingShift}
              onClick={() => {
                setCreatingShift(true);
                setEditingShiftId(null);
              }}
            >
              Додати
            </button>
            <button className="clear" type="button" disabled={shifts.length === 0} onClick={() => void clearHistory()}>
              Очистити
            </button>
          </div>
        </div>
        <ul className="history">
          {filteredShifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              showActions
              onEdit={() => {
                setCreatingShift(false);
                setEditingShiftId(shift.id);
              }}
              onDelete={() => !('active' in shift) && void deleteShift(shift)}
            >
              {editingShiftId === shift.id && (
                <EditShiftForm
                  mode={'active' in shift ? 'active' : 'edit'}
                  shift={shift}
                  onCancel={() => setEditingShiftId(null)}
                  onSaved={(savedShift) => {
                    setEditingShiftId(null);
                    setSelectedDateKey(getDateKey(savedShift.startedAt));
                    setVisibleMonth(
                      new Date(
                        new Date(savedShift.startedAt).getFullYear(),
                        new Date(savedShift.startedAt).getMonth(),
                        1
                      )
                    );
                  }}
                />
              )}
            </ShiftCard>
          ))}
        </ul>
        <p className="empty" hidden={filteredShifts.length > 0}>
          {range
            ? 'За цей період і фільтр записів немає.'
            : selectedDateKey
              ? 'За цей день і фільтр записів немає.'
              : filter === 'all'
                ? 'Історія порожня.'
                : 'За цим фільтром записів немає.'}
        </p>
      </section>
    </main>
  );
}
