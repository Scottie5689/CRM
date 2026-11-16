<script>
  import { db, replaceAll, clearAll, sampleData, flash } from '../lib/db.svelte.js';
  import { today } from '../lib/format.js';

  let fileInput;

  function exportJson() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `crm-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJson(e) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (confirm('Replace all current data with this backup?')) await replaceAll(data);
    } catch (err) {
      flash(`Couldn't import that file: ${err.message}`);
    }
  }

  async function run(fn) {
    try {
      await fn();
    } catch (err) {
      flash(err.message);
    }
  }

  function reset() {
    if (confirm('Delete ALL companies, contacts and leads? This cannot be undone — export a backup first if unsure.')) run(clearAll);
  }

  function loadSample() {
    if (confirm('Replace current data with sample data?')) run(() => replaceAll(sampleData()));
  }
</script>

<details class="tools">
  <summary>Data</summary>
  <button class="ghost" onclick={exportJson}>Export backup</button>
  <button class="ghost" onclick={() => fileInput.click()}>Import backup</button>
  <button class="ghost" onclick={loadSample}>Load sample data</button>
  <button class="ghost danger" onclick={reset}>Clear all data</button>
  <input bind:this={fileInput} type="file" accept="application/json" hidden onchange={importJson} />
</details>

<style>
  .tools {
    font-size: 0.85rem;
  }
  summary {
    cursor: pointer;
    color: var(--muted);
    padding: 6px 10px;
  }
  .tools button {
    display: block;
    width: 100%;
    text-align: left;
    font-size: 0.85rem;
  }
</style>
