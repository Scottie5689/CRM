<script>
  import { login } from '../lib/auth.svelte.js';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let busy = $state(false);

  async function submit(e) {
    e.preventDefault();
    error = '';
    busy = true;
    try {
      await login(email, password);
    } catch (err) {
      error = err.message;
      password = '';
    } finally {
      busy = false;
    }
  }
</script>

<div class="wrap">
  <form class="card" onsubmit={submit}>
    <div class="brand"><span>CRM</span></div>
    <h1>Sign in</h1>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <label>
      Email
      <!-- svelte-ignore a11y_autofocus -->
      <input type="email" autocomplete="username" required autofocus bind:value={email} />
    </label>
    <label>
      Password
      <input type="password" autocomplete="current-password" required bind:value={password} />
    </label>
    <button class="primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
  </form>
</div>

<style>
  .wrap {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 16px;
  }
  form {
    width: min(380px, 100%);
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 28px;
  }
  .brand {
    font-weight: 800;
    font-size: 1.1rem;
  }
  .brand span {
    color: var(--accent);
    margin-left: 2px;
  }
  h1 {
    font-size: 1.3rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--muted);
  }
  button {
    margin-top: 4px;
    padding: 9px 14px;
  }
  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  .error {
    margin: 0;
    padding: 8px 12px;
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    color: var(--danger);
    font-size: 0.875rem;
  }
</style>
