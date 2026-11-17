<script>
  let { value = $bindable(0), label = 'Rating', max = 5, size = '1.75rem' } = $props();

  let hover = $state(0);
  const name = `rating-${Math.random().toString(36).slice(2)}`;
  let shown = $derived(hover || Number(value) || 0);
</script>

<fieldset class="rating">
  <legend>{label}</legend>
  <div class="row">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="stars" onmouseleave={() => (hover = 0)}>
      {#each { length: max } as _, i (i)}
        {@const n = i + 1}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_mouse_events_have_key_events -->
        <label class="star" class:on={shown >= n} style:font-size={size} onmouseenter={() => (hover = n)}>
          <input type="radio" {name} value={n} bind:group={value} />
          <span aria-hidden="true">★</span>
          <span class="sr-only">{n} {n === 1 ? 'star' : 'stars'}</span>
        </label>
      {/each}
    </div>
    <span class="caption">{value ? `${value} out of ${max}` : 'Not rated'}</span>
    {#if value}
      <button type="button" class="ghost small" onclick={() => (value = 0)}>Clear</button>
    {/if}
  </div>
</fieldset>

<style>
  fieldset {
    border: none;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 4px;
    font-size: 14px;
    font-weight: 500;
    color: var(--label);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .stars {
    display: inline-flex;
  }
  .star {
    position: relative;
    cursor: pointer;
    line-height: 1;
    padding: 0 2px;
    color: var(--star-off);
    transition: color 0.1s, transform 0.1s;
  }
  .star.on {
    color: var(--star);
  }
  .star:hover {
    transform: scale(1.1);
  }
  .star input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
  .star:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    border-radius: 4px;
  }
  .caption {
    font-size: 0.875rem;
    color: var(--muted);
  }
</style>
