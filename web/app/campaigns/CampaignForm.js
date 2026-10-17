'use client';
// Shared form for creating and editing a campaign (F4).
import { useActionState } from 'react';
import Link from 'next/link';
import FieldError from '@/components/FieldError';

export default function CampaignForm({ action, initial = {}, submitLabel, cancelHref }) {
  const [state, formAction, pending] = useActionState(action, null);
  const fields = state?.fields ?? {};
  const values = state?.values ?? {
    title: initial.title ?? '',
    description: initial.description ?? '',
    tags: (initial.tags ?? []).join(', '),
  };

  return (
    <form action={formAction} className="form form-wide" noValidate>
      {state?.message && (
        <p className="alert" role="alert">{state.message}</p>
      )}

      <label className="field">
        <span>Title</span>
        <input
          name="title"
          maxLength={100}
          defaultValue={values.title}
          aria-invalid={Boolean(fields.title)}
          aria-describedby={fields.title ? 'title-error' : undefined}
          required
        />
        <FieldError id="title-error" message={fields.title} />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          name="description"
          rows={6}
          maxLength={2000}
          defaultValue={values.description}
          aria-invalid={Boolean(fields.description)}
          aria-describedby={fields.description ? 'description-error' : undefined}
        />
        <FieldError id="description-error" message={fields.description} />
      </label>

      <label className="field">
        <span>Tags <small className="muted">(separate with commas, e.g. horror, 5e)</small></span>
        <input
          name="tags"
          defaultValue={values.tags}
          aria-invalid={Boolean(fields.tags)}
          aria-describedby={fields.tags ? 'tags-error' : undefined}
        />
        <FieldError id="tags-error" message={fields.tags} />
      </label>

      <div className="actions">
        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </button>
        <Link href={cancelHref} className="button button-secondary">Cancel</Link>
      </div>
    </form>
  );
}
