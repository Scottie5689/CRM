<script>
  import { db, companyById, fullName } from '../lib/db.svelte.js';
  import { matches } from '../lib/format.js';
  import { go } from '../lib/router.svelte.js';

  let q = $state('');

  const createdDate = (iso) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  let rows = $derived(
    db.contacts
      .filter((c) => matches(q, fullName(c), c.email, c.phone, c.role, c.source, c.testimonial, companyById(c.companyId)?.name))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)))
  );
</script>

<div class="page-head">
  <h1>Contacts</h1>
  <div class="actions">
    <input class="search" type="search" placeholder="Search contacts…" bind:value={q} />
    <a class="button primary" href="#/contacts/new">+ New contact</a>
  </div>
</div>

<div class="card table-wrap">
  {#if rows.length === 0}
    <p class="empty">No contacts {q ? 'match your search' : 'yet'}.</p>
  {:else}
    <table>
      <thead>
        <tr><th>Name</th><th>Company</th><th>Role</th><th>Email</th><th>Phone</th><th>Source</th><th>Testimonial</th><th>Created</th></tr>
      </thead>
      <tbody>
        {#each rows as c (c.id)}
          {@const co = companyById(c.companyId)}
          <tr class="clickable" onclick={() => go(`/contacts/${c.id}`)}>
            <td><a href="#/contacts/{c.id}"><strong>{fullName(c)}</strong></a></td>
            <td>{#if co}<a href="#/companies/{co.id}" onclick={(e) => e.stopPropagation()}>{co.name}</a>{/if}</td>
            <td>{c.role}</td>
            <td>{#if c.email}<a href="mailto:{c.email}" onclick={(e) => e.stopPropagation()}>{c.email}</a>{/if}</td>
            <td>{#if c.phone}<a href="tel:{c.phone}" onclick={(e) => e.stopPropagation()}>{c.phone}</a>{/if}</td>
            <td>{c.source}</td>
            <td>
              {#if c.testimonialRating}
                <span class="stars" title="{c.testimonialRating} out of 5" aria-label="{c.testimonialRating} out of 5 stars">{'★'.repeat(c.testimonialRating)}<span class="off">{'★'.repeat(5 - c.testimonialRating)}</span></span>
              {:else if c.testimonial}
                <span class="muted">Not rated</span>
              {/if}
            </td>
            <td class="muted">{#if c.createdAt}<time datetime={c.createdAt}>{createdDate(c.createdAt)}</time>{/if}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .stars {
    color: var(--star);
    letter-spacing: 1px;
  }
  .stars .off {
    color: var(--star-off);
  }
  .muted {
    color: var(--muted);
    font-size: 0.85rem;
  }
</style>
