import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Shift } from '@/entities/shift';
import { calculateVirtualWindow } from './virtual-window';

const virtualListThreshold = 40;
const desktopRowHeight = 174;
const tabletRowHeight = 194;
const mobileRowHeight = 224;
const overscanRows = 6;

interface VirtualShiftListProps {
  before?: ReactNode;
  shifts: Shift[];
  renderShift: (shift: Shift) => ReactNode;
}

function getRowHeight() {
  if (typeof window === 'undefined') return desktopRowHeight;
  if (window.innerWidth < 420) return mobileRowHeight;
  if (window.innerWidth < 700) return tabletRowHeight;
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

export function VirtualShiftList({ before, shifts, renderShift }: VirtualShiftListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState(() => ({
    scrollTop: 0,
    viewportHeight: typeof window === 'undefined' ? 800 : window.innerHeight,
    rowHeight: getRowHeight()
  }));

  const shouldVirtualize = shifts.length > virtualListThreshold;

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
    if (!shouldVirtualize) return undefined;

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
  }, [before, shifts.length, shouldVirtualize, updateViewport]);

  const windowRange = useMemo(
    () =>
      calculateVirtualWindow({
        itemCount: shifts.length,
        scrollTop: viewport.scrollTop,
        viewportHeight: viewport.viewportHeight,
        itemHeight: viewport.rowHeight,
        overscan: overscanRows
      }),
    [shifts.length, viewport.rowHeight, viewport.scrollTop, viewport.viewportHeight]
  );

  if (!shouldVirtualize) {
    return (
      <div className="history" role="list">
        {before}
        {shifts.map(renderShift)}
      </div>
    );
  }

  return (
    <div className="history" role="list">
      {before}
      <div ref={listRef} className="history-virtual" role="presentation">
        <div
          className="history-virtual-spacer"
          role="presentation"
          style={{ height: shifts.length * viewport.rowHeight } as CSSProperties}
        >
          {shifts.slice(windowRange.startIndex, windowRange.endIndex).map((shift, offset) => {
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
