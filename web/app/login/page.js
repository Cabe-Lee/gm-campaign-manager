// /login page (F2). Reads ?next= so users return to where they were going.
import LoginForm from './LoginForm';

export const metadata = { title: 'Log in · GM Vault' };

export default async function LoginPage({ searchParams }) {
  const { next } = await searchParams;

  return (
    <section className="auth">
      <h1>Log in</h1>
      <LoginForm next={typeof next === 'string' ? next : ''} />
    </section>
  );
}
