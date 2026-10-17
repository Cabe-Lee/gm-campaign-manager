// /campaigns/new: create a campaign (F4).
import CampaignForm from '../CampaignForm';
import { createCampaign } from '../actions';

export const metadata = { title: 'New campaign · GM Vault' };

export default function NewCampaignPage() {
  return (
    <section>
      <h1>New campaign</h1>
      <CampaignForm action={createCampaign} submitLabel="Create campaign" cancelHref="/campaigns" />
    </section>
  );
}
