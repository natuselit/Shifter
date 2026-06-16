import { useMemo, useState } from 'react';
import { calculatePay, getDateKey, getTimestampFromDateKey } from '../../entities/shift/model';
import type { Shift } from '../../entities/shift/types';
import { formatDateOnly, formatMoney, formatMonth } from '../../shared/lib/format';
import {
  clearRangeState,
  filterShiftsByRange,
  getNextRangeState,
  getRangeKeys,
  getRangeLabel
} from '../../features/range-select/model';
import { getClearedCalendarSelection, getTodayCalendarSelection } from '../../features/range-select/calendar-selection';
import { useSnapshot } from '../../app/providers/store-provider';
import { getReportText, copyText } from '../../features/copy-report/report';
import { CalendarPanel } from '../../widgets/calendar/calendar-grid';
import { ShiftCard } from '../../widgets/shift-list/shift-card';
import { useToast } from '../../widgets/toast/toast-provider';

function getMonthShifts(shifts: Shift[], monthDate: Date): Shift[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  return shifts.filter((shift) => {
    const startedAt = new Date(shift.startedAt);
    return startedAt.getFullYear() === year && startedAt.getMonth() === month;
  });
}

export function SalaryPage() {
  const { shifts, settings } = useSnapshot();
  const { showToast } = useToast();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(() => getDateKey(new Date()));
  const [rangeState, setRangeState] = useState(clearRangeState);
  const range = getRangeKeys(rangeState);
  const monthShifts = range ? filterShiftsByRange(shifts, rangeState) : getMonthShifts(shifts, visibleMonth);
  const visibleShifts = range
    ? filterShiftsByRange(shifts, rangeState)
    : selectedDateKey
      ? shifts.filter((shift) => getDateKey(shift.startedAt) === selectedDateKey)
      : getMonthShifts(shifts, visibleMonth);
  const shiftDateKeys = useMemo(() => new Set(monthShifts.map((shift) => getDateKey(shift.startedAt))), [monthShifts]);
  const monthTotal = monthShifts.reduce((sum, shift) => sum + calculatePay(shift), 0);
  const selectedTotal = visibleShifts.reduce((sum, shift) => sum + calculatePay(shift), 0);
  const title = range
    ? `Зміни за ${getRangeLabel(rangeState)}`
    : selectedDateKey
      ? `Зміни за ${formatDateOnly(getTimestampFromDateKey(selectedDateKey) || Date.now())}`
      : 'Зміни за місяць';

  function chooseDate(date: Date, dateKey: string) {
    setSelectedDateKey(dateKey);
    setRangeState((current) => getNextRangeState(current, dateKey));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  function applyCalendarSelection(selection: ReturnType<typeof getTodayCalendarSelection>) {
    setSelectedDateKey(selection.selectedDateKey);
    setRangeState(selection.rangeState);
    setVisibleMonth(selection.visibleMonth);
  }

  async function copyDayReport() {
    if (!selectedDateKey && !range) {
      showToast('Оберіть день у календарі', 'info');
      return;
    }

    const titleText = range
      ? `Звіт за ${getRangeLabel(rangeState)}`
      : `Звіт за ${formatDateOnly(getTimestampFromDateKey(selectedDateKey || getDateKey(new Date())) || Date.now())}`;
    const ok = await copyText(getReportText(visibleShifts, titleText, settings.surname));
    showToast(
      ok ? (range ? 'Звіт періоду скопійовано' : 'Звіт дня скопійовано') : 'Не вдалося скопіювати',
      ok ? 'success' : 'error'
    );
  }

  async function copyMonthReport() {
    const titleText = range ? `Звіт за ${getRangeLabel(rangeState)}` : `Звіт за ${formatMonth(visibleMonth)}`;
    const ok = await copyText(getReportText(monthShifts, titleText, settings.surname));
    showToast(
      ok ? (range ? 'Звіт періоду скопійовано' : 'Звіт місяця скопійовано') : 'Не вдалося скопіювати',
      ok ? 'success' : 'error'
    );
  }

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Підсумки оплат</p>
        <h1>Зарплата</h1>
      </header>
      <section className="panel dashboard-summary salary-summary">
        <div className="summary-metric">
          <span>За місяць/період</span>
          <strong>{formatMoney(monthTotal)}</strong>
        </div>
        <div className="summary-metric">
          <span>Обрано</span>
          <strong>{formatMoney(selectedTotal)}</strong>
        </div>
      </section>
      <CalendarPanel
        visibleMonth={visibleMonth}
        selectedDateKey={selectedDateKey}
        rangeState={rangeState}
        shiftDateKeys={shiftDateKeys}
        ariaLabel="Календар зарплати"
        onMonthChange={setVisibleMonth}
        onDateClick={chooseDate}
        actions={[
          {
            label: 'Сьогодні',
            onClick: () => applyCalendarSelection(getTodayCalendarSelection())
          },
          {
            label: 'Місяць',
            onClick: () => applyCalendarSelection(getClearedCalendarSelection(visibleMonth))
          },
          {
            label: 'Скинути',
            onClick: () => applyCalendarSelection(getClearedCalendarSelection(visibleMonth))
          }
        ]}
        secondaryActions={[
          { label: 'Копіювати день', onClick: () => void copyDayReport() },
          { label: 'Копіювати місяць', onClick: () => void copyMonthReport() }
        ]}
      />
      <section className="panel">
        <h2>{title}</h2>
        <ul className="history">
          {visibleShifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} />
          ))}
        </ul>
        <p className="empty" hidden={visibleShifts.length > 0}>
          {range
            ? 'За цей період записів немає.'
            : selectedDateKey
              ? 'За цей день записів немає.'
              : 'За цей місяць записів немає.'}
        </p>
      </section>
    </main>
  );
}
