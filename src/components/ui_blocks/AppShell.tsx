import Link from 'next/link';
import type { ReactNode } from 'react';

import { MAIN_ID, navigation, type NavItem } from './blocks';
import { blockClasses, shellCopy } from './copy';

import './blocks.css';

/**
 * The frame every page sits in.
 *
 * Thin on purpose: which item is current is decided in `blocks.ts`, where it is
 * checked without a browser.
 *
 * Three things this file has to get right, all of them for people not using a
 * mouse:
 *
 * - the **skip link** is the first thing in the document, so a keyboard user
 *   can jump past the menu instead of tabbing through it on every page;
 * - `<main>` carries `tabIndex={-1}`, because without it the skip link moves
 *   the scroll position and leaves focus behind in the navigation — the link
 *   appears to work and does nothing for the person who needs it;
 * - `aria-current="page"` comes from the data, not from the class. The
 *   highlight is decoration.
 */
export function AppShell({
  items,
  path,
  children,
}: {
  items: readonly NavItem[];
  /** The path being shown. From `usePathname()` in a client page, or the route. */
  path: string;
  children: ReactNode;
}) {
  const links = navigation(items, path);

  return (
    <>
      <a className={blockClasses.skip} href={`#${MAIN_ID}`}>
        {shellCopy.skipToContent}
      </a>
      <div className={blockClasses.shell}>
        <nav className={blockClasses.shellNav} aria-label={shellCopy.navigationLabel}>
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={
                    link.current
                      ? `${blockClasses.navLink} ${blockClasses.navLinkCurrent}`
                      : blockClasses.navLink
                  }
                  aria-current={link['aria-current']}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main id={MAIN_ID} className={blockClasses.shellMain} tabIndex={-1}>
          {children}
        </main>
      </div>
    </>
  );
}
