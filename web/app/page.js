// Home page. Signed-in users go straight to their campaigns.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/campaigns');

  return (
    <section className="hero">
      <p className="eyebrow">A Game Master&apos;s Grimoire</p>
      <h1>Enter the Vault</h1>
      <p className="lead">Chronicle your campaigns, guard your secrets, and keep every NPC and session close at hand when the dice start rolling.</p>
      <p className="muted">Sign in to see your campaigns.</p>
      <div className="actions">
        <Link href="/signup" className="button">Begin your chronicle</Link>
        <Link href="/login" className="button button-secondary">Log in</Link>
      </div>
    </section>
  );
}
