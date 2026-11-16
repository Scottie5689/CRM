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
    border: none;
    padding: 0;
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--text);
    width: min(560px, calc(100vw - 32px));
    box-shadow: var(--shadow-lg);
  }
  dialog::backdrop {
    background: rgb(15 23 42 / 0.45);
  }
  .modal {
    padding: 20px 24px 24px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  h2 {
    margin: 0;
    font-size: 1.1rem;
  }
</style>
