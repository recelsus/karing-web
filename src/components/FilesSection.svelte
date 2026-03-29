<script lang="ts">
  import type { slot_card_t, sort_option_t } from '../types';

  export let file_cards: slot_card_t[] = [];
  export let file_sort_option: sort_option_t = 'id-asc';
  export let format_timestamp: (unix_seconds?: number) => string;
  export let get_file_badge: (record: slot_card_t) => string;
  export let get_file_date: (record: slot_card_t) => number | undefined;
  export let get_download_href: (record: slot_card_t) => string;
  export let on_sort_change: () => void;
  export let on_delete: (slot: slot_card_t) => void;
  export let selected_swap_ids: number[] = [];
  export let on_toggle_swap: (id: number) => void;
  export let swap_ready = false;
  export let on_swap: () => void;
</script>

<section class="file-lane" aria-label="planned file area">
  <div class="file-lane-header">
    <div class="file-lane-title-row">
      <p class="eyebrow">files</p>
      {#if swap_ready}
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
    </div>
    <div class="file-lane-tools">
      <label class="sort-control">
        <span>sort</span>
        <select bind:value={file_sort_option} on:change={on_sort_change}>
          <option value="id-asc">ID</option>
          <option value="id-desc">ID desc</option>
          <option value="updated-asc">Updated</option>
          <option value="updated-desc">Updated desc</option>
        </select>
      </label>
      <span class="file-count">{file_cards.length} files detected</span>
    </div>
  </div>
  {#if file_cards.length > 0}
    <div class="file-list">
      {#each file_cards as file}
        <article class="file-row">
          <div class="file-meta">
            <button
              type="button"
              class:selected-swap={selected_swap_ids.includes(file.id)}
              class="file-id"
              on:click={() => on_toggle_swap(file.id)}
            >
              id {file.id}
            </button>
            <strong>{file.filename ?? `id ${file.id}`}</strong>
          </div>
          <div class="file-actions">
            <div class="file-details">
              <span class="file-type">{get_file_badge(file)}</span>
              <span>{format_timestamp(get_file_date(file))}</span>
            </div>
            <div class="file-action-buttons">
              <a class="file-download" href={get_download_href(file)} target="_blank" rel="noreferrer">
                download
              </a>
              <button
                type="button"
                class="icon-button danger"
                on:click={() => on_delete(file)}
                aria-label={`delete id ${file.id}`}
                title="delete"
              >
                <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <p class="file-lane-copy">No files detected.</p>
  {/if}
</section>
