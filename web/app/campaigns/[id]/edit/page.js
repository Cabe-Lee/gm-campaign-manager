// /campaigns/[id]/edit: edit and delete a campaign (F4).
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CampaignForm from '../../CampaignForm';
import { updateCampaign } from '../../actions';
import DeleteCampaign from './DeleteCampaign';

export const metadata = { title: 'Edit campaign · GM Vault' };

export default async function EditCampaignPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, title, description, tags')
    .eq('id', id)
    .maybeSingle();

  if (!campaign) notFound();

  return (
    <section>
      <h1>Edit campaign</h1>
      <CampaignForm
        action={updateCampaign.bind(null, campaign.id)}
        initial={campaign}
        submitLabel="Save changes"
        cancelHref={`/campaigns/${campaign.id}`}
      />
      <DeleteCampaign id={campaign.id} title={campaign.title} />
    </section>
  );
}
