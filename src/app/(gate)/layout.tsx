import type { ReactNode } from 'react';

import '@/components/auth_screens/auth-screens.css';
import '@/lib/ui/frame.css';

export const dynamic = 'force-dynamic';

/** The centred one-card screens a person sees before the app opens to them. */
export default function GateLayout({ children }: { children: ReactNode }) {
  return <main className="auth-screen">{children}</main>;
}
