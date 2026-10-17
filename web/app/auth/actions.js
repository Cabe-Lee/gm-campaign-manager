'use server';
// Server Actions for sign up, log in and log out (F2).
// Forms call these functions directly; they run on the server.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only allow redirects to pages on this site (no open redirect, F2 security).
function safeNext(next) {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')
    ? next
    : '/campaigns';
}

export async function signup(prevState, formData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const values = { name, email };

  // Validation (F2 FR-1)
  const fields = {};
  if (name.length < 1 || name.length > 60) fields.name = 'Name is required (up to 60 characters).';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) fields.email = 'Enter a valid email address.';
  if (password.length < 8 || password.length > 72) fields.password = 'Password must be 8 to 72 characters.';
  if (Object.keys(fields).length > 0) {
    return { message: 'Please fix the fields below.', fields, values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }, // the database trigger copies this into profiles
  });

  if (error) {
    const taken = error.code === 'user_already_exists' || /already registered/i.test(error.message);
    return {
      message: taken ? 'An account with that email already exists.' : error.message,
      fields: taken ? { email: 'This email is already in use.' } : {},
      values,
    };
  }

  // If "Confirm email" is still on in Supabase, there's no session yet.
  if (!data.session) {
    return {
      message: 'Account created. Check your email to confirm it, then log in.',
      fields: {},
      values,
    };
  }

  revalidatePath('/', 'layout');
  redirect('/campaigns');
}

export async function login(prevState, formData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = formData.get('next');

  if (!email || !password) {
    return { message: 'Enter your email and password.', values: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Same message for a wrong email or a wrong password (F2 AC-5).
    return { message: 'Email or password is incorrect.', values: { email } };
  }

  revalidatePath('/', 'layout');
  redirect(safeNext(next));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
