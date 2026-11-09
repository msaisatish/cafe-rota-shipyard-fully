/**
 * The one place a colour, a radius or a spacing step is decided.
 *
 * Everything visual in this project reads from here. Not from a second palette
 * in a stylesheet, not from a hex code typed into a component — a project with
 * two sources of design truth has none, and the second one is always the one
 * nobody maintains.
 *
 * **The names come from the starter template**, not from this component. The
 * template already published `--bg`, `--fg`, `--muted` and `--line`, and code
 * may already use them. Adopting them means installing this changes nothing
 * that was already working; inventing `--color-background` alongside them would
 * have left the project with both.
 *
 * To change how the app looks, edit `src/theme.ts`. That file is yours. This
 * one belongs to the component and an upgrade will replace it.
 */

/**
 * The colours, as hex.
 *
 * Hex rather than `oklch` on purpose: the contrast check that runs against
 * these is arithmetic on sRGB, and a format that needs a colour-space
 * conversion before it can be checked is a format where the check quietly stops
 * being exact.
 */
export interface Palette {
  /** The page. */
  bg: string;
  /** A panel or card sitting on the page. */
  surface: string;
  /** Body text. */
  fg: string;
  /** Secondary text. Still has to be readable — this is the one people get wrong. */
  muted: string;
  /** Borders and rules. */
  line: string;
  /** The one colour that means "this is the thing to press". */
  accent: string;
  /** Text on top of `accent`. */
  accentFg: string;
  ok: string;
  okFg: string;
  warn: string;
  warnFg: string;
  danger: string;
  dangerFg: string;
  /** The focus ring. Has to be visible against the page, not merely present. */
  focus: string;
}

export interface Tokens {
  light: Palette;
  dark: Palette;
  /** Corner rounding, as a CSS length. */
  radius: string;
  /** The base spacing step. Everything else is a multiple of it. */
  space: string;
  /** Body font stack. A theme may replace it; it must end in a generic family. */
  fontFamily: string;
  /** Body size. */
  fontSize: string;
  /** Line height, unitless. */
  lineHeight: string;
}

/**
 * The default look: quiet, high contrast, no brand.
 *
 * Deliberately unopinionated. A founder's first screenshot should look like a
 * plain, competent application rather than like a template they downloaded —
 * the first thing they will want to change is the accent colour, and they
 * change it in one place.
 */
export const defaultTokens: Tokens = {
  light: {
    bg: '#ffffff',
    surface: '#f7f8fa',
    fg: '#14181f',
    muted: '#5b6472',
    line: '#e3e7ec',
    accent: '#1f5fd0',
    accentFg: '#ffffff',
    ok: '#e6f4ea',
    okFg: '#1b5e34',
    warn: '#fdf3e0',
    warnFg: '#7a4f0c',
    danger: '#fdecec',
    dangerFg: '#96201f',
    focus: '#1f5fd0',
  },
  dark: {
    bg: '#101318',
    surface: '#171b22',
    fg: '#e9edf3',
    muted: '#a9b3c1',
    line: '#262c35',
    accent: '#89b4ff',
    accentFg: '#0b1020',
    ok: '#12301f',
    okFg: '#8fe0ad',
    warn: '#33260f',
    warnFg: '#f0c674',
    danger: '#3a1a1a',
    dangerFg: '#ffb3b0',
    focus: '#89b4ff',
  },
  radius: '0.5rem',
  space: '0.25rem',
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontSize: '16px',
  lineHeight: '1.6',
};
