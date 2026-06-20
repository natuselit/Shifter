import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Shift } from '@/entities/shift';

const overscanRows = 2;
const desktopRowHeight = 172;
const narrowRowHeight = 196;
const mobileRowHeight = 224;

interface VirtualShiftListProps {
  before?: ReactNode;
  shifts: Shift[];
  renderShift: (shift: Shift) => ReactNode;
}

interface VirtualListState {
  startIndex: number;
  endIndex: number;
  rowHeight: number;
  viewportHeight: number;
}

function getRowHeight() {
  if (typeof window === 'undefined') return desktopRowHeight;
  if (window.innerWidth < 420) return mobileRowHeight;
  if (window.innerWidth < 700) return narrowRowHeight;
  return desktopRowHeight;
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

function getInitialState(itemCount: number): VirtualListState {
  const rowHeight = getRowHeight();
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;

  return {
    ...getWindowRange(itemCount, 0, viewportHeight, rowHeight),
    rowHeight,
    viewportHeight
  };
}

export function VirtualShiftList({ before, shifts, renderShift }: VirtualShiftListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const listTopRef = useRef(0);
  const virtualStateRef = useRef<VirtualListState | null>(null);
  const [virtualState, setVirtualState] = useState(() => getInitialState(shifts.length));

  useEffect(() => {
    virtualStateRef.current = virtualState;
  }, [virtualState]);

  const measureListTop = useCallback(() => {
    const list = listRef.current;
    listTopRef.current = list ? list.getBoundingClientRect().top + window.scrollY : 0;
  }, []);

  const updateVirtualState = useCallback(() => {
    const rowHeight = getRowHeight();
    const viewportHeight = window.innerHeight;
    const scrollTop = Math.max(0, window.scrollY - listTopRef.current);
    const next = {
      ...getWindowRange(shifts.length, scrollTop, viewportHeight, rowHeight),
      rowHeight,
      viewportHeight
    };
    const current = virtualStateRef.current;

    if (
      current &&
      current.startIndex === next.startIndex &&
      current.endIndex === next.endIndex &&
      current.rowHeight === next.rowHeight &&
      current.viewportHeight === next.viewportHeight
    ) {
      return;
    }

    virtualStateRef.current = next;
    setVirtualState(next);
  }, [shifts.length]);

  useEffect(() => {
    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateVirtualState();
      });
    };
    const handleResize = () => {
      measureListTop();
      scheduleUpdate();
    };

    measureListTop();
    updateVirtualState();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', handleResize);
    };
  }, [before, measureListTop, shifts.length, updateVirtualState]);

  const visibleShifts = useMemo(
    () => shifts.slice(virtualState.startIndex, virtualState.endIndex),
    [shifts, virtualState.endIndex, virtualState.startIndex]
  );

  return (
    <div className="history" role="list">
      {before}
      <div ref={listRef} className="history-virtual" role="presentation">
        <div
          className="history-virtual-spacer"
          role="presentation"
          style={{ height: shifts.length * virtualState.rowHeight } as CSSProperties}
        >
          {visibleShifts.map((shift, offset) => {
            const index = virtualState.startIndex + offset;

            return (
              <div
                key={shift.id}
                className="virtual-shift-row"
                role="presentation"
                style={{
                  height: virtualState.rowHeight,
                  transform: `translateY(${index * virtualState.rowHeight}px)`
                }}
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
