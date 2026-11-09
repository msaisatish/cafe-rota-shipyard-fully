import { z } from 'zod';

import { field } from '@/seams/validate';

/**
 * The shapes for the staff list, shared by the forms and the routes.
 *
 * The full password rule (length, mix, common passwords) is checked on the
 * server by the auth component's `checkPassword`; these schemas only stop an
 * empty box, so the browser bundle never carries the hashing library.
 */

export const MEMBER_ROLES = ['manager', 'staff'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** A person on the café's staff list, as the rest of the app sees them. */
export interface CafeMember {
  id: string;
  userId: string;
  name: string;
  role: MemberRole;
  mustChangePassword: boolean;
  removedAt: Date | null;
  createdAt: Date;
}

export const addStaffSchema = z.object({
  name: field.requiredText('their name').max(80, 'Please keep the name under 80 characters.'),
  email: field.email(),
  startingPassword: z.string().min(1, 'Please choose a starting password.'),
});
export type AddStaffInput = z.infer<typeof addStaffSchema>;

export const removeMemberSchema = z.object({
  memberId: field.id(),
});
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

export const choosePasswordSchema = z
  .object({
    password: z.string().min(1, 'Please choose a password.'),
    confirmPassword: z.string().min(1, 'Please type your new password again.'),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "The two passwords don't match.",
    path: ['confirmPassword'],
  });
export type ChoosePasswordInput = z.infer<typeof choosePasswordSchema>;
