<script>
  import { db, STAGES, save, companyById, contactById, fullName } from '../lib/db.svelte.js';
  import { money, shortDate, isOverdue, matches } from '../lib/format.js';
  import StageBadge from '../components/StageBadge.svelte';
  import LeadForm from '../components/LeadForm.svelte';

  const VIEW_KEY = 'crm-leads-view';
  let view = $state(localStorage.getItem(VIEW_KEY) || 'board');
  $effect(() => localStorage.setItem(VIEW_KEY, view));

  let q = $state('');
  let editing = $state(null);
  let dragId = $state(null);
  let dropTarget = $state(null);

  let filtered = $derived(
    db.leads.filter((l) =>
      matches(q, l.title, l.source, l.notes, companyById(l.companyId)?.name, fullName(contactById(l.contactId)))
    )
  );
  let columns = $derived(
    STAGES.map((s) => {
      const leads = filtered.filter((l) => l.stage === s.id);
      return { ...s, leads, total: leads.reduce((t, l) => t + (l.value || 0), 0) };
    })
  );
  let sorted = $derived([...filtered].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')));

  function drop(stageId) {
    const lead = db.leads.find((l) => l.id === dragId);
    if (lead && lead.stage !== stageId) save('leads', { ...$state.snapshot(lead), stage: stageId });
    dragId = dropTarget = null;
  }
</script>

<div class="page-head">
  <h1>Leads</h1>
  <div class="actions">
    <input class="search" type="search" placeholder="Search leads…" bind:value={q} />
    <div class="toggle" role="group" aria-label="View">
      <button class:active={view === 'board'} onclick={() => (view = 'board')}>Board</button>
      <button class:active={view === 'list'} onclick={() => (view = 'list')}>List</button>
    </div>
    <button class="primary" onclick={() => (editing = {})}>+ New lead</button>
  </div>
</div>

{#if view === 'board'}
  <div class="board">
    {#each columns as col (col.id)}
      <section
        class="column"
        class:drop={dropTarget === col.id}
        aria-label={col.label}
        ondragover={(e) => { e.preventDefault(); dropTarget = col.id; }}
        ondragleave={() => dropTarget === col.id && (dropTarget = null)}
        ondrop={() => drop(col.id)}
      >
        <header style:--c={col.color}>
          <span class="dot"></span>
          <strong>{col.label}</strong>
          <span class="count">{col.leads.length}</span>
          <span class="total">{money(col.total)}</span>
        </header>
        {#each col.leads as l (l.id)}
          <button
            class="lead-card"
            class:dragging={dragId === l.id}
            draggable="true"
            ondragstart={() => (dragId = l.id)}
            ondragend={() => (dragId = dropTarget = null)}
            onclick={() => (editing = l)}
          >
            <strong>{l.title}</strong>
            <small>{[companyById(l.companyId)?.name, fullName(contactById(l.contactId))].filter(Boolean).join(' · ') || 'No company'}</small>
            <span class="meta">
              <span>{money(l.value)}</span>
              {#if l.followUp}
                <span class:overdue={isOverdue(l.followUp) && !['won', 'lost'].includes(l.stage)}>↻ {shortDate(l.followUp)}</span>
              {/if}
            </span>
          </button>
        {/each}
      </section>
    {/each}
  </div>
{:else}
  <div class="card table-wrap">
    {#if sorted.length === 0}
      <p class="empty">No leads {q ? 'match your search' : 'yet'}.</p>
    {:else}
      <table>
        <thead>
          <tr><th>Lead</th><th>Company</th><th>Contact</th><th>Stage</th><th class="num">Value</th><th>Follow-up</th></tr>
        </thead>
        <tbody>
          {#each sorted as l (l.id)}
            {@const co = companyById(l.companyId)}
            <tr class="clickable" onclick={() => (editing = l)}>
              <td><strong>{l.title}</strong></td>
              <td>{#if co}<a href="#/companies/{co.id}" onclick={(e) => e.stopPropagation()}>{co.name}</a>{/if}</td>
              <td>{fullName(contactById(l.contactId))}</td>
              <td><StageBadge stage={l.stage} /></td>
              <td class="num">{money(l.value)}</td>
              <td class:overdue={isOverdue(l.followUp) && !['won', 'lost'].includes(l.stage)}>{shortDate(l.followUp)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
{/if}

{#if editing}<LeadForm lead={editing} onclose={() => (editing = null)} />{/if}

<style>
  .board {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(190px, 1fr);
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 8px;
    align-items: start;
  }
  .column {
    background: var(--surface-2);
    border-radius: var(--radius-lg);
    padding: 10px;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 2px dashed transparent;
    transition: border-color 0.15s;
  }
  .column.drop {
    border-color: var(--accent);
  }
  .column header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    padding: 2px 4px 6px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
  }
  .count {
    color: var(--muted);
  }
  .total {
    margin-left: auto;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .lead-card {
    all: unset;
    box-sizing: border-box;
    cursor: grab;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: var(--shadow);
  }
  .lead-card:hover {
    border-color: var(--accent);
  }
  .lead-card:focus-visible {
    outline: 2px solid var(--accent);
  }
  .lead-card.dragging {
    opacity: 0.4;
  }
  .lead-card small {
    color: var(--muted);
  }
  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    margin-top: 4px;
  }
  .overdue {
    color: var(--danger);
    font-weight: 600;
  }
</style>
