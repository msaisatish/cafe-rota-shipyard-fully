'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

import { FOCUSABLE, dialogProps, dismissPolicy, wrapFocus, type DialogKind } from './blocks';
import { blockClasses } from './copy';

import './blocks.css';

/**
 * A dialog over the page.
 *
 * This is the block that is most often wrong when it is written from scratch,
 * and the mistakes are invisible to whoever wrote it because they all only
 * affect somebody using a keyboard or a screen reader.
 *
 * - **Focus goes in, and comes back.** It moves to the first control on open
 *   and returns to whatever opened the dialog on close. Without the second
 *   half, closing a dialog drops focus to the top of the document and the
 *   person has to tab all the way back to where they were.
 * - **Tab does not leave.** Off the last control, focus would otherwise land on
 *   the page behind — which is still there, still clickable, and being read out
 *   underneath a dialog the person believes they are inside.
 * - **Escape always closes**, whatever `kind` this is. A modal that can be
 *   opened from the keyboard and not closed from it has trapped somebody.
 * - **A click outside does not always close.** `dismissPolicy` decides, and for
 *   anything holding typed input or asking a real question the answer is no —
 *   a stray click throwing away a filled-in form is the commonest way people
 *   lose work in a web application.
 * - **The page behind does not scroll**, so the dialog is not a floating box
 *   over content sliding about underneath it.
 */
export function Dialog({
  kind,
  title,
  onClose,
  children,
  actions,
}: {
  kind: DialogKind;
  /** The heading. Also the dialog's accessible name — it is not optional. */
  title: string;
  onClose: () => void;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const policy = dismissPolicy(kind);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = (): HTMLElement[] => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));

    (controls()[0] ?? node).focus();

    const scrollWas = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && policy.escape) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = controls();
      // Nothing to tab to, so keep focus on the dialog rather than letting it
      // out onto the page behind.
      if (items.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }

      const here = items.findIndex((item) => item === document.activeElement);
      const next = wrapFocus(here, items.length, event.shiftKey ? -1 : 1);
      const target = items[next];
      if (target) {
        event.preventDefault();
        target.focus();
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = scrollWas;
      opener?.focus();
    };
  }, [onClose, policy.escape]);

  return (
    <div
      className={blockClasses.backdrop}
      onMouseDown={(event) => {
        // `onMouseDown` on the backdrop itself, not `onClick`: a click that
        // began inside the dialog and finished outside it — a text selection
        // dragged past the edge — is not somebody asking to close anything.
        if (policy.backdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div {...dialogProps(titleId)} className={blockClasses.dialog} ref={ref}>
        <h2 id={titleId}>{title}</h2>
        {children}
        {actions ? <div className={blockClasses.dialogActions}>{actions}</div> : null}
      </div>
    </div>
  );
}
