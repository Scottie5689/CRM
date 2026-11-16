<script>
  // Public page a client lands on from the testimonial email. No login.
  import { api } from '../lib/api.js';
  import Rating from '../components/Rating.svelte';

  let { token } = $props();

  let view = $state(null); // { state, firstName, senderName }
  let loadError = $state('');
  let rating = $state(0);
  let testimonial = $state('');
  let busy = $state(false);
  let error = $state('');
  let done = $state(false);

  // svelte-ignore state_referenced_locally
  api('GET', `/api/public/testimonials/${encodeURIComponent(token)}`)
    .then((v) => (view = v))
    .catch((err) => (loadError = err.message));

  async function submit(e) {
    e.preventDefault();
    error = '';
    if (!rating) return (error = 'Please choose a star rating.');
    if (!testimonial.trim()) return (error = 'Please write a few words.');
    busy = true;
    try {
      await api('POST', `/api/public/testimonials/${encodeURIComponent(token)}`, { rating, testimonial });
      done = true;
    } catch (err) {
      error = err.message;
    } finally {
      busy = false;
    }
  }

  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
</script>

<svelte:head><title>Share your feedback</title></svelte:head>

<div class="wrap">
  <div class="card panel">
    {#if loadError}
      <h1>Something went wrong</h1>
      <p class="lead">{loadError}</p>
    {:else if !view}
      <p class="lead">Loading…</p>
    {:else if done}
      <div class="big" aria-hidden="true">🎉</div>
      <h1>Thank you, {view.firstName}!</h1>
      <p class="lead">Your feedback has been sent to {view.senderName}. It really means a lot.</p>
      <p class="muted">You can close this page now.</p>
    {:else if view.state === 'submitted'}
      <h1>Already received</h1>
      <p class="lead">Thanks, {view.firstName}! Your feedback has already been submitted.</p>
    {:else if view.state === 'expired'}
      <h1>This link has expired</h1>
      <p class="lead">Please reply to {view.senderName}'s email if you'd still like to leave feedback.</p>
    {:else if view.state !== 'open'}
      <h1>Link not valid</h1>
      <p class="lead">This feedback link isn't valid any more. It may have been replaced by a newer one.</p>
    {:else}
      <form onsubmit={submit}>
        <h1>Hi {view.firstName} 👋</h1>
        <p class="lead">
          {view.senderName} would love to hear how it went working together. It only takes a minute.
        </p>

        <div class="block">
          <Rating label="How would you rate the experience?" size="2.4rem" bind:value={rating} />
          <p class="rating-label" aria-live="polite">{labels[rating] ?? ''}</p>
        </div>

        <label class="block">
          <span class="label">A few words about working with {view.senderName}</span>
          <textarea
            rows="6"
            maxlength="5000"
            bind:value={testimonial}
            placeholder="What was the project? How did it go? Would you recommend {view.senderName}?"
          ></textarea>
        </label>

        {#if error}<p class="error" role="alert">{error}</p>{/if}

        <button class="primary submit" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
        <p class="muted fine">Your rating and words go only to {view.senderName}.</p>
      </form>
    {/if}
  </div>
</div>

<style>
  .wrap {
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(0, 560px);
    justify-content: center;
    align-items: center;
    padding: 24px 16px;
  }
  .panel {
    width: 100%;
    padding: 32px;
  }
  @media (max-width: 480px) {
    .panel {
      padding: 22px 18px;
    }
  }
  h1 {
    font-size: 1.5rem;
    margin: 0 0 8px;
  }
  .lead {
    font-size: 1.05rem;
    color: var(--text);
    margin: 0 0 24px;
    line-height: 1.5;
  }
  .block {
    display: block;
    margin-bottom: 20px;
  }
  .label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 6px;
  }
  textarea {
    font-size: 1rem;
  }
  .rating-label {
    margin: 4px 0 0;
    min-height: 1.3em;
    font-weight: 600;
    color: var(--star);
  }
  .submit {
    width: 100%;
    padding: 12px;
    font-size: 1rem;
  }
  .submit:disabled {
    opacity: 0.6;
  }
  .error {
    margin: 0 0 12px;
    padding: 8px 12px;
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    color: var(--danger);
    font-size: 0.9rem;
  }
  .muted {
    color: var(--muted);
  }
  .fine {
    font-size: 0.8rem;
    text-align: center;
    margin: 12px 0 0;
  }
  .big {
    font-size: 2.5rem;
  }
</style>
