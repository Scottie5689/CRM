<script>
  import { db, CLOSED } from '../lib/db.svelte.js';
  import { money, matches } from '../lib/format.js';
  import { go } from '../lib/router.svelte.js';
  import CompanyForm from '../components/CompanyForm.svelte';
  import IndustryPie from '../components/IndustryPie.svelte';
  import { industrySlices, industryKey } from '../lib/industries.js';

  let q = $state('');
  let industry = $state(null); // selected pie slice key

  let slice = $derived(industry && industrySlices(db.companies).find((s) => s.key === industry));
  // If the selected slice disappears (e.g. its last company was deleted), drop the filter.
  $effect(() => {
    if (industry && !slice) industry = null;
  });
  let creating = $state(false);

  let rows = $derived(
    db.companies
      .filter((c) => matches(q, c.name, c.industry, c.website))
      .filter((c) => !slice || slice.keys.includes(industryKey(c)))
      .map((c) => {
        const open = db.leads.filter((l) => l.companyId === c.id && !CLOSED.includes(l.stage));
        return {
          ...c,
          contacts: db.contacts.filter((p) => p.companyId === c.id).length,
          openLeads: open.length,
          pipeline: open.reduce((s, l) => s + (l.value || 0), 0)
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  );
</script>

<div class="page-head">
  <h1>Companies</h1>
  <div class="actions">
    <input class="search" type="search" placeholder="Search companies…" bind:value={q} />
    <button class="primary" onclick={() => (creating = true)}>+ New company</button>
  </div>
</div>

{#if db.companies.length}
  <IndustryPie companies={db.companies} selected={industry} onselect={(k) => (industry = k)} />
{/if}

{#if slice}
  <div class="filter-chip">
    Showing <strong>{slice.label}</strong>
    <button class="ghost small" onclick={() => (industry = null)}>Clear filter ✕</button>
  </div>
{/if}

<div class="card table-wrap">
  {#if rows.length === 0}
    <p class="empty">No companies {q || slice ? 'match your filters' : 'yet'}.</p>
  {:else}
    <table>
      <thead>
        <tr><th>Name</th><th>Industry</th><th class="num">Contacts</th><th class="num">Open leads</th><th class="num">Pipeline</th></tr>
      </thead>
      <tbody>
        {#each rows as c (c.id)}
          <tr class="clickable" onclick={() => go(`/companies/${c.id}`)}>
            <td><a href="#/companies/{c.id}"><strong>{c.name}</strong></a></td>
            <td>{c.industry}</td>
            <td class="num">{c.contacts}</td>
            <td class="num">{c.openLeads}</td>
            <td class="num">{money(c.pipeline)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

{#if creating}
  <CompanyForm onclose={() => (creating = false)} onsaved={(id) => go(`/companies/${id}`)} />
{/if}

<style>
  .filter-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 0.875rem;
    color: var(--muted);
  }
  .filter-chip strong {
    color: var(--text);
  }
</style>
