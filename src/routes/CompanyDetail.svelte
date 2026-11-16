<script>
  import { db, CLOSED, fullName, contactById } from '../lib/db.svelte.js';
  import { money, shortDate } from '../lib/format.js';
  import StageBadge from '../components/StageBadge.svelte';
  import CompanyForm from '../components/CompanyForm.svelte';
  import { go } from '../lib/router.svelte.js';
  import LeadForm from '../components/LeadForm.svelte';

  let { id } = $props();

  let company = $derived(db.companies.find((c) => c.id === id));
  let contacts = $derived(db.contacts.filter((c) => c.companyId === id));
  let leads = $derived(db.leads.filter((l) => l.companyId === id));
  let pipeline = $derived(leads.filter((l) => !CLOSED.includes(l.stage)).reduce((s, l) => s + (l.value || 0), 0));
  let won = $derived(leads.filter((l) => l.stage === 'won').reduce((s, l) => s + (l.value || 0), 0));

  let editCompany = $state(false);
  let editLead = $state(null);
</script>

<a class="back" href="#/companies">← Companies</a>

{#if !company}
  <div class="card"><p class="empty">This company doesn't exist (it may have been deleted).</p></div>
{:else}
  <div class="page-head">
    <div>
      <h1>{company.name}</h1>
      <p class="subtitle">
        {company.industry}
        {#if company.website}{company.industry ? ' · ' : ''}<a href={company.website} target="_blank" rel="noreferrer">{company.website.replace(/^https?:\/\//, '')}</a>{/if}
      </p>
    </div>
    <button onclick={() => (editCompany = true)}>Edit</button>
  </div>

  <section class="mini-stats">
    <div><span>Open pipeline</span><strong>{money(pipeline)}</strong></div>
    <div><span>Won to date</span><strong>{money(won)}</strong></div>
    <div><span>Leads</span><strong>{leads.length}</strong></div>
  </section>

  {#if company.notes}<div class="card notes">{company.notes}</div>{/if}

  <div class="grid-2">
    <section class="card">
      <div class="section-head">
        <h2>Contacts</h2>
        <button class="ghost small" onclick={() => go(`/contacts/new?company=${id}`)}>+ Add</button>
      </div>
      {#if contacts.length === 0}
        <p class="empty">No contacts yet.</p>
      {:else}
        <ul class="list">
          {#each contacts as c (c.id)}
            <li>
              <button class="row-btn" onclick={() => go(`/contacts/${c.id}`)}>
                <span class="avatar">{(c.firstName[0] ?? '') + (c.lastName[0] ?? '')}</span>
                <span class="grow"><strong>{fullName(c)}</strong><small>{c.role}</small></span>
                {#if c.email}<a href="mailto:{c.email}" onclick={(e) => e.stopPropagation()}>{c.email}</a>{/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="card">
      <div class="section-head">
        <h2>Leads</h2>
        <button class="ghost small" onclick={() => (editLead = { companyId: id })}>+ Add</button>
      </div>
      {#if leads.length === 0}
        <p class="empty">No leads yet.</p>
      {:else}
        <ul class="list">
          {#each leads as l (l.id)}
            <li>
              <button class="row-btn" onclick={() => (editLead = l)}>
                <span class="grow">
                  <strong>{l.title}</strong>
                  <small>{[fullName(contactById(l.contactId)), l.followUp && `Follow up ${shortDate(l.followUp)}`].filter(Boolean).join(' · ')}</small>
                </span>
                <span class="num">{money(l.value)}</span>
                <StageBadge stage={l.stage} />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
{/if}

{#if editCompany}<CompanyForm company={company} onclose={() => (editCompany = false)} />{/if}
{#if editLead}<LeadForm lead={editLead} onclose={() => (editLead = null)} />{/if}

<style>
  .back {
    display: inline-block;
    margin-bottom: 12px;
    font-size: 0.875rem;
  }
  .subtitle {
    margin: 4px 0 0;
    color: var(--muted);
  }
  .mini-stats {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .mini-stats div {
    display: flex;
    flex-direction: column;
  }
  .mini-stats span {
    font-size: 0.8rem;
    color: var(--muted);
  }
  .mini-stats strong {
    font-size: 1.25rem;
    font-variant-numeric: tabular-nums;
  }
  .notes {
    margin-bottom: 16px;
    white-space: pre-wrap;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
  }
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  h2 {
    font-size: 1rem;
    margin: 0;
  }
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 0.75rem;
    font-weight: 700;
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent);
    flex-shrink: 0;
  }
</style>
