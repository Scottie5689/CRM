<script>
  import { stageOf } from '../lib/db.svelte.js';
  let { stage } = $props();
  let s = $derived(stageOf(stage));
</script>

<span class="badge" style:--c={s.color}>{s.label}</span>

<style>
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 14%, transparent);
    white-space: nowrap;
  }
</style>
