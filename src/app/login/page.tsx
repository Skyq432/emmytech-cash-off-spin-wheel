import { login } from "./actions";
import "./login.css";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  return (
    <main className="auth-shell">
      <form action={login} className="auth-card">
        <p className="auth-kicker">EmmyTech</p>
        <h1>Admin sign in</h1>
        <p className="auth-copy">Use your authorized Supabase account to continue.</p>
        {params.error ? <p className="auth-error" role="alert">{params.error}</p> : null}
        <input type="hidden" name="next" value={params.next || "/emmy40"} />
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
