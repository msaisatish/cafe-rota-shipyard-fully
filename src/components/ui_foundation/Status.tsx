import { statusParts, type StatusTone } from './primitives';

/**
 * A status — a word, a shape and a colour, in that order of importance.
 *
 * The shape is hidden from screen readers because the word already says it;
 * announcing "tick Paid" is noise. It is there for people who see the chip and
 * cannot tell the colours apart.
 */
export function Status({
  tone,
  label,
  announce,
}: {
  tone: StatusTone;
  label: string;
  /** Set when this appeared or changed just now, rather than always being here. */
  announce?: boolean;
}) {
  const parts = statusParts(tone, label, announce === undefined ? {} : { announce });
  return (
    <span className={parts.className} {...(parts.role ? { role: parts.role } : {})}>
      <span aria-hidden="true">{parts.mark}</span> {parts.label}
    </span>
  );
}
