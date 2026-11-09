/** What the swap screens show, safe to send to the browser. No database here. */

import type { StaffChoice } from '@/lib/rota/plan';
import type { SwapStatus } from './schema';

/** One row on the manager's Swap requests screen. */
export interface SwapRow {
  id: string;
  /** "Tue 12 Nov 08:00–14:00", for the table */
  shift: string;
  /** "Tuesday 12 Nov 08:00–14:00", for the dialogs */
  shiftInFull: string;
  from: string;
  to: string;
  status: SwapStatus;
}

/** One of a staff member's own requests, under My swap requests. */
export interface MySwap {
  id: string;
  /** "Tuesday 12 Nov 08:00–14:00" */
  shift: string;
  to: string;
  status: SwapStatus;
}

export interface MySwapsView {
  /** Newest first. */
  requests: MySwap[];
  /** Shifts that already have a waiting request: no second Ask to swap. */
  waitingShiftIds: string[];
  /** Who this person could ask: current staff other than themselves. */
  colleagues: StaffChoice[];
}
