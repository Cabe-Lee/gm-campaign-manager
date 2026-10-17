// App header from the wireframe: search icon, "Campaigns" link, Login / user menu (F1, F2).
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/auth/actions';

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .maybeSingle();
    name = profile?.name ?? user.email;
  }

  return (
    <header className="site-header">
      <nav className="nav" aria-label="Main">
        <div className="nav-left">
          <Link href="/" className="brand">
            <svg className="brand-sigil" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <polygon points="12,6 17.5,15.5 6.5,15.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            GM Vault
          </Link>
          <button type="button" className="icon-button" aria-label="Search (coming soon)" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/campaigns">Campaigns</Link>
        </div>
        <div className="nav-right">
          {user ? (
            <>
              <span className="user-name">{name}</span>
              <form action={logout}>
                <button type="submit" className="link-button">Log out</button>
              </form>
            </>
          ) : (
            <Link href="/login">Login</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
