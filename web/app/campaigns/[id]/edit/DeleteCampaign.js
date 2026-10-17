'use client';
// Delete with type-to-confirm (F4 FR-9). The button stays disabled until the title matches.
import { useActionState, useState } from 'react';
import { deleteCampaign } from '../../actions';

export default function DeleteCampaign({ id, title }) {
  const [typed, setTyped] = useState('');
  const [state, formAction, pending] = useActionState(deleteCampaign.bind(null, id), null);

  return (
    <form action={formAction} className="danger-zone">
      <h2>Delete campaign</h2>
      <p>
        This can&apos;t be undone. Type <strong>{title}</strong> to confirm.
      </p>
      {state?.message && <p className="alert" role="alert">{state.message}</p>}
      <label className="field">
        <span className="visually-hidden">Campaign title</span>
        <input
          name="confirm"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
        />
      </label>
      <button type="submit" className="button button-danger" disabled={typed !== title || pending}>
        {pending ? 'Deleting…' : 'Delete campaign'}
      </button>
    </form>
  );
}
