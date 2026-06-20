import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Shift } from '@/entities/shift';

const initialVisibleCount = 60;
const visibleCountStep = 60;

interface VirtualShiftListProps {
  before?: ReactNode;
  shifts: Shift[];
  renderShift: (shift: Shift) => ReactNode;
}

export function VirtualShiftList({ before, shifts, renderShift }: VirtualShiftListProps) {
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);

  useEffect(() => {
    setVisibleCount(initialVisibleCount);
  }, [shifts]);

  const visibleShifts = useMemo(() => shifts.slice(0, visibleCount), [shifts, visibleCount]);
  const hiddenCount = shifts.length - visibleShifts.length;
  const showMore = useCallback(() => {
    setVisibleCount((current) => Math.min(shifts.length, current + visibleCountStep));
  }, [shifts.length]);

  return (
    <>
      <div className="history" role="list">
        {before}
        {visibleShifts.map(renderShift)}
      </div>
      {hiddenCount > 0 && (
        <button className="clear history-load-more" type="button" onClick={showMore}>
          Показати ще {Math.min(hiddenCount, visibleCountStep)}
        </button>
      )}
    </>
  );
}
