import { z } from 'zod';

import { field } from '@/seams/validate';

/** The shapes for swap requests, shared by the dialogs and the routes. */

export const CHOOSE_COLLEAGUE = 'Choose who would take this shift.';

export const SWAP_STATUSES = ['waiting', 'approved', 'turned_down'] as const;
export type SwapStatus = (typeof SWAP_STATUSES)[number];

export function toSwapStatus(value: string): SwapStatus {
  return (SWAP_STATUSES as readonly string[]).includes(value) ? (value as SwapStatus) : 'waiting';
}

export const askSwapSchema = z.object({
  shiftId: field.id(),
  toMemberId: z.string().min(1, CHOOSE_COLLEAGUE),
});
export type AskSwapInput = z.infer<typeof askSwapSchema>;

export const swapDecisionSchema = z.object({
  decision: z.enum(['approve', 'turn_down'], 'Choose approve or turn down.'),
});
export type SwapDecision = z.infer<typeof swapDecisionSchema>['decision'];

export const swapIdSchema = z.object({ swapId: field.id() });
