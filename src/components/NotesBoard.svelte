<script lang="ts">
  import type { slot_card_t, sort_option_t } from '../types';

  export let loading = false;
  export let text_cards: slot_card_t[] = [];
  export let sort_option: sort_option_t = 'id-asc';
  export let format_timestamp: (unix_seconds?: number) => string;
  export let on_sort_change: () => void;
  export let on_save: (slot: slot_card_t) => void;
  export let on_delete: (slot: slot_card_t) => void;
  export let on_copy: (slot: slot_card_t) => void;
  export let on_expand: (slot: slot_card_t) => void;
  export let selected_swap_ids: number[] = [];
  export let on_toggle_swap: (id: number) => void;
  export let swap_target_id: number | null = null;
  export let on_swap: () => void;
</script>

<section class="board-header">
  <label class="sort-control">
    <span>sort</span>
    <select bind:value={sort_option} on:change={on_sort_change}>
      <option value="id-asc">ID</option>
      <option value="id-desc">ID desc</option>
      <option value="updated-asc">Updated</option>
      <option value="updated-desc">Updated desc</option>
    </select>
  </label>
  <span class="slot-count">{text_cards.length} active notes</span>
</section>

<section class="board" aria-label="memo slots">
  {#if loading && text_cards.length === 0}
    <article class="empty-state">
      <h2>Loading notes...</h2>
      <p>Fetching active text entries from `/search`.</p>
    </article>
  {:else if text_cards.length === 0}
    <article class="empty-state">
      <h2>No active notes</h2>
      <p>Empty slots are hidden. Use `+` to add a new note.</p>
    </article>
  {:else}
    {#each text_cards as slot}
      <article class="card">
        <header>
          {#if slot.filename}
            <h2>{slot.filename}</h2>
          {/if}
        </header>
        <textarea bind:value={slot.draft} rows="4"></textarea>

        <div class="card-actions">
          <div class="toolbar compact-toolbar">
            <button
              type="button"
              class="icon-button primary"
              on:click={() => on_save(slot)}
              disabled={slot.saving || slot.deleting}
              aria-label={`save id ${slot.id}`}
              title="save"
            >
              {#if slot.saving}
                ...
              {:else}
                <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 4h11l3 3v13H5zM8 4v6h8V4M9 18h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              {/if}
            </button>
            <button
              type="button"
              class="icon-button danger"
              on:click={() => on_delete(slot)}
              disabled={slot.saving || slot.deleting}
              aria-label={`delete id ${slot.id}`}
              title="delete"
            >
              {#if slot.deleting}
                ...
              {:else}
                <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              {/if}
            </button>
          </div>
          <div class="toolbar compact-toolbar">
            <button
              type="button"
              class="icon-button ghost"
              on:click={() => on_copy(slot)}
              aria-label={`copy id ${slot.id}`}
              title="copy"
            >
              <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 9h10v11H9zM5 4h10v3M5 4v11h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              class="icon-button ghost"
              on:click={() => on_expand(slot)}
              aria-label={`expand id ${slot.id}`}
              title="expand"
            >
              <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 4H4v5M15 4h5v5M20 15v5h-5M4 15v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <footer>
          <span>{format_timestamp(slot.updated_at ?? slot.created_at)}</span>
          <div class="swap-controls">
            {#if swap_target_id === slot.id}
              <button type="button" class="swap-button" on:click={on_swap} title="swap">
                <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M7 7h11M14 4l4 3-4 3M17 17H6M10 14l-4 3 4 3"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            {/if}
            <button
              type="button"
              class:selected-swap={selected_swap_ids.includes(slot.id)}
              class="floating-id"
              on:click={() => on_toggle_swap(slot.id)}
            >
              id {slot.id}
            </button>
          </div>
        </footer>
      </article>
    {/each}
  {/if}
</section>
