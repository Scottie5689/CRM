<script>
  import { login } from '../lib/auth.svelte.js';
  import Footer from '../components/Footer.svelte';

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
  <form class="form-card" onsubmit={submit}>
    <div class="brand-row">
      <span class="wordmark">ScottV<span class="tld">.tech</span></span>
      <span class="badge-hero">CRM</span>
    </div>
    <h1>Sign in</h1>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <label>
      Username
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        required
        autofocus
        bind:value={email}
      />
    </label>
    <label>
      Password
      <input type="password" autocomplete="current-password" required bind:value={password} />
    </label>
    <button class="primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
  </form>
  <Footer />
</div>

<style>
  .wrap {
    min-height: 100vh;
    display: grid;
    grid-template-rows: 1fr auto;
    place-items: center;
    padding: 16px;
  }
  form {
    width: min(380px, 100%);
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 32px;
  }
  .brand-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }
  h1 {
    font-size: 20px;
    font-weight: 700;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    color: var(--muted);
  }
  /* Full-width form submit: Outfit Bold 16px */
  button {
    margin-top: 4px;
    padding: 14px 16px;
    font-size: 16px;
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
