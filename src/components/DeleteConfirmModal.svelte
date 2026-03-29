<script lang="ts">
  import type { slot_card_t } from '../types';

  export let pending_delete_card: slot_card_t | null = null;
  export let on_close: () => void;
  export let on_confirm: (slot: slot_card_t) => void;
</script>

{#if pending_delete_card}
  <div
    class="overlay"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) on_close();
    }}
  >
    <section class="confirm-dialog">
      <div class="modal-head">
        <div>
          <p class="composer-label">delete confirmation</p>
          <h2>Delete ID {pending_delete_card.id}?</h2>
        </div>
        <button type="button" class="icon-button ghost" on:click={on_close}>x</button>
      </div>
      <p class="confirm-copy">This action cannot be undone.</p>
      <div class="toolbar">
        <button type="button" class="danger" on:click={() => on_confirm(pending_delete_card)} disabled={pending_delete_card.deleting}>
          {pending_delete_card.deleting ? 'deleting...' : 'delete'}
        </button>
        <button type="button" class="ghost" on:click={on_close}>cancel</button>
      </div>
    </section>
  </div>
{/if}
