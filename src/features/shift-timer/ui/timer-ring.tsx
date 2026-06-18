import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { storage, useSnapshot, useStore } from '@/entities/app-state';
import { calculateLivePay, getShiftCopyText } from '@/entities/shift';
import { copyText, formatDuration, formatMoney, formatTimeOnly, useLiveNow } from '@/shared/lib';
import { useToast } from '@/shared/ui';
import { finishCurrentShift, startCurrentShift } from '../shift-timer';

export function TimerRing() {
  const { settings, startedAt, activeRate, rateMultiplier } = useSnapshot();
  const { refresh } = useStore();
  const { showToast } = useToast();
  const [holdStartedAt, setHoldStartedAt] = useState<number | null>(null);
  const [holdDuration, setHoldDuration] = useState(0);
  const holdTimeoutRef = useRef<number | null>(null);
  const active = Boolean(startedAt);
  const now = useLiveNow(active);
  const rate = activeRate ?? settings.rate;

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
    };
  }, []);

  function cancelHold() {
    if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
    holdTimeoutRef.current = null;
    setHoldStartedAt(null);
    setHoldDuration(0);
  }

  function startShift() {
    const result = startCurrentShift(settings);
    if (!result.ok) {
      showToast(result.message, 'error');
      return;
    }
    refresh();
  }

  async function endShift() {
    const result = finishCurrentShift();
    if (!result.ok) {
      if (result.message) showToast(result.message, 'error');
      return;
    }

    refresh();

    try {
      const copied = await copyText(getShiftCopyText(result.shift, storage.settings.surname));
      showToast(copied ? 'Скопійовано' : 'Не вдалося скопіювати', copied ? 'success' : 'error');
    } catch {
      showToast('Не вдалося скопіювати', 'error');
    }
  }

  function startHold(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    cancelHold();
    const duration = (storage.startedAt ? settings.endHoldSeconds : settings.startHoldSeconds) * 1000;
    setHoldStartedAt(Date.now());
    setHoldDuration(duration);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    holdTimeoutRef.current = window.setTimeout(() => {
      cancelHold();
      if (storage.startedAt) void endShift();
      else startShift();
    }, duration);
  }

  const elapsed = startedAt ? formatDuration(now - startedAt) : '00:00:00';
  const livePay = startedAt ? formatMoney(calculateLivePay(startedAt, rate, rateMultiplier)) : formatMoney(0);
  const actionLabel = active ? 'Фініш' : 'Старт';
  const holdSeconds = active ? settings.endHoldSeconds : settings.startHoldSeconds;
  const accessibleLabel = holdStartedAt
    ? `${actionLabel}. Тримайте кнопку.`
    : `${actionLabel}. Утримуйте ${holdSeconds} с. Поточний час зміни ${elapsed}. Зароблено ${livePay}.`;
  const timerClassName = [
    'timer-ring',
    active ? 'active' : 'ready',
    holdStartedAt ? 'holding' : '',
    holdStartedAt ? (active ? 'hold-end' : 'hold-start') : ''
  ]
    .filter(Boolean)
    .join(' ');
  const ringStyle = {
    '--hold-duration': `${holdDuration || 1}ms`
  } as CSSProperties;

  return (
    <button
      className={timerClassName}
      type="button"
      style={ringStyle}
      aria-label={accessibleLabel}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
    >
      <svg className="ring-svg" viewBox="0 0 120 120" aria-hidden="true">
        <g className={`svg-ring svg-ring-active ${active ? 'has-progress' : ''}`} data-ring="active">
          <circle className="ring-track" cx="60" cy="60" r="56" pathLength="100" />
        </g>
        <g className="svg-ring svg-ring-hold" data-ring="hold">
          <circle className="ring-track" cx="60" cy="60" r="56" pathLength="100" />
          <g className="ring-progress-layer">
            <circle className="ring-progress" cx="60" cy="60" r="56" pathLength="100" strokeDashoffset="0" />
          </g>
        </g>
      </svg>
      <div className="timer-card">
        <div className="timer-face timer-front">
          <span className="ring-action">{actionLabel}</span>
          <span className="ring-hint">{holdStartedAt ? 'Тримайте...' : `утримуйте ${holdSeconds} с`}</span>
          <span className="ring-clock">{formatTimeOnly(now)}</span>
          <p className="time">{elapsed}</p>
          <span className="ring-pay">{livePay}</span>
        </div>
      </div>
    </button>
  );
}
