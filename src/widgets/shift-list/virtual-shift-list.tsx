import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from 'react';
import type { Shift } from '@/entities/shift';
import { buildVirtualMeasurements, calculateVirtualWindow } from './virtual-window';

const virtualListThreshold = 80;
const estimatedRowHeight = 148;
const overscanRows = 6;

interface VirtualShiftListProps {
  before?: ReactNode;
  shifts: Shift[];
  renderShift: (shift: Shift) => ReactNode;
}

interface VirtualShiftRowProps {
  index: number;
  top: number;
  children: ReactNode;
  onMeasure: (index: number, height: number) => void;
}

function VirtualShiftRow({ index, top, children, onMeasure }: VirtualShiftRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = rowRef.current;
    if (!element) return undefined;

    const measure = () => onMeasure(index, element.offsetHeight);
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [index, onMeasure]);

  return (
    <div
      ref={rowRef}
      className="virtual-shift-row"
      role="presentation"
      style={{ transform: `translateY(${top}px)` }}
    >
      {children}
    </div>
  );
}

export function VirtualShiftList({ before, shifts, renderShift }: VirtualShiftListProps) {
  const historyRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [itemHeights, setItemHeights] = useState<number[]>([]);
  const [viewport, setViewport] = useState(() => ({
    scrollTop: 0,
    viewportHeight: typeof window === 'undefined' ? 800 : window.innerHeight
  }));

  const shouldVirtualize = shifts.length > virtualListThreshold;

  useEffect(() => {
    setItemHeights([]);
  }, [shifts]);

  const updateViewport = useCallback(() => {
    const list = listRef.current;
    const listTop = list ? list.getBoundingClientRect().top + window.scrollY : 0;

    setViewport({
      scrollTop: Math.max(0, window.scrollY - listTop),
      viewportHeight: window.innerHeight
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
    const historyElement = historyRef.current;
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && historyElement) {
      observer = new ResizeObserver(scheduleUpdate);
      observer.observe(historyElement);
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      observer?.disconnect();
    };
  }, [shouldVirtualize, updateViewport]);

  const measureRow = useCallback((index: number, height: number) => {
    if (height <= 0) return;

    setItemHeights((current) => {
      if (current[index] === height) return current;
      const next = current.slice();
      next[index] = height;
      return next;
    });
  }, []);

  const measurements = useMemo(
    () => buildVirtualMeasurements(shifts.length, itemHeights, estimatedRowHeight),
    [itemHeights, shifts.length]
  );
  const windowRange = useMemo(
    () =>
      calculateVirtualWindow({
        itemCount: shifts.length,
        scrollTop: viewport.scrollTop,
        viewportHeight: viewport.viewportHeight,
        itemOffsets: measurements.offsets,
        itemHeights,
        estimatedItemHeight: estimatedRowHeight,
        overscan: overscanRows
      }),
    [itemHeights, measurements.offsets, shifts.length, viewport.scrollTop, viewport.viewportHeight]
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
    <div ref={historyRef} className="history" role="list">
      {before}
      <div ref={listRef} className="history-virtual" role="presentation">
        <div
          className="history-virtual-spacer"
          role="presentation"
          style={{ height: measurements.totalHeight } as CSSProperties}
        >
          {shifts.slice(windowRange.startIndex, windowRange.endIndex).map((shift, offset) => {
            const index = windowRange.startIndex + offset;
            return (
              <VirtualShiftRow key={shift.id} index={index} top={measurements.offsets[index] || 0} onMeasure={measureRow}>
                {renderShift(shift)}
              </VirtualShiftRow>
            );
          })}
        </div>
      </div>
    </div>
  );
}
