import { ArrowLeftRight, Clock3, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { memo, useMemo, type ReactNode } from 'react';
import { calculatePayBreakdown, normalizeRateMultiplier, type ActiveShift, type Shift } from '@/entities/shift';
import { formatDateOnly, formatHoursMinutes, formatMoney, formatTimeOnly } from '@/shared/lib';

interface ShiftCardProps {
  shift: Shift | ActiveShift;
  children?: ReactNode;
  showActions?: boolean;
  onEdit?: (shift: Shift | ActiveShift) => void;
  onDelete?: (shift: Shift | ActiveShift) => void;
}

function ShiftCardView({ shift, children, showActions = false, onEdit, onDelete }: ShiftCardProps) {
  const shiftType = shift.shiftType;
  const multiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));
  const payBreakdown = useMemo(() => calculatePayBreakdown(shift), [shift]);
  const hasManualMultiplier = payBreakdown.rateMultiplier !== 1;
  const basePay = useMemo(() => (payBreakdown.baseMs / 3600000) * shift.rate, [payBreakdown.baseMs, shift.rate]);
  const overtimePay = useMemo(
    () => (payBreakdown.overtimeMs / 3600000) * shift.rate * 1.5,
    [payBreakdown.overtimeMs, shift.rate]
  );
  const multiplierPay = useMemo(
    () => (payBreakdown.multiplierMs / 3600000) * shift.rate * payBreakdown.rateMultiplier,
    [payBreakdown.multiplierMs, payBreakdown.rateMultiplier, shift.rate]
  );
  const displayRate = `${Math.floor(Math.max(0, Number(shift.rate) || 0))} грн/год`;
  const isActive = 'active' in shift && shift.active;
  const canDelete = showActions && !isActive;
  const className = [
    'history-card',
    shiftType === '2 зміна' ? 'shift-second-card' : 'shift-first-card',
    isActive ? 'active-history-item' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={className} role="listitem">
      <div className="history-card-content">
        <div className="history-card-header">
          <div className="history-title-group">
            <span className="history-date">{isActive ? 'Поточна зміна' : formatDateOnly(shift.startedAt)}</span>
            <span className={`history-badge ${shiftType === '2 зміна' ? 'second-shift' : 'first-shift'}`}>
              {shiftType}
            </span>
          </div>
          {showActions && (
            <div className="history-actions" aria-label="Дії зі зміною">
              <button
                className="history-action history-action-edit"
                type="button"
                aria-label="Редагувати"
                onClick={() => onEdit?.(shift)}
              >
                <Pencil size={16} />
              </button>
              {canDelete && (
                <button
                  className="history-action history-action-delete"
                  type="button"
                  aria-label="Видалити"
                  onClick={() => onDelete?.(shift)}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>
        <strong className="history-amount">{formatMoney(payBreakdown.total)}</strong>
        <div className="history-meta">
          <span>
            <Clock3 size={18} />
            <span>
              {isActive
                ? `${formatTimeOnly(shift.startedAt)} - зараз`
                : `${formatTimeOnly(shift.startedAt)} - ${formatTimeOnly(shift.endedAt)}`}
            </span>
          </span>
          <span>
            <ArrowLeftRight size={18} />
            <span>{formatHoursMinutes(shift.endedAt - shift.startedAt)}</span>
          </span>
          <span>
            <DollarSign size={18} />
            <span>{multiplier === 1 ? displayRate : `${displayRate} · x${multiplier}`}</span>
          </span>
        </div>
        <div
          className={`history-pay-details ${hasManualMultiplier ? 'history-pay-details-single' : ''}`}
          aria-label="Деталі розрахунку зарплати"
        >
          {hasManualMultiplier ? (
            <span>
              <em>x{payBreakdown.rateMultiplier}</em>
              <strong>{formatHoursMinutes(payBreakdown.multiplierMs)}</strong>
              <b>{formatMoney(multiplierPay)}</b>
            </span>
          ) : (
            <>
              <span>
                <em>x1</em>
                <strong>{formatHoursMinutes(payBreakdown.baseMs)}</strong>
                <b>{formatMoney(basePay)}</b>
              </span>
              <span>
                <em>x1.5</em>
                <strong>{formatHoursMinutes(payBreakdown.overtimeMs)}</strong>
                <b>{formatMoney(overtimePay)}</b>
              </span>
            </>
          )}
        </div>
        {children}
      </div>
    </article>
  );
}

function areShiftsEqual(first: Shift | ActiveShift, second: Shift | ActiveShift) {
  return (
    first.id === second.id &&
    first.startedAt === second.startedAt &&
    first.endedAt === second.endedAt &&
    first.rate === second.rate &&
    first.shiftType === second.shiftType &&
    first.rateMultiplier === second.rateMultiplier &&
    first.doubleRate === second.doubleRate &&
    ('active' in first && first.active) === ('active' in second && second.active)
  );
}

function areShiftCardPropsEqual(first: ShiftCardProps, second: ShiftCardProps) {
  return (
    areShiftsEqual(first.shift, second.shift) &&
    first.children === second.children &&
    Boolean(first.showActions) === Boolean(second.showActions) &&
    first.onEdit === second.onEdit &&
    first.onDelete === second.onDelete
  );
}

export const ShiftCard = memo(ShiftCardView, areShiftCardPropsEqual);
