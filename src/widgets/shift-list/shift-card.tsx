import { ArrowLeftRight, Clock3, DollarSign, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { calculatePay, normalizeRateMultiplier } from '../../entities/shift/model';
import type { ActiveShift, Shift } from '../../entities/shift/types';
import { formatDateOnly, formatHoursMinutes, formatMoney, formatRate, formatTimeOnly } from '../../shared/lib/format';

interface ShiftCardProps {
  shift: Shift | ActiveShift;
  children?: ReactNode;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ShiftCard({ shift, children, showActions = false, onEdit, onDelete }: ShiftCardProps) {
  const shiftType = shift.shiftType;
  const multiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));
  const isActive = 'active' in shift && shift.active;
  const className = [
    'history-card',
    shiftType === '2 зміна' ? 'shift-second-card' : 'shift-first-card',
    isActive ? 'active-history-item' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={className}>
      <div className="history-card-header">
        <div className="history-title-group">
          <span className="history-date">{isActive ? 'Поточна зміна' : formatDateOnly(shift.startedAt)}</span>
          <span className={`history-badge ${shiftType === '2 зміна' ? 'second-shift' : 'first-shift'}`}>
            {shiftType}
          </span>
        </div>
        <strong className="history-amount">{formatMoney(calculatePay(shift))}</strong>
      </div>
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
          <span>{multiplier === 1 ? formatRate(shift.rate) : `${formatRate(shift.rate)} · x${multiplier}`}</span>
        </span>
      </div>
      {showActions && (
        <div className={isActive ? 'history-actions active-history-actions' : 'history-actions'}>
          <button className="small-action" type="button" aria-label="Редагувати" title="Редагувати" onClick={onEdit}>
            <Pencil size={18} />
          </button>
          {!isActive && (
            <button
              className="small-action danger-action"
              type="button"
              aria-label="Видалити"
              title="Видалити"
              onClick={onDelete}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      )}
      {children}
    </li>
  );
}
