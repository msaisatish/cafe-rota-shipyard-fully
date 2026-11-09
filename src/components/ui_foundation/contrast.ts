/**
 * Is this text readable on this background?
 *
 * WCAG 2.1 contrast, computed rather than judged. The reason this is arithmetic
 * in a file instead of a designer's opinion is that the founder is going to
 * change the colours, and the moment they do, every "looks fine to me" made by
 * somebody looking at a bright monitor in a bright room stops applying.
 *
 * The one that catches people is muted text. Grey-on-white at the shade that
 * looks tasteful is usually about 3:1, which is unreadable for a real fraction
 * of people and merely tiring for everybody else.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** `#abc`, `#aabbcc` and `#aabbccff` all mean the same thing. */
export function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, '');
  const expand = hex.length === 3 || hex.length === 4 ? hex.split('').map((c) => c + c).join('') : hex;
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(expand)) return null;
  return {
    r: Number.parseInt(expand.slice(0, 2), 16),
    g: Number.parseInt(expand.slice(2, 4), 16),
    b: Number.parseInt(expand.slice(4, 6), 16),
  };
}

/** One channel, linearised. The 0.03928 threshold is the sRGB spec's, not a tuning. */
function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(colour: Rgb): number {
  return 0.2126 * channel(colour.r) + 0.7152 * channel(colour.g) + 0.0722 * channel(colour.b);
}

/**
 * The ratio between two colours, 1 to 21.
 *
 * Returns 0 when either colour cannot be read, so an unparseable value fails
 * every threshold rather than passing one. A typo in a theme file must not
 * produce a pass.
 */
export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return 0;
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** What a pair of colours is for, which is what decides the threshold. */
export type ContrastUse =
  /** Ordinary body text. */
  | 'text'
  /** Text at 18.66px bold or 24px and up. */
  | 'large-text'
  /** Borders, icons, focus rings — anything that carries meaning without words. */
  | 'non-text';

export const THRESHOLDS: Record<ContrastUse, number> = {
  text: 4.5,
  'large-text': 3,
  'non-text': 3,
};

export function meetsContrast(
  foreground: string,
  background: string,
  use: ContrastUse = 'text',
): boolean {
  return contrastRatio(foreground, background) >= THRESHOLDS[use];
}

/** One readable-enough pair that is not. */
export interface ContrastProblem {
  /** e.g. `muted on bg`. */
  pair: string;
  ratio: number;
  needs: number;
  /** Said to whoever edited the theme, not to a developer. */
  says: string;
}

export function describeProblem(
  pair: string,
  foreground: string,
  background: string,
  use: ContrastUse,
): ContrastProblem | null {
  const ratio = contrastRatio(foreground, background);
  const needs = THRESHOLDS[use];
  if (ratio >= needs) return null;
  return {
    pair,
    ratio: Math.round(ratio * 100) / 100,
    needs,
    says:
      ratio === 0
        ? `${pair}: "${foreground}" or "${background}" is not a colour this can read. Use a hex value like #1f5fd0.`
        : `${pair}: too close together to read (${Math.round(ratio * 100) / 100}:1, needs ${needs}:1). Make one of them darker or lighter.`,
  };
}
