/**
 * The theme seam, now implemented.
 *
 * This file replaced the stub that rendered nothing. The root layout already
 * renders `<ThemeStyles />` from `@/seams/theme`, so the colours, corners and
 * spacing reach every page the moment this component is installed, with no
 * edit to the layout. Before 1.2.0 that line had to be added by hand, and a
 * table installed without it showed with none of the values its stylesheet
 * uses.
 *
 * No stub marker here, and that absence is load-bearing: it stops a later
 * install replacing a file that now does something.
 */
export { ThemeStyles } from '@/components/ui_foundation/Styles';
