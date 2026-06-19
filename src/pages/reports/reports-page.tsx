import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type MouseEvent
} from 'react';
import { storage, useSnapshot, useStore } from '@/entities/app-state';
import {
  calculatePay,
  detectShiftType,
  getDateKey,
  getTimestampFromDateKey,
  type ActiveShift,
  type Shift
} from '@/entities/shift';
import { buildReportAnalytics, chartModes, getMonthShifts, type ChartMode } from '@/features/report-analytics';
import {
  clearRangeState,
  filterShiftsByRange,
  getNextRangeState,
  getRangeKeys,
  getRangeLabel
} from '@/features/range-select';
import { EditShiftForm, getDefaultNewShift } from '@/features/edit-shift';
import {
  clearStoredScheduleText,
  formatScheduleTextInput,
  formatSignedHoursMinutes,
  getStoredScheduleText,
  parseScheduleText,
  saveScheduleTextValue,
  syncShiftsWithScheduleEntries,
  type ScheduleParseResult
} from '@/features/schedule-plan';
import {
  formatDateOnly,
  formatHoursMinutes,
  formatMoney,
  formatMonth,
  formatShortDate,
  formatTimeOnly,
  useLiveNow
} from '@/shared/lib';
import { useConfirm, useToast } from '@/shared/ui';
import { CalendarPanel } from '@/widgets/calendar';
import { ShiftCard, VirtualShiftList } from '@/widgets/shift-list';

export type ReportsView = 'shifts' | 'analytics';

type ReportAnalytics = ReturnType<typeof buildReportAnalytics>;

const emptyScheduleParseResult: ScheduleParseResult = { entries: [], errors: [] };
const emptyChartDates: ReportAnalytics['chartDates'] = [];
const emptyDayStats: ReportAnalytics['dayStats'] = new Map();
const emptyScheduleDiffRows: ReportAnalytics['scheduleDiffRows'] = [];
const emptyChartTitle: ReportAnalytics['getChartTitle'] = () => '';
const emptyChartValue: ReportAnalytics['getChartValue'] = () => 0;
const emptyPlannedChartValue: ReportAnalytics['getPlannedChartValue'] = () => 0;
const scheduleParseDebounceMs = 180;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

function formatPlannedScheduleTime(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return '-';
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const normalizedMinutes = String(minutes % 60).padStart(2, '0');
  return `${hours}:${normalizedMinutes}`;
}

function formatPlannedScheduleDuration(milliseconds: number | null | undefined) {
  return milliseconds === null || milliseconds === undefined ? '-' : formatHoursMinutes(milliseconds);
}

function getScheduleDiffClass(milliseconds: number | null) {
  if (milliseconds === null || milliseconds === 0) return 'schedule-diff-result';
  return `schedule-diff-result ${milliseconds > 0 ? 'schedule-diff-plus' : 'schedule-diff-minus'}`;
}

const ScheduleDiffList = memo(function ScheduleDiffList({
  rows
}: {
  rows: Array<{
    dateKey: string;
    timestamp: number;
    endedAt: number;
    entry:
      | {
          plannedInMinutes: number | null;
          plannedOutMinutes: number | null;
          plannedTotalMs: number | null;
        }
      | undefined;
    diff: { totalDiffMs: number | null; inDiffMs: number | null; outDiffMs: number | null };
  }>;
}) {
  if (rows.length === 0) {
    return (
      <ul className="analytics-list">
        <li>
          <span>Розбіжностей немає</span>
          <strong>0</strong>
        </li>
      </ul>
    );
  }

  return (
    <ul className="schedule-diff-summary">
      {rows.map((item) => (
        <li key={item.dateKey}>
          <span className="schedule-diff-date">
            {formatDateOnly(getTimestampFromDateKey(item.dateKey) || item.timestamp)}
          </span>
          <div className="schedule-diff-table">
            <span></span>
            <span>План</span>
            <span>Факт</span>
            <span>Різниця</span>

            <strong>Разом</strong>
            <b>{formatPlannedScheduleDuration(item.entry?.plannedTotalMs)}</b>
            <b>{formatHoursMinutes(Math.max(0, item.endedAt - item.timestamp))}</b>
            <b className={getScheduleDiffClass(item.diff.totalDiffMs)}>
              {formatSignedHoursMinutes(item.diff.totalDiffMs)}
            </b>

            <strong>Прихід</strong>
            <b>{formatPlannedScheduleTime(item.entry?.plannedInMinutes)}</b>
            <b>{formatTimeOnly(item.timestamp)}</b>
            <b className={getScheduleDiffClass(item.diff.inDiffMs)}>{formatSignedHoursMinutes(item.diff.inDiffMs)}</b>

            <strong>Вихід</strong>
            <b>{formatPlannedScheduleTime(item.entry?.plannedOutMinutes)}</b>
            <b>{formatTimeOnly(item.endedAt)}</b>
            <b className={getScheduleDiffClass(item.diff.outDiffMs)}>
              {formatSignedHoursMinutes(item.diff.outDiffMs)}
            </b>
          </div>
        </li>
      ))}
    </ul>
  );
});

function LiveActiveShiftCard({ shift, onEdit }: { shift: ActiveShift; onEdit: (shift: Shift | ActiveShift) => void }) {
  const now = useLiveNow(true, 60_000);
  const liveShift = useMemo(() => ({ ...shift, endedAt: now }), [now, shift]);

  return <ShiftCard shift={liveShift} showActions onEdit={onEdit} />;
}

export function ReportsPage({ view = 'shifts' }: { view?: ReportsView }) {
  const { settings, shifts, startedAt, activeRate, rateMultiplier } = useSnapshot();
  const { refresh: forceRefresh } = useStore();
  const { showToast } = useToast();
  const { confirmAction } = useConfirm();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [rangeState, setRangeState] = useState(clearRangeState);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [creatingShift, setCreatingShift] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('pay');
  const [scheduleText, setScheduleText] = useState(() => (view === 'analytics' ? getStoredScheduleText() : ''));
  const debouncedScheduleText = useDebouncedValue(scheduleText, scheduleParseDebounceMs);
  const deferredScheduleText = useDeferredValue(debouncedScheduleText);

  useEffect(() => {
    if (view !== 'analytics') return;
    setScheduleText((current) => current || getStoredScheduleText());
  }, [view]);

  const range = useMemo(() => getRangeKeys(rangeState), [rangeState]);
  const rangeLabel = useMemo(() => getRangeLabel(rangeState), [rangeState]);
  const activeShift = useMemo<ActiveShift | null>(
    () =>
      startedAt
        ? {
            id: '__active_shift__',
            active: true,
            startedAt,
            endedAt: startedAt,
            rate: activeRate ?? settings.rate,
            shiftType: detectShiftType(startedAt),
            rateMultiplier,
            doubleRate: rateMultiplier === 2
          }
        : null,
    [activeRate, rateMultiplier, settings.rate, startedAt]
  );
  const activeHistoryShift = useMemo(() => {
    if (!activeShift) return null;
    if (range) return filterShiftsByRange([activeShift], rangeState)[0] || null;
    if (selectedDateKey) return getDateKey(activeShift.startedAt) === selectedDateKey ? activeShift : null;
    return activeShift;
  }, [activeShift, range, rangeState, selectedDateKey]);
  const reportShifts = useMemo(() => {
    if (range) return filterShiftsByRange(shifts, rangeState);
    if (selectedDateKey) return shifts.filter((shift) => getDateKey(shift.startedAt) === selectedDateKey);
    return getMonthShifts(shifts, visibleMonth);
  }, [range, rangeState, selectedDateKey, shifts, visibleMonth]);
  const historyVisibleShifts = useMemo(() => {
    if (range) return filterShiftsByRange(shifts, rangeState);
    if (selectedDateKey) return shifts.filter((shift) => getDateKey(shift.startedAt) === selectedDateKey);
    return shifts;
  }, [range, rangeState, selectedDateKey, shifts]);
  const shiftDateKeys = useMemo(() => {
    const keys = new Set(shifts.map((shift) => getDateKey(shift.startedAt)));
    if (startedAt) keys.add(getDateKey(startedAt));
    return keys;
  }, [shifts, startedAt]);
  const activeDateKey = startedAt ? getDateKey(startedAt) : null;
  const calendarSummary = useMemo(() => {
    const totalMs = reportShifts.reduce((sum, shift) => sum + Math.max(0, shift.endedAt - shift.startedAt), 0);
    const totalPay = reportShifts.reduce((sum, shift) => sum + calculatePay(shift), 0);
    return `${reportShifts.length} змін · ${formatHoursMinutes(totalMs)} · ${formatMoney(totalPay)}`;
  }, [reportShifts]);
  const calendarStatus = range
    ? `Період: ${formatShortDate(getTimestampFromDateKey(range.startKey) || Date.now())}-${formatShortDate(
        getTimestampFromDateKey(range.endKey) || Date.now()
      )}`
    : rangeState.rangeStartKey
      ? 'Оберіть кінець періоду'
      : selectedDateKey
        ? 'Вибраний день'
        : 'Огляд місяця';
  const calendarTitle = rangeLabel || formatMonth(visibleMonth);
  const shiftsTitle = rangeLabel
    ? `Зміни за ${rangeLabel}`
    : selectedDateKey
      ? `Зміни за ${formatDateOnly(getTimestampFromDateKey(selectedDateKey) || Date.now())}`
      : 'Усі зміни';

  const chooseDate = useCallback((date: Date, dateKey: string) => {
    setSelectedDateKey(dateKey);
    setRangeState((current) => getNextRangeState(current, dateKey));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setCreatingShift(false);
  }, []);

  const handleMonthChange = useCallback((month: Date) => {
    setVisibleMonth(month);
    setSelectedDateKey(null);
    setCreatingShift(false);
  }, []);

  const clearHistory = useCallback(async () => {
    if (!(await confirmAction('Очистити всю історію?'))) return;
    storage.shifts = [];
    storage.lastShift = null;
    setSelectedDateKey(null);
    setRangeState(clearRangeState());
    setCreatingShift(false);
    setEditingShiftId(null);
    forceRefresh();
    showToast('Історію очищено', 'success');
  }, [confirmAction, forceRefresh, showToast]);

  const deleteShift = useCallback(
    async (shift: Shift) => {
      if (!(await confirmAction('Видалити цю зміну?'))) return;
      const nextShifts = storage.shifts.filter((savedShift) => savedShift.id !== shift.id);
      storage.shifts = nextShifts;
      storage.lastShift = nextShifts[0] || null;
      if (editingShiftId === shift.id) setEditingShiftId(null);
      forceRefresh();
      showToast('Зміну видалено', 'success');
    },
    [confirmAction, editingShiftId, forceRefresh, showToast]
  );

  const handleEditShift = useCallback((shift: Shift | ActiveShift) => {
    setCreatingShift(false);
    setEditingShiftId(shift.id);
  }, []);
  const handleCancelEdit = useCallback(() => setEditingShiftId(null), []);
  const handleShiftSaved = useCallback((savedShift: Shift | ActiveShift) => {
    setEditingShiftId(null);
    setSelectedDateKey(getDateKey(savedShift.startedAt));
    setVisibleMonth(
      new Date(new Date(savedShift.startedAt).getFullYear(), new Date(savedShift.startedAt).getMonth(), 1)
    );
  }, []);
  const handleEditDateSwitch = useCallback(
    (dateKey: string) => {
      if (activeShift && getDateKey(activeShift.startedAt) === dateKey) {
        setEditingShiftId(activeShift.id);
        return true;
      }

      const nextShift = shifts.find((shift) => getDateKey(shift.startedAt) === dateKey);
      if (!nextShift) return false;

      setEditingShiftId(nextShift.id);
      return true;
    },
    [activeShift, shifts]
  );
  const handleDeleteShift = useCallback(
    (shift: Shift | ActiveShift) => {
      if (!('active' in shift)) void deleteShift(shift);
    },
    [deleteShift]
  );
  const renderHistoryShift = useCallback(
    (shift: Shift) => (
      <ShiftCard key={shift.id} shift={shift} showActions onEdit={handleEditShift} onDelete={handleDeleteShift} />
    ),
    [handleDeleteShift, handleEditShift]
  );
  const activeHistoryCard = useMemo(
    () =>
      activeHistoryShift ? (
        <LiveActiveShiftCard key={activeHistoryShift.id} shift={activeHistoryShift} onEdit={handleEditShift} />
      ) : null,
    [activeHistoryShift, handleEditShift]
  );
  const editingShift = useMemo(
    () =>
      editingShiftId && activeShift?.id === editingShiftId
        ? activeShift
        : shifts.find((shift) => shift.id === editingShiftId) || null,
    [activeShift, editingShiftId, shifts]
  );

  useEffect(() => {
    if (!editingShift) return undefined;

    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;

    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [editingShift]);
  const hasVisibleHistory = Boolean(activeHistoryShift) || historyVisibleShifts.length > 0;
  const isScheduleParsePending = view === 'analytics' && scheduleText !== deferredScheduleText;
  const scheduleParseResult = useMemo(
    () => (view === 'analytics' ? parseScheduleText(deferredScheduleText) : emptyScheduleParseResult),
    [deferredScheduleText, view]
  );
  const analytics = useMemo<ReportAnalytics | null>(() => {
    if (view !== 'analytics') return null;

    return buildReportAnalytics({
      reportShifts,
      range,
      visibleMonth,
      scheduleEntries: scheduleParseResult.entries,
      chartMode
    });
  }, [chartMode, range, reportShifts, scheduleParseResult.entries, view, visibleMonth]);
  const analyticsTotalPay = analytics?.totalPay ?? 0;
  const analyticsTotalMs = analytics?.totalMs ?? 0;
  const averagePay = analytics?.averagePay ?? 0;
  const averageShiftMs = analytics?.averageShiftMs ?? 0;
  const averagePayPerHour = analytics?.averagePayPerHour ?? 0;
  const chartDates = analytics?.chartDates ?? emptyChartDates;
  const dayStats = analytics?.dayStats ?? emptyDayStats;
  const getChartTitle = analytics?.getChartTitle ?? emptyChartTitle;
  const getChartValue = analytics?.getChartValue ?? emptyChartValue;
  const getPlannedChartValue = analytics?.getPlannedChartValue ?? emptyPlannedChartValue;
  const maxChartValue = analytics?.maxChartValue ?? 1;
  const scheduleDiffRows = analytics?.scheduleDiffRows ?? emptyScheduleDiffRows;
  const scheduleEntriesWithPlan = analytics?.scheduleEntriesWithPlan ?? 0;
  const newShift = useMemo(() => getDefaultNewShift(selectedDateKey, settings.rate), [selectedDateKey, settings.rate]);
  const topScheduleDiffRows = useMemo(
    () =>
      scheduleDiffRows.slice(0, 3).map((item) => ({
        dateKey: item.dateKey,
        timestamp: item.stats.timestamp,
        endedAt: item.stats.endedAt,
        entry: item.entry,
        diff: item.diff
      })),
    [scheduleDiffRows]
  );

  const clearScheduleText = useCallback(() => {
    setScheduleText('');
    clearStoredScheduleText();
    showToast('Графік очищено', 'success');
  }, [showToast]);

  const handleClearHistoryClick = useCallback(() => {
    void clearHistory();
  }, [clearHistory]);

  const pasteScheduleText = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedText = event.clipboardData.getData('text');
      if (!pastedText) return;

      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const nextText = `${scheduleText.slice(0, start)}${pastedText}${scheduleText.slice(end)}`;
      setScheduleText(formatScheduleTextInput(nextText));
    },
    [scheduleText]
  );

  const handleScheduleTextChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setScheduleText(event.target.value);
  }, []);

  const syncScheduleText = useCallback(async () => {
    const currentScheduleParseResult = parseScheduleText(scheduleText);
    if (!scheduleText.trim() || currentScheduleParseResult.errors.length > 0) return;

    const shiftSync = syncShiftsWithScheduleEntries(currentScheduleParseResult.entries, storage.shifts, settings.rate);
    const shiftChangedCount = shiftSync.createdKeys.length + shiftSync.updatedKeys.length;
    const confirmed = await confirmAction(
      `Синхронізувати графік? Змін у журналі: ${shiftChangedCount}. Пропущено днів: ${shiftSync.skippedKeys.length}.`
    );
    if (!confirmed) return;

    storage.shifts = shiftSync.shifts;
    storage.lastShift = shiftSync.shifts[0] || null;
    saveScheduleTextValue(scheduleText);
    forceRefresh();
    showToast('Графік синхронізовано', 'success');
  }, [confirmAction, forceRefresh, scheduleText, settings.rate, showToast]);

  const handleSyncScheduleTextClick = useCallback(() => {
    void syncScheduleText();
  }, [syncScheduleText]);

  const handleCreateShift = useCallback(() => {
    setCreatingShift(true);
    setEditingShiftId(null);
  }, []);

  const handleCancelCreateShift = useCallback(() => setCreatingShift(false), []);

  const handleCreateShiftSaved = useCallback((shift: Shift | ActiveShift) => {
    setCreatingShift(false);
    setSelectedDateKey(getDateKey(shift.startedAt));
    setVisibleMonth(
      new Date(new Date(shift.startedAt).getFullYear(), new Date(shift.startedAt).getMonth(), 1)
    );
  }, []);

  const handleEditModalBackdropClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) handleCancelEdit();
  }, [handleCancelEdit]);

  return (
    <>
      <main className="page">
        <header className="page-header">
          <p className="eyebrow">{view === 'analytics' ? 'Аналітика' : 'Історія змін'}</p>
          <h1>{view === 'analytics' ? 'Аналітика' : 'Зміни'}</h1>
        </header>
        <CalendarPanel
          visibleMonth={visibleMonth}
          title={calendarTitle}
          selectedDateKey={selectedDateKey}
          rangeState={rangeState}
          shiftDateKeys={shiftDateKeys}
          activeDateKey={activeDateKey}
          subtitle={calendarSummary}
          status={calendarStatus}
          ariaLabel="Календар звітів"
          onMonthChange={handleMonthChange}
          onDateClick={chooseDate}
        />

        {view === 'shifts' && (
          <>
            {creatingShift && (
              <section className="panel create-shift-panel">
                <EditShiftForm
                  mode="create"
                  shift={newShift}
                  onCancel={handleCancelCreateShift}
                  onSaved={handleCreateShiftSaved}
                />
              </section>
            )}
            <section className="panel">
              <div className="section-header">
                <h2>{shiftsTitle}</h2>
                <div className="section-actions">
                  <button
                    className="clear save-action"
                    type="button"
                    disabled={creatingShift}
                    onClick={handleCreateShift}
                  >
                    Додати
                  </button>
                  <button
                    className="clear"
                    type="button"
                    disabled={shifts.length === 0}
                    onClick={handleClearHistoryClick}
                  >
                    Очистити
                  </button>
                </div>
              </div>
              <VirtualShiftList
                before={activeHistoryCard}
                shifts={historyVisibleShifts}
                renderShift={renderHistoryShift}
              />
              <p className="empty" hidden={hasVisibleHistory}>
                {range
                  ? 'За цей період записів немає.'
                  : selectedDateKey
                    ? 'За цей день записів немає.'
                    : 'Історія порожня.'}
              </p>
            </section>
          </>
        )}

        {view === 'analytics' && (
          <>
            <section
              className={`panel schedule-panel ${isScheduleParsePending ? 'is-updating' : ''}`}
              aria-busy={isScheduleParsePending}
            >
              <div className="section-header">
                <h2>Графік роботи</h2>
                <div className="section-actions">
                  <button
                    className="clear save-action"
                    type="button"
                    disabled={!scheduleText.trim() || isScheduleParsePending || scheduleParseResult.errors.length > 0}
                    onClick={handleSyncScheduleTextClick}
                  >
                    Синхронізувати
                  </button>
                  <button className="clear" type="button" disabled={!scheduleText.trim()} onClick={clearScheduleText}>
                    Очистити
                  </button>
                </div>
              </div>
              <textarea
                className="schedule-textarea"
                value={scheduleText}
                onChange={handleScheduleTextChange}
                onPaste={pasteScheduleText}
                placeholder="--01.06.2026--&#10;In time: 05:57&#10;Out time: 16:52&#10;Total: 10:55"
                spellCheck={false}
              />
              <div className="schedule-summary" aria-live="polite">
                <span>Днів: {scheduleParseResult.entries.length}</span>
                <span>З планом: {scheduleEntriesWithPlan}</span>
                <span>Помилок: {scheduleParseResult.errors.length}</span>
                {isScheduleParsePending && <span className="schedule-pending">Оновлення...</span>}
              </div>
              <p className="form-error" hidden={scheduleParseResult.errors.length === 0}>
                {scheduleParseResult.errors.slice(0, 2).join(' · ')}
              </p>
            </section>
            <section
              className={`panel dashboard-summary analytics-summary ${isScheduleParsePending ? 'is-updating' : ''}`}
              aria-label="Підсумки звіту"
              aria-busy={isScheduleParsePending}
            >
              <div className="summary-metric">
                <span>Сума</span>
                <strong>{formatMoney(analyticsTotalPay)}</strong>
              </div>
              <div className="summary-metric">
                <span>Години</span>
                <strong>{formatHoursMinutes(analyticsTotalMs)}</strong>
              </div>
              <div className="summary-metric">
                <span>Зміни</span>
                <strong>{reportShifts.length}</strong>
              </div>
              <div className="summary-metric">
                <span>Середня</span>
                <strong>{formatMoney(averagePay)}</strong>
              </div>
              <div className="summary-metric">
                <span>грн/год</span>
                <strong>{formatMoney(averagePayPerHour)}</strong>
              </div>
              <div className="summary-metric">
                <span>Сер. тривалість</span>
                <strong>{formatHoursMinutes(averageShiftMs)}</strong>
              </div>
            </section>
            <section className="panel">
              <div className="section-header">
                <h2>Графік по днях</h2>
                <div className="section-actions analytics-mode-actions" aria-label="Значення графіка">
                  {chartModes.map((mode) => (
                    <button
                      key={mode.value}
                      className={`filter-chip ${chartMode === mode.value ? 'active' : ''}`}
                      type="button"
                      onClick={() => setChartMode(mode.value)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className={`analytics-chart ${isScheduleParsePending ? 'is-updating' : ''}`}
                aria-label="Графік по днях"
                aria-busy={isScheduleParsePending}
              >
                {chartDates.map((date) => {
                  const dateKey = getDateKey(date);
                  const stats = dayStats.get(dateKey);
                  const value = getChartValue(stats);
                  const plannedValue = getPlannedChartValue(dateKey);
                  const height = stats ? Math.max(6, Math.round((value / maxChartValue) * 140)) : 3;
                  const plannedHeight =
                    chartMode === 'hours' && plannedValue > 0
                      ? Math.max(6, Math.round((plannedValue / maxChartValue) * 140))
                      : 0;

                  return (
                    <div className="chart-day" key={dateKey}>
                      {chartMode === 'hours' ? (
                        <div className="chart-bar-pair" title={getChartTitle(date, stats)}>
                          {stats && <div className="chart-bar" style={{ height }} />}
                          {plannedValue > 0 && (
                            <div className="chart-bar chart-bar-plan" style={{ height: plannedHeight }} />
                          )}
                        </div>
                      ) : (
                        <div className="chart-bar" style={{ height }} title={getChartTitle(date, stats)} />
                      )}
                      <span className="chart-label">{range ? formatShortDate(date.getTime()) : date.getDate()}</span>
                    </div>
                  );
                })}
              </div>
              <p className="empty" hidden={reportShifts.length > 0}>
                {range ? 'За цей період записів немає.' : 'За цей місяць записів немає.'}
              </p>
            </section>
            <section className="panel dashboard-lists analytics-lists">
              <div className="dashboard-list-section">
                <h2>Найбільші розбіжності</h2>
                <ScheduleDiffList
                  rows={topScheduleDiffRows}
                />
              </div>
            </section>
          </>
        )}
      </main>
      {editingShift && (
        <div
          className="modal-backdrop edit-modal-backdrop"
          onClick={handleEditModalBackdropClick}
        >
          <div className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-shift-modal-title">
            <div className="edit-modal-header">
              <div>
                <p className="eyebrow">{'active' in editingShift ? 'Поточна зміна' : 'Редагування'}</p>
                <h2 id="edit-shift-modal-title">{'active' in editingShift ? 'Поточна зміна' : 'Редагувати зміну'}</h2>
              </div>
              <button className="history-action" type="button" aria-label="Закрити" onClick={handleCancelEdit}>
                ×
              </button>
            </div>
            <EditShiftForm
              mode={'active' in editingShift ? 'active' : 'edit'}
              shift={editingShift}
              shiftDateKeys={shiftDateKeys}
              activeDateKey={activeDateKey}
              onDateSwitch={handleEditDateSwitch}
              onCancel={handleCancelEdit}
              onSaved={handleShiftSaved}
            />
          </div>
        </div>
      )}
    </>
  );
}
