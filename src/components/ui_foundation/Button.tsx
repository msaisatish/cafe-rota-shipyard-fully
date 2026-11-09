import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { buttonProps, type ButtonInput } from './primitives';

/**
 * A button.
 *
 * Thin on purpose. Every rule it follows — `type="button"`, busy-is-not-
 * disabled, an icon-only button must be named — lives in `buttonProps`, where
 * it can be checked without a browser. This file only renders what that
 * returns, so it cannot quietly disagree with it.
 */
type Props = ButtonInput & {
  children?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled' | 'className'>;

export function Button({ tone, busy, disabled, pressed, label, iconOnly, children, ...rest }: Props) {
  const props = buttonProps({ tone, busy, disabled, pressed, label, iconOnly });
  return (
    <button {...rest} {...props}>
      {children}
    </button>
  );
}
