<script>
  import Modal from './Modal.svelte';
  import { save, remove } from '../lib/db.svelte.js';

  let { company = {}, onclose, onsaved } = $props();
  // Form edits a copy; the record is only written on Save.
  // svelte-ignore state_referenced_locally
  let form = $state({ name: '', website: '', industry: '', notes: '', ...company });

  function submit(e) {
    e.preventDefault();
    const id = save('companies', $state.snapshot(form));
    onsaved?.(id);
    onclose();
  }

  function del() {
    if (confirm(`Delete ${form.name}? Contacts and leads will be kept but unlinked.`)) {
      remove('companies', form.id);
      onclose();
    }
  }
</script>

<Modal title={form.id ? 'Edit company' : 'New company'} {onclose}>
  <form onsubmit={submit} class="form">

    <!-- svelte-ignore a11y_autofocus -->
    <label class="full">Name <input required bind:value={form.name} autofocus /></label>
    <label>Industry <input bind:value={form.industry} /></label>
    <label>Website <input type="url" placeholder="https://" bind:value={form.website} /></label>
    <label class="full">Notes <textarea rows="3" bind:value={form.notes}></textarea></label>
    <footer>
      {#if form.id}<button type="button" class="danger ghost" onclick={del}>Delete</button>{/if}
      <span class="spacer"></span>
      <button type="button" class="ghost" onclick={onclose}>Cancel</button>
      <button type="submit" class="primary">Save</button>
    </footer>
  </form>
</Modal>
