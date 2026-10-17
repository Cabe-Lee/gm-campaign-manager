// /campaigns dashboard (F4 FR-3, FR-8). Lists the signed-in GM's campaigns, newest first.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Campaigns · GM Vault' };

function preview(text) {
  if (!text) return '';
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

export default async function CampaignsPage() {
  const supabase = await createClient();
  // No "where gm_id = me" needed: Row Level Security only returns this user's rows.
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, title, description, tags, created_at')
    .order('created_at', { ascending: false });

  return (
    <section>
      <div className="page-header">
        <h1>Campaigns</h1>
        {campaigns?.length > 0 && (
          <Link href="/campaigns/new" className="button">New campaign</Link>
        )}
      </div>

      {error && (
        <div className="alert" role="alert">
          <p>We couldn&apos;t load your campaigns.</p>
          <Link href="/campaigns" className="button">Try again</Link>
        </div>
      )}

      {!error && campaigns.length === 0 && (
        <div className="empty-state">
          <p>No campaigns yet</p>
          <p className="muted">The vault stands empty. Every legend starts with a first page.</p>
          <Link href="/campaigns/new" className="button">Create your first campaign</Link>
        </div>
      )}

      {!error && campaigns.length > 0 && (
        <ul className="card-grid">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link href={`/campaigns/${campaign.id}`} className="card">
                <h2>{campaign.title}</h2>
                {campaign.description && <p>{preview(campaign.description)}</p>}
                {campaign.tags.length > 0 && (
                  <ul className="tags" aria-label="Tags">
                    {campaign.tags.map((tag) => (
                      <li key={tag} className="tag">{tag}</li>
                    ))}
                  </ul>
                )}
                <p className="muted small">
                  GM · Created {new Date(campaign.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
