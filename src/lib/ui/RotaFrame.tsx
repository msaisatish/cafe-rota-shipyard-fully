'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { AppShell } from '@/components/ui_blocks/AppShell';
import type { NavItem } from '@/components/ui_blocks/blocks';
import { SignOutButton } from './SignOutButton';

import './frame.css';

/** The top bar (app name, Sign out) over the ui_blocks frame with its links. */
export function RotaFrame({ items, children }: { items: readonly NavItem[]; children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="rota-frame">
      <header className="rota-bar">
        <span className="rota-name">Café rota</span>
        <SignOutButton />
      </header>
      <AppShell items={items} path={path}>
        {children}
      </AppShell>
    </div>
  );
}
