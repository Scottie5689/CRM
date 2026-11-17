<script>
  // Public page a client lands on from the testimonial email. No login.
  import { api } from '../lib/api.js';
  import Rating from '../components/Rating.svelte';
  import Footer from '../components/Footer.svelte';
  import Fireworks from '../components/Fireworks.svelte';
  import { toJpegDataUrl } from '../lib/image.js';

  let { token } = $props();

  let view = $state(null); // { state, firstName, senderName }
  let loadError = $state('');
  let rating = $state(0);
  let testimonial = $state('');
  let consentName = $state(false);
  let consentCompany = $state(false);
  let photo = $state(''); // JPEG data URL
  let photoBusy = $state(false);

  async function pickPhoto(e) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    error = '';
    photoBusy = true;
    try {
      photo = await toJpegDataUrl(file);
    } catch (err) {
      error = err.message;
    } finally {
      photoBusy = false;
    }
  }
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
      await api('POST', `/api/public/testimonials/${encodeURIComponent(token)}`, {
        rating,
        testimonial,
        consentName,
        consentCompany,
        headshot: photo || undefined,
        localDate: new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, for the activity log
      });
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
  <div class="stage">
    {#if done}
      <div class="show"><Fireworks color="#ff3b30" /></div>
    {/if}
    <div class="form-card panel">
      <div class="wordmark page-brand">ScottV<span class="tld">.tech</span></div>
      {#if loadError}
        <h1>Something went wrong</h1>
        <p class="lead">{loadError}</p>
      {:else if !view}
        <p class="lead">Loading…</p>
      {:else if done}
        <h1>Thank you, <span class="hl">{view.firstName}</span>!</h1>
        <p class="lead">Your feedback helps small businesses like mine and is greatly appreciatted.</p>
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
          <h1>Hi <span class="hl">{view.firstName}</span></h1>
          <p class="lead">
            Thanks for working with me. If you have a moment, I'd really value your testimonial. A sentence or two I could share with others is plenty.
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

          <fieldset class="block">
            <legend class="label">Can {view.senderName} share this in their marketing?</legend>
            <label class="check">
              <input type="checkbox" bind:checked={consentName} />
              <span>Yes, show my name with my testimonial</span>
            </label>
            <label class="check">
              <input type="checkbox" bind:checked={consentCompany} />
              <span>Yes, show my company name</span>
            </label>
            <p class="muted hint">Leave these unticked to stay anonymous.</p>
          </fieldset>

          <div class="block">
            <span class="label">Your photo (optional)</span>
            {#if photo}
              <div class="photo">
                <img src={photo} alt="Your chosen headshot" />
                <button type="button" class="ghost" onclick={() => (photo = '')}>Remove photo</button>
              </div>
            {:else}
              <label class="button">
                {photoBusy ? 'Preparing…' : 'Choose a photo'}
                <input type="file" accept="image/*" class="sr-only" disabled={photoBusy} onchange={pickPhoto} />
              </label>
            {/if}
            <p class="muted hint">A headshot to show alongside your testimonial.</p>
          </div>

          {#if error}<p class="error" role="alert">{error}</p>{/if}

          <button class="primary submit" type="submit" disabled={busy || photoBusy}>{busy ? 'Sending…' : 'Send feedback'}</button>
          <p class="muted fine">Your feedback goes only to {view.senderName}, who will use it as you've chosen above.</p>
        </form>
      {/if}
    </div>
  </div>
  <Footer />
</div>

<style>
  .wrap {
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(0, 560px);
    grid-template-rows: 1fr auto;
    justify-content: center;
    align-items: center;
    padding: 24px 16px;
  }
  .stage {
    position: relative;
    width: 100%;
  }
  /* Fireworks float above the card (out of the layout, so the card stays centred)
     and tuck 28px behind its top edge; the card paints over them. */
  .show {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% - 28px);
    pointer-events: none;
  }
  .panel {
    position: relative;
    z-index: 1;
    width: 100%;
    padding: 32px;
  }
  @media (max-width: 480px) {
    .panel {
      padding: 22px 18px;
    }
  }
  .page-brand {
    font-size: 20px;
    margin-bottom: 28px;
  }
  h1 {
    font-size: 28px;
    font-weight: 800;
    margin: 0 0 12px;
  }
  /* Brand "accent highlight": one red word per heading */
  .hl {
    color: var(--accent);
  }
  /* Brand "Lead": Geist 18px, 160% line height, muted */
  .lead {
    font-size: 18px;
    color: var(--muted);
    margin: 0 0 28px;
    line-height: 1.6;
  }
  .block {
    display: block;
    margin-bottom: 20px;
  }
  .label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--label);
    margin-bottom: 8px;
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
    padding: 15px 16px;
    font-size: 16px;
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
  fieldset {
    border: none;
    padding: 0;
    margin: 0 0 20px;
    min-width: 0;
  }
  legend {
    padding: 0;
  }
  .check {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 8px 0;
    cursor: pointer;
  }
  .hint {
    font-size: 0.8rem;
    margin: 6px 0 0;
  }
  .photo {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .photo img {
    width: 96px;
    height: 96px;
    object-fit: cover;
    border-radius: 50%;
    border: 1px solid var(--border);
  }
</style>
