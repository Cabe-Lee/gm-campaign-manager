'use server';
// Server Actions for campaigns (F4): create, update, delete.
// Row Level Security in Supabase makes sure users can only touch their own campaigns.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Reads the form and checks the rules from F4 FR-1 and FR-2.
function readCampaignForm(formData) {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const tagsInput = String(formData.get('tags') ?? '');

  // " Horror, horror, 5e" -> ["horror", "5e"]
  const tags = [
    ...new Set(
      tagsInput
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];

  const fields = {};
  if (title.length < 1) fields.title = 'Title is required.';
  else if (title.length > 100) fields.title = 'Title must be 100 characters or fewer.';
  if (description.length > 2000) fields.description = 'Description must be 2000 characters or fewer.';
  if (tags.length > 10) fields.tags = 'Use 10 tags or fewer.';
  else if (tags.some((tag) => tag.length > 30)) fields.tags = 'Each tag must be 30 characters or fewer.';

  return {
    data: { title, description, tags },
    values: { title, description, tags: tagsInput },
    fields,
  };
}

export async function createCampaign(prevState, formData) {
  const { data, values, fields } = readCampaignForm(formData);
  if (Object.keys(fields).length > 0) {
    return { message: 'Please fix the fields below.', fields, values };
  }

  const supabase = await createClient();
  // gm_id is filled in by the database (default auth.uid()), never by the browser.
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert(data)
    .select('id')
    .single();

  if (error) {
    return { message: 'Could not create the campaign. Please try again.', fields: {}, values };
  }

  revalidatePath('/campaigns');
  redirect(`/campaigns/${campaign.id}`);
}

// Used as updateCampaign.bind(null, id) so the form knows which campaign it edits.
export async function updateCampaign(id, prevState, formData) {
  const { data, values, fields } = readCampaignForm(formData);
  if (Object.keys(fields).length > 0) {
    return { message: 'Please fix the fields below.', fields, values };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from('campaigns')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error || !updated) {
    return { message: 'Could not save your changes. Please try again.', fields: {}, values };
  }

  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${id}`);
  redirect(`/campaigns/${id}`);
}

export async function deleteCampaign(id, prevState, formData) {
  const confirmText = String(formData.get('confirm') ?? '');
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('title')
    .eq('id', id)
    .maybeSingle();

  if (!campaign) {
    return { message: 'That campaign no longer exists.' };
  }
  // Double-check on the server that the user typed the title (F4 FR-9).
  if (confirmText !== campaign.title) {
    return { message: 'Type the campaign title exactly to confirm.' };
  }

  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) {
    return { message: 'Could not delete the campaign. Please try again.' };
  }

  revalidatePath('/campaigns');
  redirect('/campaigns');
}
