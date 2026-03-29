<script lang="ts">
  import type { slot_card_t } from '../types';

  export let expanded_card: slot_card_t | null = null;
  export let on_close: () => void;
  export let on_save: (slot: slot_card_t) => void;
  export let on_delete: (slot: slot_card_t) => void;
  export let on_copy: (slot: slot_card_t) => void;
</script>

{#if expanded_card}
  <div
    class="overlay"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) on_close();
    }}
  >
    <section class="expanded-card">
      <div class="modal-head">
        <div>
          <p class="composer-label">expanded editor</p>
          <h2>id {expanded_card.id}</h2>
        </div>
        <button type="button" class="icon-button ghost" on:click={on_close}>x</button>
      </div>
      {#if expanded_card.filename}
        <p class="expanded-subtitle">{expanded_card.filename}</p>
      {/if}
      <textarea bind:value={expanded_card.draft} rows="18"></textarea>
      <div class="toolbar">
        <button type="button" class="primary" on:click={() => on_save(expanded_card)} disabled={expanded_card.saving || expanded_card.deleting}>
          {expanded_card.saving ? 'saving...' : 'save'}
        </button>
        <button type="button" class="danger" on:click={() => on_delete(expanded_card)} disabled={expanded_card.saving || expanded_card.deleting}>
          {expanded_card.deleting ? 'deleting...' : 'delete'}
        </button>
        <button type="button" class="ghost" on:click={() => on_copy(expanded_card)}>copy</button>
        <button type="button" class="ghost" on:click={on_close}>close</button>
      </div>
    </section>
  </div>
{/if}
