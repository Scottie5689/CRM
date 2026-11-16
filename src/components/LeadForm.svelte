<script>
  import Modal from './Modal.svelte';
  import { db, save, remove, STAGES, fullName, contactById } from '../lib/db.svelte.js';

  let { lead = {}, onclose } = $props();
  // Form edits a copy; the record is only written on Save.
  // svelte-ignore state_referenced_locally
  let form = $state({
    title: '', companyId: '', contactId: '', value: 0, stage: 'new',
    source: '', followUp: '', notes: '',
    ...lead
  });

  let companies = $derived([...db.companies].sort((a, b) => a.name.localeCompare(b.name)));
  // Narrow the contact list to the chosen company, but always keep the current pick visible.
  let contacts = $derived(
    db.contacts
      .filter((c) => !form.companyId || c.companyId === form.companyId || c.id === form.contactId)
      .sort((a, b) => fullName(a).localeCompare(fullName(b)))
  );

  function pickContact() {
    const c = contactById(form.contactId);
    if (c?.companyId && !form.companyId) form.companyId = c.companyId;
  }

  function submit(e) {
    e.preventDefault();
    save('leads', { ...$state.snapshot(form), value: Number(form.value) || 0 });
    onclose();
  }

  function del() {
    if (confirm(`Delete lead "${form.title}"?`)) {
      remove('leads', form.id);
      onclose();
    }
  }
</script>

<Modal title={form.id ? 'Edit lead' : 'New lead'} {onclose}>
  <form onsubmit={submit} class="form">

    <!-- svelte-ignore a11y_autofocus -->
    <label class="full">Title <input required placeholder="e.g. Website redesign" bind:value={form.title} autofocus /></label>
    <label>
      Company
      <select bind:value={form.companyId}>
        <option value="">— None —</option>
        {#each companies as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
      </select>
    </label>
    <label>
      Contact
      <select bind:value={form.contactId} onchange={pickContact}>
        <option value="">— None —</option>
        {#each contacts as c (c.id)}<option value={c.id}>{fullName(c)}</option>{/each}
      </select>
    </label>
    <label>Value (USD) <input type="number" min="0" step="50" bind:value={form.value} /></label>
    <label>
      Stage
      <select bind:value={form.stage}>
        {#each STAGES as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
      </select>
    </label>
    <label>Source <input placeholder="Referral, website, LinkedIn…" bind:value={form.source} /></label>
    <label>Next follow-up <input type="date" bind:value={form.followUp} /></label>
    <label class="full">Notes <textarea rows="3" bind:value={form.notes}></textarea></label>
    <footer>
      {#if form.id}<button type="button" class="danger ghost" onclick={del}>Delete</button>{/if}
      <span class="spacer"></span>
      <button type="button" class="ghost" onclick={onclose}>Cancel</button>
      <button type="submit" class="primary">Save</button>
    </footer>
  </form>
</Modal>
