<script>
  import Modal from './Modal.svelte';
  import { api } from '../lib/api.js';
  import { auth } from '../lib/auth.svelte.js';

  let { contact, hasExisting = false, onclose, onsent } = $props();

  const greeting = (name) => `Hi ${contact.firstName},

Thank you so much for working with me. It's been a real pleasure, and I hope you're happy with how everything turned out.

I'm gathering a few short testimonials from clients and would be grateful if you'd share a sentence or two about your experience, along with a quick 1–5 star rating. It only takes a minute.

Thanks again,
${name}`.trimEnd();

  let senderName = $state(auth.user?.displayName ?? '');
  let subject = $state(`Would you share a few words about our work together?`);
  let message = $state(greeting(auth.user?.displayName ?? ''));
  let edited = $state(false);

  // Keep the sign-off in sync with the name until the message is edited by hand.
  function nameInput() {
    if (!edited) message = greeting(senderName);
  }

  let mailConfigured = $state(null);
  api('GET', '/api/mail-status').then((r) => (mailConfigured = r.configured)).catch(() => {});

  let busy = $state(false);
  let error = $state('');
  let result = $state(null);
  let copied = $state(false);

  async function send(e) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      result = await api('POST', `/api/contacts/${contact.id}/testimonial-request`, { senderName, subject, message });
      if (auth.user) auth.user.displayName = senderName.trim();
      onsent?.(result.request);
    } catch (err) {
      error = err.message;
    } finally {
      busy = false;
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.link);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      /* clipboard blocked: the link is selectable */
    }
  }
</script>

<Modal title={result ? 'Request created' : 'Request a testimonial'} {onclose}>
  {#if result}
    <div class="done">
      {#if result.delivered}
        <p class="ok">✓ Email sent to <strong>{result.to}</strong>.</p>
        <p class="muted">When they submit the form, the rating and testimonial are saved to this contact and you'll get an email.</p>
      {:else}
        <p class="warn">Email sending isn't set up yet, so nothing was sent.</p>
        <p class="muted">
          Send this personal link to {contact.firstName} yourself, or add SMTP settings to <code>.env</code> (see
          <code>.env.example</code>). A copy of the email was saved to <code>data/outbox/</code>.
        </p>
      {/if}
      <div class="link-row">
        <input readonly value={result.link} onfocus={(e) => e.currentTarget.select()} aria-label="Testimonial link" />
        <button type="button" onclick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
      </div>
      <footer>
        <span class="spacer"></span>
        <button type="button" class="primary" onclick={onclose}>Done</button>
      </footer>
    </div>
  {:else}
    <form class="form" onsubmit={send}>
      {#if error}<p class="full error" role="alert">{error}</p>{/if}
      {#if mailConfigured === false}
        <p class="full notice">Email isn't configured yet. You'll get a link to send yourself instead.</p>
      {/if}
      {#if hasExisting}
        <p class="full notice">{contact.firstName} already has a testimonial. A new response will replace it.</p>
      {/if}
      <label>To <input value="{contact.firstName} {contact.lastName} <{contact.email}>" readonly /></label>
      <label>Your name <input required maxlength="100" bind:value={senderName} oninput={nameInput} placeholder="Shown as the sender" /></label>
      <label class="full">Subject <input required maxlength="200" bind:value={subject} /></label>
      <label class="full">
        Message
        <textarea required rows="10" maxlength="5000" bind:value={message} oninput={() => (edited = true)}></textarea>
      </label>
      <p class="full muted small">A "Share your feedback" button linking to a simple rating form is added below your message. The link works once and expires in 30 days. Replies go to {auth.user?.email}.</p>
      <footer>
        <span class="spacer"></span>
        <button type="button" class="ghost" onclick={onclose}>Cancel</button>
        <button type="submit" class="primary" disabled={busy}>
          {busy ? 'Sending…' : mailConfigured === false ? 'Create link' : 'Send request'}
        </button>
      </footer>
    </form>
  {/if}
</Modal>

<style>
  .muted {
    color: var(--muted);
    font-size: 0.875rem;
  }
  .small {
    margin: -4px 0 0;
    font-size: 0.8rem;
    font-weight: 400;
  }
  .error,
  .notice {
    margin: 0;
    padding: 8px 12px;
    border-radius: var(--radius);
    font-size: 0.875rem;
  }
  .error {
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    color: var(--danger);
  }
  .notice {
    background: var(--surface-2);
    color: var(--text);
  }
  .done p {
    margin: 0 0 10px;
  }
  .ok {
    font-size: 0.95rem;
  }
  .warn {
    font-weight: 600;
  }
  .link-row {
    display: flex;
    gap: 8px;
    margin: 12px 0 8px;
  }
  .link-row input {
    font-family: ui-monospace, monospace;
    font-size: 0.8rem;
  }
  .link-row button {
    white-space: nowrap;
  }
  .done footer {
    display: flex;
    margin-top: 12px;
  }
  code {
    font-size: 0.8rem;
  }
</style>
