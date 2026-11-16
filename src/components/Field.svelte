<script>
  // Renders one input from a field definition in shared/schema.js.
  import Rating from './Rating.svelte';
  import { db } from '../lib/db.svelte.js';

  let { def, value = $bindable() } = $props();

  let refOptions = $derived(
    def.type === 'ref'
      ? [...db[def.ref]]
          .map((r) => ({ id: r.id, label: r.name ?? `${r.firstName} ${r.lastName}`.trim() }))
          .sort((a, b) => a.label.localeCompare(b.label))
      : []
  );
  let wide = $derived(def.full || def.type === 'textarea');
</script>

{#if def.type === 'rating'}
  <div class="field" class:full={wide}>
    <Rating label={def.label} max={def.max ?? 5} bind:value />
  </div>
{:else}
  <label class="field" class:full={wide}>
    <span>{def.label}{#if def.required}<span class="req" aria-hidden="true"> *</span>{/if}</span>
    {#if def.type === 'textarea'}
      <textarea rows={def.rows ?? 4} placeholder={def.placeholder} bind:value></textarea>
    {:else if def.type === 'ref'}
      <select bind:value>
        <option value="">— None —</option>
        {#each refOptions as o (o.id)}<option value={o.id}>{o.label}</option>{/each}
      </select>
    {:else if def.type === 'select'}
      <select bind:value>
        {#each def.options as o (o)}<option value={o}>{o}</option>{/each}
      </select>
    {:else if def.type === 'number'}
      <input type="number" min={def.min} placeholder={def.placeholder} required={def.required} bind:value />
    {:else}
      <input
        type={def.type === 'text' ? 'text' : def.type}
        placeholder={def.placeholder ?? (def.type === 'url' ? 'https://' : undefined)}
        maxlength={def.maxLength}
        required={def.required}
        bind:value
      />
    {/if}
  </label>
{/if}

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--muted);
    min-width: 0;
  }
  .full {
    grid-column: 1 / -1;
  }
  .req {
    color: var(--danger);
  }
</style>
