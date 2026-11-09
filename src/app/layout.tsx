import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ThemeStyles } from '@/seams/theme';

import './globals.css';

export const metadata: Metadata = {
  title: 'Café rota',
  description: "The café's week of shifts: who is on when, and swaps the manager approves.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeStyles />
      </head>
      <body>{children}</body>
    </html>
  );
}
