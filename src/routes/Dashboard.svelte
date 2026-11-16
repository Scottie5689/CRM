<script>
  import { db, STAGES, CLOSED, companyById, contactById, fullName } from '../lib/db.svelte.js';
  import { money, shortDate, isOverdue, isToday } from '../lib/format.js';
  import StageBadge from '../components/StageBadge.svelte';
  import LeadForm from '../components/LeadForm.svelte';

  let editing = $state(null);

  let open = $derived(db.leads.filter((l) => !CLOSED.includes(l.stage)));
  let won = $derived(db.leads.filter((l) => l.stage === 'won'));
  let lost = $derived(db.leads.filter((l) => l.stage === 'lost'));
  let pipeline = $derived(open.reduce((s, l) => s + (l.value || 0), 0));
  let wonTotal = $derived(won.reduce((s, l) => s + (l.value || 0), 0));
  let winRate = $derived(won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null);

  let byStage = $derived(
    STAGES.map((s) => {
      const leads = db.leads.filter((l) => l.stage === s.id);
      return { ...s, count: leads.length, value: leads.reduce((t, l) => t + (l.value || 0), 0) };
    })
  );
  let maxStageValue = $derived(Math.max(1, ...byStage.map((s) => s.value)));

  let followUps = $derived(
    open.filter((l) => l.followUp).sort((a, b) => a.followUp.localeCompare(b.followUp))
  );
  let noFollowUp = $derived(open.filter((l) => !l.followUp));
</script>

<div class="page-head">
  <h1>Dashboard</h1>
  <button class="primary" onclick={() => (editing = {})}>+ New lead</button>
</div>

<section class="stats">
  <div class="card stat">
    <span class="label">Open pipeline</span>
    <strong>{money(pipeline)}</strong>
    <span class="sub">{open.length} active lead{open.length === 1 ? '' : 's'}</span>
  </div>
  <div class="card stat">
    <span class="label">Won</span>
    <strong>{money(wonTotal)}</strong>
    <span class="sub">{won.length} deal{won.length === 1 ? '' : 's'}</span>
  </div>
  <div class="card stat">
    <span class="label">Win rate</span>
    <strong>{winRate === null ? '—' : `${winRate}%`}</strong>
    <span class="sub">of closed leads</span>
  </div>
  <div class="card stat">
    <span class="label">Network</span>
    <strong>{db.contacts.length}</strong>
    <span class="sub">contacts at {db.companies.length} companies</span>
  </div>
</section>

<div class="grid-2">
  <section class="card">
    <h2>Follow-ups</h2>
    {#if followUps.length === 0}
      <p class="empty">No follow-ups scheduled. Set a "Next follow-up" date on a lead to see it here.</p>
    {:else}
      <ul class="list">
        {#each followUps as l (l.id)}
          <li>
            <button class="row-btn" onclick={() => (editing = l)}>
              <span class="date" class:overdue={isOverdue(l.followUp)} class:today={isToday(l.followUp)}>
                {isToday(l.followUp) ? 'Today' : shortDate(l.followUp)}
              </span>
              <span class="grow">
                <strong>{l.title}</strong>
                <small>{[companyById(l.companyId)?.name, fullName(contactById(l.contactId))].filter(Boolean).join(' · ')}</small>
              </span>
              <StageBadge stage={l.stage} />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if noFollowUp.length}
      <p class="hint">{noFollowUp.length} open lead{noFollowUp.length === 1 ? ' has' : 's have'} no follow-up date.</p>
    {/if}
  </section>

  <section class="card">
    <h2>Pipeline by stage</h2>
    <ul class="bars">
      {#each byStage as s (s.id)}
        <li>
          <span class="bar-label">{s.label} <small>({s.count})</small></span>
          <span class="bar-track">
            <span class="bar" style:width="{(s.value / maxStageValue) * 100}%" style:background={s.color}></span>
          </span>
          <span class="bar-value">{money(s.value)}</span>
        </li>
      {/each}
    </ul>
    <a class="hint" href="#/leads">Open the board →</a>
  </section>
</div>

{#if editing}<LeadForm lead={editing} onclose={() => (editing = null)} />{/if}

<style>
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stat .label {
    color: var(--muted);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .stat strong {
    font-size: 1.6rem;
    font-variant-numeric: tabular-nums;
  }
  .stat .sub {
    color: var(--muted);
    font-size: 0.85rem;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
  }
  h2 {
    font-size: 1rem;
    margin: 0 0 12px;
  }
  .date {
    font-size: 0.8rem;
    font-weight: 600;
    min-width: 52px;
    color: var(--muted);
  }
  .date.today {
    color: var(--accent);
  }
  .date.overdue {
    color: var(--danger);
  }
  .bars {
    list-style: none;
    padding: 0;
    margin: 0 0 12px;
    display: grid;
    gap: 10px;
  }
  .bars li {
    display: grid;
    grid-template-columns: 130px 1fr 80px;
    align-items: center;
    gap: 10px;
    font-size: 0.875rem;
  }
  .bar-track {
    height: 8px;
    background: var(--surface-2);
    border-radius: 999px;
    overflow: hidden;
  }
  .bar {
    display: block;
    height: 100%;
    border-radius: 999px;
    min-width: 2px;
  }
  .bar-value {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .bar-label small {
    color: var(--muted);
  }
</style>
