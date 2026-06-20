import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Shift } from '@/entities/shift';

const overscanRows = 3;
const desktopRowHeight = 172;
const narrowRowHeight = 196;
const mobileRowHeight = 224;

interface VirtualShiftListProps {
  before?: ReactNode;
  shifts: Shift[];
  renderShift: (shift: Shift) => ReactNode;
}

function getRowHeight() {
  if (typeof window === 'undefined') return desktopRowHeight;
  if (window.innerWidth < 420) return mobileRowHeight;
  if (window.innerWidth < 700) return narrowRowHeight;
  return desktopRowHeight;
}

function getViewport(list: HTMLDivElement | null) {
  const listTop = list ? list.getBoundingClientRect().top + window.scrollY : 0;

  return {
    scrollTop: Math.max(0, window.scrollY - listTop),
    viewportHeight: window.innerHeight,
    rowHeight: getRowHeight()
  };
}

function getWindowRange(itemCount: number, scrollTop: number, viewportHeight: number, rowHeight: number) {
  if (itemCount === 0 || rowHeight <= 0) return { startIndex: 0, endIndex: 0 };

  const firstVisibleIndex = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const visibleCount = Math.ceil(Math.max(0, viewportHeight) / rowHeight) + 1;

  return {
    startIndex: Math.max(0, firstVisibleIndex - overscanRows),
    endIndex: Math.min(itemCount, firstVisibleIndex + visibleCount + overscanRows)
  };
}

export function VirtualShiftList({ before, shifts, renderShift }: VirtualShiftListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState(() => ({
    scrollTop: 0,
    viewportHeight: typeof window === 'undefined' ? 800 : window.innerHeight,
    rowHeight: getRowHeight()
  }));

  const updateViewport = useCallback(() => {
    setViewport((current) => {
      const next = getViewport(listRef.current);
      if (
        current.scrollTop === next.scrollTop &&
        current.viewportHeight === next.viewportHeight &&
        current.rowHeight === next.rowHeight
      ) {
        return current;
      }

      return next;
    });
  }, []);

  useEffect(() => {
    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateViewport();
      });
    };

    updateViewport();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [before, shifts.length, updateViewport]);

  const windowRange = useMemo(
    () => getWindowRange(shifts.length, viewport.scrollTop, viewport.viewportHeight, viewport.rowHeight),
    [shifts.length, viewport.rowHeight, viewport.scrollTop, viewport.viewportHeight]
  );
  const visibleShifts = useMemo(
    () => shifts.slice(windowRange.startIndex, windowRange.endIndex),
    [shifts, windowRange.endIndex, windowRange.startIndex]
  );

  return (
    <div className="history" role="list">
      {before}
      <div ref={listRef} className="history-virtual" role="presentation">
        <div
          className="history-virtual-spacer"
          role="presentation"
          style={{ height: shifts.length * viewport.rowHeight } as CSSProperties}
        >
          {visibleShifts.map((shift, offset) => {
            const index = windowRange.startIndex + offset;

            return (
              <div
                key={shift.id}
                className="virtual-shift-row"
                role="presentation"
                style={{ height: viewport.rowHeight, transform: `translateY(${index * viewport.rowHeight}px)` }}
              >
                {renderShift(shift)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
