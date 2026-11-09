import type { MyShift } from '@/lib/rota/my-shifts';

/** "08:00 – 14:00", in figures that line up from card to card. */
export function ShiftTimes({ shift, className }: { shift: MyShift; className: string }) {
  return (
    <p className={className}>
      {shift.start} – {shift.end}
    </p>
  );
}
