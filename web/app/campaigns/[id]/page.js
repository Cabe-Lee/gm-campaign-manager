// /campaigns/[id]: campaign overview (F4).
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const TABS = ['NPCs', 'Encounters', 'Session notes', 'Chat', 'Players'];

export default async function CampaignPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  // Another user's campaign or a bad id returns nothing, so we show "not found" (F4 AC-4, AC-9).
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!campaign) notFound();

  return (
    <article>
      <p><Link href="/campaigns">← All campaigns</Link></p>

      <div className="page-header">
        <h1>{campaign.title}</h1>
        <Link href={`/campaigns/${campaign.id}/edit`} className="button button-secondary">Edit</Link>
      </div>

      {campaign.tags.length > 0 && (
        <ul className="tags" aria-label="Tags">
          {campaign.tags.map((tag) => (
            <li key={tag} className="tag">{tag}</li>
          ))}
        </ul>
      )}

      {campaign.description ? (
        <p className="description">{campaign.description}</p>
      ) : (
        <p className="muted">No description yet.</p>
      )}

      <p className="muted small">
        Created {new Date(campaign.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
      </p>

      <nav className="tabs" aria-label="Campaign sections">
        {TABS.map((tab) => (
          <span key={tab} className="tab" aria-disabled="true">{tab}</span>
        ))}
      </nav>
      <p className="muted">NPCs, encounters, notes, chat and players are coming in later features.</p>
    </article>
  );
}
