import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { calculateLivePay } from '../../entities/shift/model';
import { formatDuration, formatMoney, formatTimeOnly } from '../../shared/lib/format';
import { storage } from '../../shared/storage/local-storage';
import { useSnapshot, useStore } from '../../app/providers/store-provider';
import { useToast } from '../toast/toast-provider';
import { copyText, getShiftCopyText } from '../../features/copy-report/report';
import { finishCurrentShift, startCurrentShift } from '../../features/shift-timer/shift-timer';

export function TimerRing() {
  const { settings, startedAt, activeRate, rateMultiplier } = useSnapshot();
  const { refresh } = useStore();
  const { showToast } = useToast();
  const [now, setNow] = useState(Date.now());
  const [holdStartedAt, setHoldStartedAt] = useState<number | null>(null);
  const [holdDuration, setHoldDuration] = useState(0);
  const holdTimeoutRef = useRef<number | null>(null);
  const active = Boolean(startedAt);
  const rate = activeRate ?? settings.rate;
  const holdProgress = holdStartedAt ? Math.min(1, (now - holdStartedAt) / holdDuration) : 0;

  useEffect(() => {
    if (!active && !holdStartedAt) {
      const interval = window.setInterval(() => setNow(Date.now()), 1000);
      return () => window.clearInterval(interval);
    }

    let frame = 0;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [active, holdStartedAt]);

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
      await copyText(getShiftCopyText(result.shift, storage.settings.surname));
      showToast('Скопійовано', 'success');
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
  const timerClassName = [
    'timer-ring',
    active ? 'active' : 'ready',
    holdStartedAt ? 'holding' : '',
    holdStartedAt ? (active ? 'hold-end' : 'hold-start') : ''
  ]
    .filter(Boolean)
    .join(' ');
  const visibleProgress = holdProgress >= 0.003 ? holdProgress : 0;
  const ringStyle = {
    '--hold-duration': `${holdDuration || 1}ms`
  } as CSSProperties;

  return (
    <button
      className={timerClassName}
      type="button"
      style={ringStyle}
      aria-label={active ? 'Таймер зміни' : 'Таймер'}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
    >
      <svg className="ring-svg" viewBox="0 0 120 120" aria-hidden="true">
        <g className={`svg-ring svg-ring-active ${active ? 'has-progress' : ''}`} data-ring="active">
          <circle className="ring-track" cx="60" cy="60" r="56" pathLength="100" />
        </g>
        <g className={`svg-ring svg-ring-hold ${visibleProgress > 0 ? 'has-progress' : ''}`} data-ring="hold">
          <circle className="ring-track" cx="60" cy="60" r="56" pathLength="100" />
          <g className="ring-progress-layer">
            <circle
              className="ring-progress"
              cx="60"
              cy="60"
              r="56"
              pathLength="100"
              strokeDasharray={`${visibleProgress * 100} 100`}
              strokeDashoffset="0"
            />
          </g>
        </g>
      </svg>
      <div className="timer-card">
        <div className="timer-face timer-front">
          <span className="ring-action">{active ? 'Фініш' : 'Старт'}</span>
          <span className="ring-hint">
            {holdStartedAt
              ? 'Тримайте...'
              : `утримуйте ${active ? settings.endHoldSeconds : settings.startHoldSeconds} с`}
          </span>
          <span className="ring-clock">{formatTimeOnly(now)}</span>
          <p className="time">{elapsed}</p>
          <span className="ring-pay">{livePay}</span>
        </div>
      </div>
    </button>
  );
}
