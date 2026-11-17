<script>
  let { title, onclose, children } = $props();
  let dialog;

  $effect(() => {
    dialog.showModal();
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  onclose={onclose}
  onclick={(e) => e.target === dialog && dialog.close()}
>
  <div class="modal">
    <header>
      <h2>{title}</h2>
      <button type="button" class="icon" aria-label="Close" onclick={() => dialog.close()}>✕</button>
    </header>
    {@render children()}
  </div>
</dialog>

<style>
  dialog {
    border: 1px solid var(--border);
    padding: 0;
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--text);
    width: min(560px, calc(100vw - 32px));
    box-shadow: var(--shadow-lg);
  }
  dialog::backdrop {
    background: rgb(14 9 22 / 0.75);
  }
  .modal {
    padding: 24px 28px 28px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  h2 {
    margin: 0;
    font-size: 20px;
  }
</style>
