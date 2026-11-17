<script>
  import { untrack } from 'svelte';
  import { db, saveNow, remove, fullName, companyById, flash, CLOSED } from '../lib/db.svelte.js';
  import { money, shortDate } from '../lib/format.js';
  import { router, go, setBlocker } from '../lib/router.svelte.js';
  import { SCHEMA, CONTACT_SECTIONS, blank } from '../../shared/schema.js';
  import Field from '../components/Field.svelte';
  import StageBadge from '../components/StageBadge.svelte';
  import LeadForm from '../components/LeadForm.svelte';
  import RequestTestimonialModal from '../components/RequestTestimonialModal.svelte';
  import { api } from '../lib/api.js';

  let { id } = $props();

  // The page is re-created for each URL, so reading `id` once is intentional.
  // svelte-ignore state_referenced_locally
  const isNew = id === 'new';
  // svelte-ignore state_referenced_locally
  const existing = isNew ? null : db.contacts.find((c) => c.id === id);

  const initial = existing
    ? { ...blank('contacts'), ...$state.snapshot(existing) }
    : { ...blank('contacts'), companyId: router.query.company ?? '' };

  let form = $state(structuredClone(initial));
  let baseline = $state(JSON.stringify(initial));
  let dirty = $derived(JSON.stringify(form) !== baseline);

  const sections = CONTACT_SECTIONS.map((s) => ({
    ...s,
    fields: SCHEMA.contacts.filter((f) => (f.section ?? 'details') === s.id)
  }));

  let company = $derived(companyById(form.companyId));
  let leads = $derived(form.id ? db.leads.filter((l) => l.contactId === form.id) : []);
  let editLead = $state(null);

  // Warn before leaving with unsaved changes (in-app links and closing the tab).
  $effect(() => setBlocker(() => !dirty || confirm('You have unsaved changes. Leave without saving?')));
  $effect(() => {
    const warn = (e) => dirty && e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  });

  let formEl = $state();

  // --- Testimonial requests ---
  let requesting = $state(false);
  let request = $state(null); // latest { sentAt, submittedAt, expiresAt }

  async function loadRequest() {
    if (!form.id) return;
    try {
      request = (await api('GET', `/api/contacts/${form.id}/testimonial-request`)).request;
    } catch {
      /* status is optional */
    }
  }

  // When fresh data arrives from the server (e.g. the client submitted their
  // testimonial) and there are no local edits, show it.
  let live = $derived(form.id ? db.contacts.find((c) => c.id === form.id) : null);
  // Only re-runs when the saved record changes, not on every keystroke.
  $effect(() => {
    const updated = live?.updatedAt;
    untrack(() => {
      if (updated && updated !== form.updatedAt && !dirty) {
        Object.assign(form, { ...blank('contacts'), ...$state.snapshot(live) });
        baseline = JSON.stringify(form);
      }
      loadRequest();
    });
  });

  let requestBlocked = $derived(
    !form.id ? 'Save the contact first' : dirty ? 'Save your changes first' : !form.email ? 'Add an email address first' : ''
  );
  const day = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  let requestStatus = $derived.by(() => {
    if (!request) return '';
    if (request.submittedAt) return `Received via request link on ${day(request.submittedAt)}`;
    if (new Date(request.expiresAt) < new Date()) return `Request sent ${day(request.sentAt)}; the link has expired`;
    return `Requested ${day(request.sentAt)} · waiting for a reply`;
  });

  let saving = $state(false);

  async function submit(e) {
    e?.preventDefault();
    if (saving || !formEl.reportValidity()) return;
    saving = true;
    try {
      const saved = await saveNow('contacts', $state.snapshot(form));
      Object.assign(form, saved); // pick up id, timestamps and server clean-up (e.g. trimmed text)
      baseline = JSON.stringify(form);
      flash('Contact saved');
      if (isNew) go(`/contacts/${saved.id}`, { replace: true });
    } catch (err) {
      if (err.status !== 401) flash(`Couldn't save: ${err.message}`);
    } finally {
      saving = false;
    }
  }

  function discard() {
    form = JSON.parse(baseline);
  }

  function del() {
    if (confirm(`Delete ${fullName(form) || 'this contact'}? Their leads will be kept but unlinked.`)) {
      remove('contacts', form.id);
      baseline = JSON.stringify(form); // nothing left to lose
      go('/contacts');
    }
  }

  function keydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (dirty) submit();
    }
  }
</script>

<svelte:window onkeydown={keydown} />

<a class="back" href="#/contacts">← Contacts</a>

{#if !isNew && !existing}
  <div class="card"><p class="empty">This contact doesn't exist (it may have been deleted).</p></div>
{:else}
  <form bind:this={formEl} onsubmit={submit} novalidate>
    <div class="page-head sticky">
      <div class="title">
        <h1>{fullName(form) || 'New contact'}</h1>
        <p class="subtitle">
          {form.role}{#if form.role && company} at {/if}{#if company}<a href="#/companies/{company.id}">{company.name}</a>{/if}
        </p>
      </div>
      <div class="actions">
        {#if dirty}<span class="unsaved">Unsaved changes</span>{/if}
        {#if !isNew}<button type="button" class="ghost danger" onclick={del}>Delete</button>{/if}
        {#if dirty && !isNew}<button type="button" class="ghost" onclick={discard}>Discard</button>{/if}
        <button type="submit" class="primary" disabled={!dirty || saving}>
          {saving ? 'Saving…' : isNew ? 'Create contact' : 'Save'}
        </button>
      </div>
    </div>

    <div class="layout">
      <div class="main">
        {#each sections as s (s.id)}
          {#if s.fields.length}
            <section class="card">
              {#if s.id === 'testimonial'}
                <div class="section-head">
                  <h2>{s.title}</h2>
                  <button
                    type="button"
                    class="small"
                    disabled={!!requestBlocked}
                    title={requestBlocked || `Email ${form.firstName} a link to leave a rating and testimonial`}
                    onclick={() => (requesting = true)}
                  >
                    ✉ {request && !request.submittedAt ? 'Request again' : 'Request testimonial'}
                  </button>
                </div>
                {#if requestStatus || requestBlocked}
                  <p class="request-status">{requestStatus || requestBlocked + ' to request a testimonial.'}</p>
                {/if}
              {:else}
                <h2>{s.title}</h2>
              {/if}
              <div class="fields">
                {#each s.fields as f (f.key)}
                  <Field def={f} bind:value={form[f.key]} />
                {/each}
              </div>
            </section>
          {/if}
        {/each}
      </div>

      <aside>
        <section class="card">
          <div class="section-head">
            <h2>Leads</h2>
            {#if form.id}
              <button type="button" class="ghost small" onclick={() => (editLead = { contactId: form.id, companyId: form.companyId })}>+ Add</button>
            {/if}
          </div>
          {#if !form.id}
            <p class="empty">Save the contact to add leads.</p>
          {:else if leads.length === 0}
            <p class="empty">No leads yet.</p>
          {:else}
            <ul class="list">
              {#each leads as l (l.id)}
                <li>
                  <button type="button" class="row-btn" onclick={() => (editLead = l)}>
                    <span class="grow">
                      <strong>{l.title}</strong>
                      <small>{money(l.value)}{l.followUp && !CLOSED.includes(l.stage) ? ` · follow up ${shortDate(l.followUp)}` : ''}</small>
                    </span>
                    <StageBadge stage={l.stage} />
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </section>

        {#if form.email || form.phone}
          <section class="card quick">
            <h2>Get in touch</h2>
            {#if form.email}<a href="mailto:{form.email}">✉ {form.email}</a>{/if}
            {#if form.phone}<a href="tel:{form.phone}">☏ {form.phone}</a>{/if}
          </section>
        {/if}

        {#if form.createdAt}
          <p class="meta">
            Created {new Date(form.createdAt).toLocaleDateString()}
            {#if form.updatedAt} · updated {new Date(form.updatedAt).toLocaleDateString()}{/if}
          </p>
        {/if}
      </aside>
    </div>
  </form>
{/if}

{#if requesting}
  <RequestTestimonialModal
    contact={form}
    hasExisting={!!(form.testimonial || form.testimonialRating)}
    onclose={() => (requesting = false)}
    onsent={(r) => (request = r)}
  />
{/if}
{#if editLead}<LeadForm lead={editLead} onclose={() => (editLead = null)} />{/if}

<style>
  .back {
    display: inline-block;
    margin-bottom: 12px;
    font-size: 0.875rem;
  }
  .sticky {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg);
    padding: 8px 0 12px;
    margin-bottom: 8px;
  }
  .title {
    min-width: 0;
  }
  .subtitle {
    margin: 4px 0 0;
    color: var(--muted);
    min-height: 1.2em;
  }
  .unsaved {
    font-size: 0.8rem;
    color: var(--muted);
  }
  button[disabled] {
    opacity: 0.5;
    cursor: default;
    filter: none;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 960px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
  .main,
  aside {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  h2 {
    font-size: 1rem;
    margin: 0 0 12px;
  }
  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 16px;
  }
  @media (max-width: 560px) {
    .fields {
      grid-template-columns: 1fr;
    }
  }
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .section-head h2 {
    margin: 0;
  }
  .request-status {
    margin: 0 0 12px;
    font-size: 0.8rem;
    color: var(--muted);
  }
  .section-head + .request-status {
    margin-top: 4px;
  }
  .card > .section-head {
    margin-bottom: 8px;
  }
  .quick {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.9rem;
  }
  .quick h2 {
    margin-bottom: 4px;
  }
  .meta {
    margin: 0;
    font-size: 0.8rem;
    color: var(--muted);
  }
</style>
