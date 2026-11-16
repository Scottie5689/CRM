<script>
  import { auth, logout, changePassword } from '../lib/auth.svelte.js';
  import { flash } from '../lib/db.svelte.js';
  import Modal from './Modal.svelte';

  let changing = $state(false);
  let current = $state('');
  let next = $state('');
  let confirmNext = $state('');
  let error = $state('');
  let busy = $state(false);

  function open() {
    current = next = confirmNext = error = '';
    changing = true;
  }

  async function submit(e) {
    e.preventDefault();
    error = '';
    if (next !== confirmNext) return (error = 'New passwords do not match');
    busy = true;
    try {
      await changePassword(current, next);
      changing = false;
      flash('Password changed. Other devices have been signed out.');
    } catch (err) {
      error = err.message;
    } finally {
      busy = false;
    }
  }
</script>

<details class="account">
  <summary title={auth.user?.email}>{auth.user?.email}</summary>
  <button class="ghost" onclick={open}>Change password</button>
  <button class="ghost" onclick={logout}>Sign out</button>
</details>

{#if changing}
  <Modal title="Change password" onclose={() => (changing = false)}>
    <form class="form" onsubmit={submit}>
      {#if error}<p class="full error" role="alert">{error}</p>{/if}
      <input type="email" autocomplete="username" value={auth.user?.email} hidden readonly />
      <label class="full">
        Current password
        <input type="password" autocomplete="current-password" required bind:value={current} />
      </label>
      <label>
        New password
        <input type="password" autocomplete="new-password" minlength="10" required bind:value={next} />
      </label>
      <label>
        Confirm new password
        <input type="password" autocomplete="new-password" minlength="10" required bind:value={confirmNext} />
      </label>
      <p class="full hint-text">At least 10 characters.</p>
      <footer>
        <span class="spacer"></span>
        <button type="button" class="ghost" onclick={() => (changing = false)}>Cancel</button>
        <button type="submit" class="primary" disabled={busy}>Save</button>
      </footer>
    </form>
  </Modal>
{/if}

<style>
  .account {
    font-size: 0.85rem;
  }
  summary {
    cursor: pointer;
    color: var(--muted);
    padding: 6px 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .account button {
    display: block;
    width: 100%;
    text-align: left;
    font-size: 0.85rem;
  }
  .error {
    margin: 0;
    padding: 8px 12px;
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    color: var(--danger);
    font-size: 0.875rem;
  }
  .hint-text {
    margin: -4px 0 0;
    color: var(--muted);
    font-size: 0.8rem;
  }
</style>
