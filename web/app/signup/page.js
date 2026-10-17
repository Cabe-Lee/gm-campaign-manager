// /signup page (F2).
import SignupForm from './SignupForm';

export const metadata = { title: 'Sign up · GM Vault' };

export default function SignupPage() {
  return (
    <section className="auth">
      <h1>Create an account</h1>
      <SignupForm />
    </section>
  );
}
