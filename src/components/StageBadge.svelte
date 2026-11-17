<script>
  import { stageOf } from '../lib/db.svelte.js';
  let { stage } = $props();
  let s = $derived(stageOf(stage));
</script>

<span class="badge" style:--c={s.color}>{s.label}</span>

<style>
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 14%, transparent);
    white-space: nowrap;
  }
</style>
