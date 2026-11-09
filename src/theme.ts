/**
 * Your theme. This file is yours.
 *
 * Change a colour here and it changes everywhere — buttons, borders, statuses,
 * the lot. You do not have to fill it in: anything you leave out keeps the
 * default, so setting one line is a perfectly good theme.
 *
 * Shipyard will never overwrite this file, including when the ui_foundation
 * component is upgraded.
 *
 * ```ts
 * export const theme: ThemeOverrides = {
 *   light: { accent: '#7a3cc0', accentFg: '#ffffff' },
 *   dark: { accent: '#c9a6f0', accentFg: '#1a1024' },
 *   radius: '0.25rem',
 * };
 * ```
 *
 * One rule, and it is enforced rather than advised: **a colour pairing that
 * cannot be read does not load.** If you pick a text colour that disappears
 * into its background, that one colour goes back to the default and the app
 * tells you which pair was the problem. Nothing you can write here can make a
 * screen unreadable.
 */
import type { ThemeOverrides } from './components/ui_foundation/merge';

export const theme: ThemeOverrides = {};
