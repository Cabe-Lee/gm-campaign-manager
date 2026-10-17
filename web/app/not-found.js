// Shown for unknown pages and for campaigns you can't access (F1 AC-7, F4 AC-4).
import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="centered">
      <h1>We couldn&apos;t find that page.</h1>
      <p className="muted">It may not exist, or you may not have access to it.</p>
      <Link href="/campaigns" className="button">Go to Campaigns</Link>
    </section>
  );
}
