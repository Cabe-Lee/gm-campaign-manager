'use client';
// Sign-up form with field-level error messages (F2 AC-3).
import { useActionState } from 'react';
import Link from 'next/link';
import { signup } from '@/app/auth/actions';
import FieldError from '@/components/FieldError';

export default function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, null);
  const fields = state?.fields ?? {};

  return (
    <form action={formAction} className="form" noValidate>
      {state?.message && (
        <p className="alert" role="alert">{state.message}</p>
      )}

      <label className="field">
        <span>Name</span>
        <input
          name="name"
          autoComplete="name"
          maxLength={60}
          defaultValue={state?.values?.name ?? ''}
          aria-invalid={Boolean(fields.name)}
          aria-describedby={fields.name ? 'name-error' : undefined}
          required
        />
        <FieldError id="name-error" message={fields.name} />
      </label>

      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state?.values?.email ?? ''}
          aria-invalid={Boolean(fields.email)}
          aria-describedby={fields.email ? 'email-error' : undefined}
          required
        />
        <FieldError id="email-error" message={fields.email} />
      </label>

      <label className="field">
        <span>Password <small className="muted">(at least 8 characters)</small></span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(fields.password)}
          aria-describedby={fields.password ? 'password-error' : undefined}
          required
        />
        <FieldError id="password-error" message={fields.password} />
      </label>

      <button type="submit" className="button" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="muted">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </form>
  );
}
