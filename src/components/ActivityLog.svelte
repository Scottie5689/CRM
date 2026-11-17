<script>
  // Activity log for one contact (calls, emails, meetings…), newest first.
  // Lives inside the contact page's <form>, so it uses plain buttons rather than a nested form,
  // and stops Enter from submitting (saving) the contact.
  import { db, save, remove, flash } from '../lib/db.svelte.js';
  import { today } from '../lib/format.js';
  import { SCHEMA } from '../../shared/schema.js';

  let { contactId } = $props();

  const TYPES = SCHEMA.activities.find((f) => f.key === 'type').options;
  const PREVIEW = 5;

  const blankDraft = () => ({ id: '', type: TYPES[0], date: today(), notes: '' });

  let draft = $state(null); // null = form closed
  let showAll = $state(false);
  let notesEl = $state();

  let entries = $derived(
    db.activities
      .filter((a) => a.contactId === contactId)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  );
  let visible = $derived(showAll ? entries : entries.slice(0, PREVIEW));

  const thisYear = new Date().getFullYear();
  function when(d) {
    const date = new Date(d + 'T00:00');
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() === thisYear ? undefined : 'numeric'
    });
  }

  function open(entry) {
    draft = entry ? { id: entry.id, type: entry.type, date: entry.date, notes: entry.notes } : blankDraft();
    queueMicrotask(() => notesEl?.focus());
  }

  function commit() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return flash('Pick a date for this activity.');
    const record = { ...$state.snapshot(draft), contactId, notes: draft.notes.trim() };
    if (!record.id) delete record.id;
    save('activities', record);
    draft = null;
  }

  function del(entry) {
    if (confirm(`Delete this ${entry.type.toLowerCase()} from ${when(entry.date)}?`)) remove('activities', entry.id);
  }

  function keydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      draft = null;
    } else if (e.key === 'Enter' && (e.target.tagName !== 'TEXTAREA' || e.metaKey || e.ctrlKey)) {
      e.preventDefault(); // don't submit the contact form
      commit();
    }
  }
</script>

<section class="card">
  <div class="head">
    <h2>Activity</h2>
    {#if contactId && !draft}
      <button type="button" class="ghost small" onclick={() => open()}>+ Log</button>
    {/if}
  </div>

  {#if !contactId}
    <p class="empty">Save the contact to log activity.</p>
  {:else}
    {#if draft}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="editor" onkeydown={keydown}>
        <div class="row">
          <label>
            <span>Type</span>
            <select bind:value={draft.type}>
              {#each TYPES as t (t)}<option value={t}>{t}</option>{/each}
            </select>
          </label>
          <label>
            <span>Date</span>
            <input type="date" bind:value={draft.date} max={today()} />
          </label>
        </div>
        <label>
          <span>What happened</span>
          <textarea rows="3" maxlength="5000" bind:this={notesEl} bind:value={draft.notes} placeholder="e.g. Discussed scope and budget; follow up Friday"></textarea>
        </label>
        <div class="buttons">
          <button type="button" class="primary small" onclick={commit}>{draft.id ? 'Save' : 'Log activity'}</button>
          <button type="button" class="ghost small" onclick={() => (draft = null)}>Cancel</button>
        </div>
      </div>
    {/if}

    {#if entries.length === 0 && !draft}
      <p class="empty">No activity logged yet.</p>
    {:else if entries.length}
      <ul class="log">
        {#each visible as a (a.id)}
          <li>
            <div class="meta">
              <span class="tag">{a.type}</span>
              <time datetime={a.date}>{when(a.date)}</time>
              <span class="tools">
                <button type="button" class="icon" title="Edit" aria-label="Edit {a.type} from {when(a.date)}" onclick={() => open(a)}>✎</button>
                <button type="button" class="icon" title="Delete" aria-label="Delete {a.type} from {when(a.date)}" onclick={() => del(a)}>✕</button>
              </span>
            </div>
            {#if a.notes}<p class="notes">{a.notes}</p>{/if}
          </li>
        {/each}
      </ul>
      {#if entries.length > PREVIEW}
        <button type="button" class="ghost small more" onclick={() => (showAll = !showAll)}>
          {showAll ? 'Show fewer' : `Show all ${entries.length}`}
        </button>
      {/if}
    {/if}
  {/if}
</section>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  h2 {
    margin: 0;
  }
  .editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    margin-bottom: 12px;
    border: 1px solid var(--accent-border);
    border-radius: var(--radius-md);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    color: var(--muted);
    min-width: 0;
  }
  .buttons {
    display: flex;
    gap: 8px;
  }
  .log {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .log li {
    padding: 12px 0;
  }
  .log li + li {
    border-top: 1px solid var(--border);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  /* Brand tag: Geist Medium, accent 12% fill, radius 6 */
  .tag {
    font-size: 13px;
    font-weight: 500;
    padding: 2px 10px;
    border-radius: var(--radius-sm);
    background: var(--accent-tint);
    color: var(--text);
  }
  time {
    font-size: 13px;
    color: var(--muted);
  }
  .tools {
    margin-left: auto;
    display: flex;
    opacity: 0.5;
    transition: opacity 0.1s;
  }
  li:hover .tools,
  .tools:focus-within {
    opacity: 1;
  }
  .notes {
    margin: 8px 0 0;
    font-size: 14px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .more {
    margin-top: 4px;
  }
</style>
