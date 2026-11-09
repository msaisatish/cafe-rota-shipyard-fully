import Link from 'next/link';

import '@/components/auth_screens/auth-screens.css';

/**
 * The page for an address the app does not have. Next's own is a bare white
 * "404 / This page could not be found." that looks broken. It answers with
 * status 404; only the words and the look are ours.
 */
export default function NotFound() {
  return (
    <main className="auth-screen">
      <div className="auth-card">
        <h1>This page is not here</h1>
        <p className="auth-lede">The address may be mistyped, or the page may have moved.</p>
        <p className="auth-alt">
          <Link href="/">Open Café rota</Link>
        </p>
      </div>
    </main>
  );
}
