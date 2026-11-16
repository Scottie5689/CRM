<script>
  import { router } from './lib/router.svelte.js';
  import { db, CLOSED, notice, refresh } from './lib/db.svelte.js';
  import PublicTestimonial from './routes/PublicTestimonial.svelte';
  import { auth, init } from './lib/auth.svelte.js';
  import Login from './routes/Login.svelte';
  import AccountMenu from './components/AccountMenu.svelte';
  import { isOverdue, isToday } from './lib/format.js';
  import Dashboard from './routes/Dashboard.svelte';
  import Leads from './routes/Leads.svelte';
  import Companies from './routes/Companies.svelte';
  import CompanyDetail from './routes/CompanyDetail.svelte';
  import Contacts from './routes/Contacts.svelte';
  import ContactDetail from './routes/ContactDetail.svelte';
  import DataTools from './components/DataTools.svelte';

  // The public testimonial form doesn't need a session.
  const isPublic = router.parts[0] === 't';
  if (!isPublic) init();

  let section = $derived(router.parts[0] ?? '');

  let due = $derived(
    db.leads.filter((l) => !CLOSED.includes(l.stage) && (isOverdue(l.followUp) || isToday(l.followUp))).length
  );

  const nav = [
    { id: '', label: 'Dashboard', icon: '◧' },
    { id: 'companies', label: 'Companies', icon: '▦' },
    { id: 'contacts', label: 'Contacts', icon: '☺' },
    { id: 'leads', label: 'Leads', icon: '◎' }
  ];
</script>

<svelte:window onfocus={() => auth.status === 'signed-in' && refresh()} />

{#if isPublic}
  <PublicTestimonial token={router.parts[1] ?? ''} />
{:else if auth.status === 'loading'}
  <div class="splash">Loading…</div>
{:else if auth.status === 'signed-out'}
  <Login />
{:else}
<div class="layout">
  <aside class="sidebar">
    <a class="brand" href="#/">Freelance<span>CRM</span></a>
    <nav>
      {#each nav as item (item.id)}
        <a href="#/{item.id}" class:active={section === item.id} aria-current={section === item.id ? 'page' : undefined}>
          <span class="icon-glyph" aria-hidden="true">{item.icon}</span>
          {item.label}
          {#if item.id === '' && due}<span class="pill" title="Follow-ups due">{due}</span>{/if}
        </a>
      {/each}
    </nav>
    <div class="sidebar-foot"><DataTools /><AccountMenu /></div>
  </aside>

  <main>
    {#key router.path}
      {#if section === 'leads'}
        <Leads />
      {:else if section === 'companies' && router.parts[1]}
        <CompanyDetail id={router.parts[1]} />
      {:else if section === 'companies'}
        <Companies />
      {:else if section === 'contacts' && router.parts[1]}
        <ContactDetail id={router.parts[1]} />
      {:else if section === 'contacts'}
        <Contacts />
      {:else}
        <Dashboard />
      {/if}
    {/key}
  </main>
</div>
{/if}

{#if notice.message}
  <div class="toast" role="status">{notice.message}</div>
{/if}
