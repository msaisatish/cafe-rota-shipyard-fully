/**
 * The decisions behind the three primitives, separated from the rendering.
 *
 * Every accessibility rule this component promises lives in a pure function
 * here, so it can be checked without a browser and so the check is about the
 * decision rather than about React. The `.tsx` files are thin wrappers that
 * call these — a wrapper cannot quietly disagree with the rule, because the
 * rule is the only place the props come from.
 */

export type ButtonTone = 'primary' | 'quiet' | 'danger';

export interface ButtonInput {
  tone?: ButtonTone;
  /** Working on it. Not the same as disabled, and it must say so. */
  busy?: boolean;
  disabled?: boolean;
  /** Set when the button toggles something on and off. */
  pressed?: boolean;
  /**
   * Required when the button's visible content is an icon.
   *
   * There is no default. A button whose only content is a symbol and whose
   * label we guessed is a button that reads as "button" to a screen reader.
   */
  label?: string;
  iconOnly?: boolean;
}

export interface ButtonAttributes {
  type: 'button';
  className: string;
  disabled: boolean;
  'aria-busy'?: true;
  'aria-pressed'?: boolean;
  'aria-label'?: string;
}

/**
 * What a button actually renders as.
 *
 * Three things are not negotiable and are done here rather than left to whoever
 * writes the next screen.
 *
 * `type="button"`. The HTML default is `submit`, so a button inside a form that
 * forgets it reloads the page — a bug that looks like the app losing the
 * founder's work and is reported as exactly that.
 *
 * **Busy is not disabled.** A disabled button is removed from the tab order and
 * announces nothing, so somebody using a screen reader gets silence where a
 * sighted user sees a spinner. `aria-busy` with the button still focusable says
 * what is happening.
 *
 * **An icon-only button must be given a name.** We refuse rather than invent
 * one: a wrong label is worse than a missing one, because nothing reports it.
 */
export function buttonProps(input: ButtonInput = {}): ButtonAttributes {
  const tone = input.tone ?? 'quiet';
  if (input.iconOnly && !input.label?.trim()) {
    throw new Error(
      'A button with only an icon needs a label, so people using a screen reader know what it does.',
    );
  }

  return {
    type: 'button',
    className: `ui-button ui-button-${tone}${input.busy ? ' is-busy' : ''}`,
    disabled: input.disabled === true,
    ...(input.busy ? { 'aria-busy': true as const } : {}),
    ...(input.pressed === undefined ? {} : { 'aria-pressed': input.pressed }),
    ...(input.label?.trim() ? { 'aria-label': input.label.trim() } : {}),
  };
}

export type StatusTone = 'ok' | 'warn' | 'danger' | 'neutral';

export interface StatusParts {
  tone: StatusTone;
  /** The word. Always rendered — this is what stops the colour being the message. */
  label: string;
  /** A shape, for people who cannot tell the colours apart. */
  mark: string;
  className: string;
  /** Live regions are for changes. A status that was always there is not news. */
  role?: 'status' | 'alert';
}

const MARKS: Record<StatusTone, string> = {
  ok: '✓',
  warn: '!',
  danger: '✕',
  neutral: '•',
};

/**
 * A status, which is never only a colour.
 *
 * The rule this exists to enforce: **no state is carried by colour alone.** A
 * red chip and a green chip are the same chip to somebody who cannot
 * distinguish them, and to anybody reading it on a bad projector. So a status
 * is a word plus a shape, and the colour is the third signal rather than the
 * only one.
 *
 * The label is required and is not defaulted from the tone. "Danger" is not a
 * status; "Payment failed" is.
 */
export function statusParts(tone: StatusTone, label: string, options: { announce?: boolean } = {}): StatusParts {
  const text = label.trim();
  if (!text) {
    throw new Error('A status needs a word. Colour on its own is not readable by everyone.');
  }
  return {
    tone,
    label: text,
    mark: MARKS[tone],
    className: `ui-status ui-status-${tone}`,
    // `alert` interrupts. Reserved for the one that is genuinely bad news,
    // because a screen reader that interrupts for every saved form is one
    // people switch off.
    ...(options.announce ? { role: tone === 'danger' ? ('alert' as const) : ('status' as const) } : {}),
  };
}

/**
 * Hidden from the screen, not from a screen reader.
 *
 * `display: none` and `visibility: hidden` remove the element from everybody,
 * including the people this is for. The clip-rect approach is the one that
 * leaves it in the accessibility tree.
 */
export const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
} as const;
