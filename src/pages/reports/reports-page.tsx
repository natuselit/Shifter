import { useEffect, useMemo, useState, type ClipboardEvent } from 'react';
import { storage, useSnapshot, useStore } from '@/entities/app-state';
import { detectShiftType, getDateKey, getTimestampFromDateKey, type ActiveShift, type Shift } from '@/entities/shift';
import {
  buildReportAnalytics,
  chartModes,
  getMonthShifts,
  getWeekRange,
  type ChartMode
} from '@/features/report-analytics';
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
  syncShiftsWithScheduleEntries
} from '@/features/schedule-plan';
import {
  formatDateOnly,
  formatHoursMinutes,
  formatMoney,
  formatMonth,
  formatShortDate,
  formatTimeOnly
} from '@/shared/lib';
import { useConfirm, useToast } from '@/shared/ui';
import { CalendarPanel } from '@/widgets/calendar';
import { ShiftCard } from '@/widgets/shift-list';

export type ReportsView = 'shifts' | 'analytics';

const reportsCalendarCollapsedKey = 'reportsCalendarCollapsed';
type ReportAnalytics = ReturnType<typeof buildReportAnalytics>;

function AnalyticsList({ entries, emptyText }: { entries: Array<[string, string]>; emptyText: string }) {
  return (
    <ul className="analytics-list">
      {(entries.length === 0 ? [[emptyText, '0'] as [string, string]] : entries).map(([label, value]) => (
        <li key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </li>
      ))}
    </ul>
  );
}

function ScheduleDiffList({
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
  function formatPlannedTime(minutes: number | null | undefined) {
    if (minutes === null || minutes === undefined) return '-';
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    const normalizedMinutes = String(minutes % 60).padStart(2, '0');
    return `${hours}:${normalizedMinutes}`;
  }

  function formatPlannedDuration(milliseconds: number | null | undefined) {
    return milliseconds === null || milliseconds === undefined ? '-' : formatHoursMinutes(milliseconds);
  }

  function getDiffClass(milliseconds: number | null) {
    if (milliseconds === null || milliseconds === 0) return 'schedule-diff-result';
    return `schedule-diff-result ${milliseconds > 0 ? 'schedule-diff-plus' : 'schedule-diff-minus'}`;
  }

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
            <b>{formatPlannedDuration(item.entry?.plannedTotalMs)}</b>
            <b>{formatHoursMinutes(Math.max(0, item.endedAt - item.timestamp))}</b>
            <b className={getDiffClass(item.diff.totalDiffMs)}>{formatSignedHoursMinutes(item.diff.totalDiffMs)}</b>

            <strong>Прихід</strong>
            <b>{formatPlannedTime(item.entry?.plannedInMinutes)}</b>
            <b>{formatTimeOnly(item.timestamp)}</b>
            <b className={getDiffClass(item.diff.inDiffMs)}>{formatSignedHoursMinutes(item.diff.inDiffMs)}</b>

            <strong>Вихід</strong>
            <b>{formatPlannedTime(item.entry?.plannedOutMinutes)}</b>
            <b>{formatTimeOnly(item.endedAt)}</b>
            <b className={getDiffClass(item.diff.outDiffMs)}>{formatSignedHoursMinutes(item.diff.outDiffMs)}</b>
          </div>
        </li>
      ))}
    </ul>
  );
}

function getStoredCalendarCollapsed(): boolean {
  return localStorage.getItem(reportsCalendarCollapsedKey) === 'true';
}

export function ReportsPage({ view = 'shifts' }: { view?: ReportsView }) {
  const { settings, shifts, startedAt, activeRate, rateMultiplier, refresh } = useSnapshot();
  const { refresh: forceRefresh } = useStore();
  const { showToast } = useToast();
  const { confirmAction } = useConfirm();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [rangeState, setRangeState] = useState(clearRangeState);
  const [calendarCollapsed, setCalendarCollapsed] = useState(getStoredCalendarCollapsed);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [creatingShift, setCreatingShift] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('pay');
  const [scheduleText, setScheduleText] = useState(getStoredScheduleText);

  useEffect(() => {
    localStorage.setItem(reportsCalendarCollapsedKey, String(calendarCollapsed));
  }, [calendarCollapsed]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (storage.startedAt && !editingShiftId) refresh();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [editingShiftId, refresh]);

  const range = useMemo(() => getRangeKeys(rangeState), [rangeState]);
  const rangeLabel = useMemo(() => getRangeLabel(rangeState), [rangeState]);
  const today = new Date();
  const currentPeriod = {
    todayKey: getDateKey(today),
    weekRange: getWeekRange(today),
    year: today.getFullYear(),
    month: today.getMonth()
  };
  const activeEndedAt = startedAt ? Date.now() : 0;
  const activeShift = useMemo<ActiveShift | null>(
    () =>
      startedAt
        ? {
            id: '__active_shift__',
            active: true,
            startedAt,
            endedAt: activeEndedAt,
            rate: activeRate ?? settings.rate,
            shiftType: detectShiftType(startedAt),
            rateMultiplier,
            doubleRate: rateMultiplier === 2
          }
        : null,
    [activeEndedAt, activeRate, rateMultiplier, settings.rate, startedAt]
  );
  const allHistoryShifts = useMemo(() => (activeShift ? [activeShift, ...shifts] : shifts), [activeShift, shifts]);
  const reportShifts = useMemo(() => {
    if (range) return filterShiftsByRange(shifts, rangeState);
    if (selectedDateKey) return shifts.filter((shift) => getDateKey(shift.startedAt) === selectedDateKey);
    return getMonthShifts(shifts, visibleMonth);
  }, [range, rangeState, selectedDateKey, shifts, visibleMonth]);
  const historyVisibleShifts = useMemo(() => {
    if (range) return filterShiftsByRange(allHistoryShifts, rangeState);
    if (selectedDateKey) return allHistoryShifts.filter((shift) => getDateKey(shift.startedAt) === selectedDateKey);
    return allHistoryShifts;
  }, [allHistoryShifts, range, rangeState, selectedDateKey]);
  const shiftDateKeys = useMemo(() => {
    const keys = new Set(shifts.map((shift) => getDateKey(shift.startedAt)));
    if (startedAt) keys.add(getDateKey(startedAt));
    return keys;
  }, [shifts, startedAt]);
  const calendarTitle = rangeLabel || formatMonth(visibleMonth);
  const shiftsTitle = rangeLabel
    ? `Зміни за ${rangeLabel}`
    : selectedDateKey
      ? `Зміни за ${formatDateOnly(getTimestampFromDateKey(selectedDateKey) || Date.now())}`
      : 'Усі зміни';
  function chooseDate(date: Date, dateKey: string) {
    setSelectedDateKey(dateKey);
    setRangeState((current) => getNextRangeState(current, dateKey));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setCreatingShift(false);
  }

  function chooseToday() {
    const today = new Date();
    setSelectedDateKey(getDateKey(today));
    setRangeState(clearRangeState());
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setCreatingShift(false);
  }

  function chooseWeek() {
    const today = new Date();
    const week = getWeekRange(today);
    setSelectedDateKey(null);
    setRangeState({ rangeStartKey: week.startKey, rangeEndKey: week.endKey });
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setCreatingShift(false);
  }

  function chooseMonth() {
    const today = new Date();
    setSelectedDateKey(null);
    setRangeState(clearRangeState());
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setCreatingShift(false);
  }

  function resetPeriod() {
    setSelectedDateKey(null);
    setRangeState(clearRangeState());
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

  const scheduleParseResult = useMemo(() => parseScheduleText(scheduleText), [scheduleText]);
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
  const emptyChartDates = useMemo<ReportAnalytics['chartDates']>(() => [], []);
  const emptyDayStats = useMemo<ReportAnalytics['dayStats']>(() => new Map(), []);
  const emptyWeekStats = useMemo<ReportAnalytics['weekStats']>(() => new Map(), []);
  const emptyScheduleDiffRows = useMemo<ReportAnalytics['scheduleDiffRows']>(() => [], []);
  const emptyShiftTypePercentages = useMemo<ReportAnalytics['shiftTypePercentages']>(() => [], []);
  const analyticsTotalPay = analytics?.totalPay ?? 0;
  const analyticsTotalMs = analytics?.totalMs ?? 0;
  const averagePay = analytics?.averagePay ?? 0;
  const averageShiftMs = analytics?.averageShiftMs ?? 0;
  const averagePayPerHour = analytics?.averagePayPerHour ?? 0;
  const bestWeek = analytics?.bestWeek;
  const chartDates = analytics?.chartDates ?? emptyChartDates;
  const dayStats = analytics?.dayStats ?? emptyDayStats;
  const getChartTitle = analytics?.getChartTitle ?? (() => '');
  const getChartValue = analytics?.getChartValue ?? (() => 0);
  const getPlannedChartValue = analytics?.getPlannedChartValue ?? (() => 0);
  const maxChartValue = analytics?.maxChartValue ?? 1;
  const scheduleDiffRows = analytics?.scheduleDiffRows ?? emptyScheduleDiffRows;
  const scheduleEntriesWithPlan = analytics?.scheduleEntriesWithPlan ?? 0;
  const shiftTypePercentages = analytics?.shiftTypePercentages ?? emptyShiftTypePercentages;
  const weekStats = analytics?.weekStats ?? emptyWeekStats;

  const quickActions = (
    <div className="reports-quick-actions" aria-label="Швидкий вибір періоду">
      <button
        className={`filter-chip ${!range && selectedDateKey === currentPeriod.todayKey ? 'active' : ''}`}
        type="button"
        onClick={chooseToday}
      >
        Сьогодні
      </button>
      <button
        className={`filter-chip ${
          range?.startKey === currentPeriod.weekRange.startKey && range?.endKey === currentPeriod.weekRange.endKey
            ? 'active'
            : ''
        }`}
        type="button"
        onClick={chooseWeek}
      >
        Тиждень
      </button>
      <button
        className={`filter-chip ${
          !range &&
          !selectedDateKey &&
          visibleMonth.getFullYear() === currentPeriod.year &&
          visibleMonth.getMonth() === currentPeriod.month
            ? 'active'
            : ''
        }`}
        type="button"
        onClick={chooseMonth}
      >
        Місяць
      </button>
      <button
        className="filter-chip"
        type="button"
        disabled={!range && !selectedDateKey && !creatingShift}
        onClick={resetPeriod}
      >
        Скинути
      </button>
    </div>
  );

  function clearScheduleText() {
    setScheduleText('');
    clearStoredScheduleText();
    showToast('Графік очищено', 'success');
  }

  function pasteScheduleText(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData('text');
    if (!pastedText) return;

    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const nextText = `${scheduleText.slice(0, start)}${formatScheduleTextInput(pastedText)}${scheduleText.slice(end)}`;
    setScheduleText(formatScheduleTextInput(nextText));
  }

  async function syncScheduleText() {
    if (!scheduleText.trim() || scheduleParseResult.errors.length > 0) return;

    const shiftSync = syncShiftsWithScheduleEntries(scheduleParseResult.entries, storage.shifts, settings.rate);
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
  }

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">{view === 'analytics' ? 'Аналітика' : 'Історія змін'}</p>
        <h1>{view === 'analytics' ? 'Аналітика' : 'Зміни'}</h1>
      </header>
      {calendarCollapsed ? (
        <section className="panel calendar-panel reports-period-panel">
          <div className="reports-period-header">
            <h2>{calendarTitle}</h2>
            <button className="clear" type="button" onClick={() => setCalendarCollapsed(false)}>
              Календар
            </button>
          </div>
          {view === 'shifts' && quickActions}
        </section>
      ) : (
        <CalendarPanel
          visibleMonth={visibleMonth}
          title={calendarTitle}
          selectedDateKey={selectedDateKey}
          rangeState={rangeState}
          shiftDateKeys={shiftDateKeys}
          ariaLabel="Календар звітів"
          onMonthChange={(month) => {
            setVisibleMonth(month);
            setSelectedDateKey(null);
            setCreatingShift(false);
          }}
          onDateClick={chooseDate}
        >
          <div className="reports-period-header reports-period-header-compact">
            <span>{calendarTitle}</span>
            <button className="clear" type="button" onClick={() => setCalendarCollapsed(true)}>
              Згорнути
            </button>
          </div>
          {view === 'shifts' && quickActions}
        </CalendarPanel>
      )}

      {view === 'shifts' && (
        <>
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
              <h2>{shiftsTitle}</h2>
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
                <button
                  className="clear"
                  type="button"
                  disabled={shifts.length === 0}
                  onClick={() => void clearHistory()}
                >
                  Очистити
                </button>
              </div>
            </div>
            <ul className="history">
              {historyVisibleShifts.map((shift) => (
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
            <p className="empty" hidden={historyVisibleShifts.length > 0}>
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
          <section className="panel schedule-panel">
            <div className="section-header">
              <h2>Графік роботи</h2>
              <div className="section-actions">
                <button
                  className="clear save-action"
                  type="button"
                  disabled={!scheduleText.trim() || scheduleParseResult.errors.length > 0}
                  onClick={() => void syncScheduleText()}
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
              onChange={(event) => setScheduleText(event.target.value)}
              onPaste={pasteScheduleText}
              placeholder="--01.06.2026--&#10;In time: 05:57&#10;Out time: 16:52&#10;Total: 10:55"
              spellCheck={false}
            />
            <div className="schedule-summary">
              <span>Днів: {scheduleParseResult.entries.length}</span>
              <span>З планом: {scheduleEntriesWithPlan}</span>
              <span>Помилок: {scheduleParseResult.errors.length}</span>
            </div>
            <p className="form-error" hidden={scheduleParseResult.errors.length === 0}>
              {scheduleParseResult.errors.slice(0, 2).join(' · ')}
            </p>
          </section>
          <section className="panel dashboard-summary analytics-summary" aria-label="Підсумки звіту">
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
            <div className="summary-metric">
              <span>Найкр. тиждень</span>
              <strong>{bestWeek ? formatMoney(bestWeek.pay) : formatMoney(0)}</strong>
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
            <div className="analytics-chart" aria-label="Графік по днях">
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
                rows={scheduleDiffRows.slice(0, 3).map((item) => ({
                  dateKey: item.dateKey,
                  timestamp: item.stats.timestamp,
                  endedAt: item.stats.endedAt,
                  entry: item.entry,
                  diff: item.diff
                }))}
              />
            </div>
            <div className="dashboard-list-section">
              <h2>Типи змін</h2>
              <AnalyticsList entries={shiftTypePercentages} emptyText="Змін немає" />
            </div>
            <div className="dashboard-list-section">
              <h2>Тижні</h2>
              <AnalyticsList
                entries={Array.from(weekStats.entries())
                  .sort((first, second) => first[1].timestamp - second[1].timestamp)
                  .map(([, stats]) => [
                    `з ${formatShortDate(stats.timestamp)}`,
                    `${formatMoney(stats.pay)} · ${formatHoursMinutes(stats.ms)}`
                  ])}
                emptyText="Тижнів немає"
              />
            </div>
            <div className="dashboard-list-section">
              <h2>Найкращі дні</h2>
              <AnalyticsList
                entries={Array.from(dayStats.entries())
                  .sort((first, second) => second[1].pay - first[1].pay)
                  .slice(0, 3)
                  .map(([, stats]) => [formatDateOnly(stats.timestamp), `${formatMoney(stats.pay)} · ${stats.count}`])}
                emptyText="Днів немає"
              />
            </div>
            <div className="dashboard-list-section">
              <h2>Найдовші дні</h2>
              <AnalyticsList
                entries={Array.from(dayStats.entries())
                  .sort((first, second) => second[1].ms - first[1].ms)
                  .slice(0, 3)
                  .map(([, stats]) => [formatDateOnly(stats.timestamp), formatHoursMinutes(stats.ms)])}
                emptyText="Днів немає"
              />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
