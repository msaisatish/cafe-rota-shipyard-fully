import type { ReactNode } from 'react';

import { visuallyHiddenStyle } from './primitives';

/**
 * Text for people using a screen reader, and nobody else.
 *
 * For the words a sighted person gets from layout and a screen reader does not:
 * the heading of a region, what a lone icon means, the fact that a link opens
 * in a new window.
 *
 * Not `display: none`, which hides it from everybody including the people it is
 * for. That mistake is invisible to whoever makes it.
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span style={visuallyHiddenStyle}>{children}</span>;
}
