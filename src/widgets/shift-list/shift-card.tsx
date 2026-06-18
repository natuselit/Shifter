import { ArrowLeftRight, Clock3, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { calculatePayBreakdown, normalizeRateMultiplier, type ActiveShift, type Shift } from '@/entities/shift';
import { formatDateOnly, formatHoursMinutes, formatMoney, formatRate, formatTimeOnly } from '@/shared/lib';

interface ShiftCardProps {
  shift: Shift | ActiveShift;
  children?: ReactNode;
  showActions?: boolean;
  onEdit?: (shift: Shift | ActiveShift) => void;
  onDelete?: (shift: Shift | ActiveShift) => void;
}

function ShiftCardView({ shift, children, showActions = false, onEdit, onDelete }: ShiftCardProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const swipeOffsetRef = useRef(0);
  const pendingSwipeOffsetRef = useRef<number | null>(null);
  const swipeFrameRef = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
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
  const isActive = 'active' in shift && shift.active;
  const canDelete = showActions && !isActive;
  const editSwipeWidth = showActions ? 46 : 0;
  const deleteSwipeWidth = canDelete ? 46 : 0;
  const className = [
    'history-card',
    shiftType === '2 зміна' ? 'shift-second-card' : 'shift-first-card',
    isActive ? 'active-history-item' : '',
    showActions ? 'swipe-history-card' : '',
    isSwiping ? 'swiping-history-card' : '',
    swipeOffset > 0 ? 'edit-swipe-open' : '',
    swipeOffset < 0 ? 'delete-swipe-open' : ''
  ]
    .filter(Boolean)
    .join(' ');
  const contentStyle = showActions ? ({ '--swipe-offset': `${swipeOffset}px` } as CSSProperties) : undefined;

  useEffect(() => {
    return () => {
      if (swipeFrameRef.current !== null) cancelAnimationFrame(swipeFrameRef.current);
    };
  }, []);

  const commitSwipeOffset = (value: number) => {
    const nextOffset = Math.round(value);

    pendingSwipeOffsetRef.current = null;
    if (swipeFrameRef.current !== null) {
      cancelAnimationFrame(swipeFrameRef.current);
      swipeFrameRef.current = null;
    }

    if (swipeOffsetRef.current === nextOffset) return;
    swipeOffsetRef.current = nextOffset;
    setSwipeOffset(nextOffset);
  };

  const scheduleSwipeOffset = (value: number) => {
    const nextOffset = Math.round(value);
    if (
      pendingSwipeOffsetRef.current === nextOffset ||
      (pendingSwipeOffsetRef.current === null && swipeOffsetRef.current === nextOffset)
    ) {
      return;
    }

    pendingSwipeOffsetRef.current = nextOffset;
    if (swipeFrameRef.current !== null) return;

    swipeFrameRef.current = requestAnimationFrame(() => {
      swipeFrameRef.current = null;
      const pendingOffset = pendingSwipeOffsetRef.current;
      pendingSwipeOffsetRef.current = null;

      if (pendingOffset === null || swipeOffsetRef.current === pendingOffset) return;
      swipeOffsetRef.current = pendingOffset;
      setSwipeOffset(pendingOffset);
    });
  };

  const closeSwipe = () => {
    commitSwipeOffset(0);
    setIsSwiping(false);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!showActions) return;
    startX.current = event.clientX;
    startY.current = event.clientY;
    isDragging.current = false;
    setIsSwiping(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!showActions || !isSwiping) return;

    const deltaX = event.clientX - startX.current;
    const deltaY = event.clientY - startY.current;

    if (!isDragging.current && Math.abs(deltaX) < 8) return;
    if (!isDragging.current && Math.abs(deltaY) > Math.abs(deltaX)) {
      setIsSwiping(false);
      return;
    }

    isDragging.current = true;
    const maxRight = editSwipeWidth;
    const maxLeft = deleteSwipeWidth;
    const clamped = Math.max(-maxLeft, Math.min(maxRight, deltaX));
    scheduleSwipeOffset(clamped);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!showActions) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    const currentOffset = pendingSwipeOffsetRef.current ?? swipeOffsetRef.current;
    if (currentOffset > editSwipeWidth / 2) {
      commitSwipeOffset(editSwipeWidth);
    } else if (currentOffset < -deleteSwipeWidth / 2) {
      commitSwipeOffset(-deleteSwipeWidth);
    } else {
      commitSwipeOffset(0);
    }

    setIsSwiping(false);
    isDragging.current = false;
  };

  return (
    <article className={className} role="listitem">
      {showActions && (
        <div className="history-swipe-actions" aria-hidden={swipeOffset === 0}>
          <button
            className="history-swipe-action history-swipe-edit"
            type="button"
            aria-label="Редагувати"
            title="Редагувати"
            tabIndex={swipeOffset > 0 ? 0 : -1}
            onClick={() => {
              closeSwipe();
              onEdit?.(shift);
            }}
          >
            <Pencil size={18} />
          </button>
          {canDelete && (
            <button
              className="history-swipe-action history-swipe-delete"
              type="button"
              aria-label="Видалити"
              title="Видалити"
              tabIndex={swipeOffset < 0 ? 0 : -1}
              onClick={() => {
                closeSwipe();
                onDelete?.(shift);
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      )}
      <div
        className="history-card-content"
        style={contentStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div className="history-card-header">
          <div className="history-title-group">
            <span className="history-date">{isActive ? 'Поточна зміна' : formatDateOnly(shift.startedAt)}</span>
            <span className={`history-badge ${shiftType === '2 зміна' ? 'second-shift' : 'first-shift'}`}>
              {shiftType}
            </span>
          </div>
          <div className="history-card-side">
            <strong className="history-amount">{formatMoney(payBreakdown.total)}</strong>
          </div>
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
                <em>Звичайні</em>
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

export const ShiftCard = memo(ShiftCardView);
