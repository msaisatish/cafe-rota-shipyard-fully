import { z } from 'zod';

import { field } from '@/seams/validate';
import { isLocalDate, isLocalTime, isMonday } from '@/lib/cafe-time/time';

/** The shapes for planning a week, shared by the dialogs and the routes. */

export const END_BEFORE_START = 'The end time must be after the start time.';
export const CHOOSE_WHO = 'Choose who is working.';

const weekStart = z.string().refine(isMonday, 'That week could not be found.');
const time = (label: string) =>
  z.string().refine(isLocalTime, `Please enter ${label} as hours and minutes.`);

export const weekQuerySchema = z.object({ week: weekStart.optional() });
export type WeekQuery = z.infer<typeof weekQuerySchema>;

export const publishWeekSchema = z.object({ weekStart });
export type PublishWeekInput = z.infer<typeof publishWeekSchema>;

// Shifts start and end on the same day, so "HH:MM" strings compare in time order.
export const addShiftSchema = z
  .object({
    day: z.string().refine(isLocalDate, 'Choose the day of the shift.'),
    startTime: time('a start time'),
    endTime: time('an end time'),
    memberId: z.string().min(1, CHOOSE_WHO),
  })
  .refine((shift) => shift.endTime > shift.startTime, {
    message: END_BEFORE_START,
    path: ['endTime'],
  });
export type AddShiftInput = z.infer<typeof addShiftSchema>;

export const removeShiftSchema = z.object({ shiftId: field.id() });
export type RemoveShiftInput = z.infer<typeof removeShiftSchema>;
