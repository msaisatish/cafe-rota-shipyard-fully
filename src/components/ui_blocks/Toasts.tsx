'use client';

import { useEffect, useState } from 'react';

import { buttonProps } from '@/components/ui_foundation/primitives';

import { addToast, dismissAfter, toastAria, toastMotion, type Toast } from './blocks';
import { blockClasses, toastCopy } from './copy';

import './blocks.css';

/**
 * The messages that appear in the corner.
 *
 * The rules are all in `blocks.ts`: bad news never dismisses itself, everything
 * else gets reading time rather than a constant three seconds, an error is
 * never dropped to make room, and the same message twice running is one
 * message.
 *
 * What this component cannot enforce, and the README says so plainly: **a toast
 * must never be the only place something is said.** It is unreachable once it
 * has gone, invisible to somebody who was looking at another part of the
 * screen, and gone from the page for anybody arriving late. Anything that
 * matters belongs on the page as well.
 */
export function useToasts(max = 3) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  return {
    toasts,
    show: (toast: Toast) => setToasts((list) => addToast(list, toast, max)),
    dismiss: (id: string) => setToasts((list) => list.filter((one) => one.id !== id)),
  };
}

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: readonly Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    // The region exists before there is anything in it. A live region added to
    // the page at the same moment as its first message is frequently not
    // announced at all — the screen reader never saw it arrive.
    <div className={blockClasses.toastRegion} aria-label={toastCopy.regionLabel}>
      {toasts.map((toast) => (
        <ToastMessage key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastMessage({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const reduced = usePrefersReducedMotion();
  const motion = toastMotion(reduced);

  useEffect(() => {
    const after = dismissAfter(toast);
    if (after === null) return;
    const timer = setTimeout(() => onDismiss(toast.id), after);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      className={blockClasses.toast}
      data-tone={toast.tone}
      style={{ transition: motion.transition }}
      {...toastAria(toast.tone)}
    >
      <span>{toast.text}</span>
      {toast.action ? <button {...buttonProps({ tone: 'quiet' })}>{toast.action.label}</button> : null}
      {/*
        Every message can be closed by hand, including the ones that would go on
        their own. Somebody who reads slowly needs to be able to clear it, and
        somebody who cannot see it needs a way out of the live region.
      */}
      <button
        {...buttonProps({ tone: 'quiet', iconOnly: true, label: toastCopy.dismiss })}
        onClick={() => onDismiss(toast.id)}
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}

/**
 * Whether this person has asked for less movement.
 *
 * Read from the browser rather than guessed, and re-read when it changes: the
 * setting can be turned on while the page is open, usually by somebody who has
 * just been made to feel unwell by something on it.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const listen = (event: MediaQueryListEvent): void => setReduced(event.matches);
    query.addEventListener('change', listen);
    return () => query.removeEventListener('change', listen);
  }, []);

  return reduced;
}
