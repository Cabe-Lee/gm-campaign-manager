'use client';
// Login form. useActionState shows what the login Server Action returned.
import { useActionState } from 'react';
import Link from 'next/link';
import { login } from '@/app/auth/actions';

export default function LoginForm({ next }) {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction} className="form" noValidate>
      {state?.message && (
        <p className="alert" role="alert">{state.message}</p>
      )}

      <input type="hidden" name="next" value={next ?? ''} />

      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state?.values?.email ?? ''}
          required
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>

      <button type="submit" className="button" disabled={pending}>
        {pending ? 'Signing in…' : 'Log in'}
      </button>

      <p className="muted">
        No account yet? <Link href="/signup">Create an account</Link>
      </p>
    </form>
  );
}
