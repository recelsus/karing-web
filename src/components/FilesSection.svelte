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
  export let dragging_id: number | null = null;
  export let drag_over_id: number | null = null;
  export let on_drag_start: (id: number, event: DragEvent) => void;
  export let on_drag_over: (id: number, event: DragEvent) => void;
  export let on_drop: (id: number, event: DragEvent) => void;
  export let on_drag_end: () => void;
  export let on_open_upload: () => void;
  export let upload_in_progress = false;
  export let upload_progress = 0;
</script>

<section class="file-lane" aria-label="planned file area">
  <div class="file-lane-header">
    <div class="file-lane-title-row">
      <p class="eyebrow">files</p>
      <button
        type="button"
        class="icon-button ghost"
        on:click={on_open_upload}
        title="upload"
        aria-label="upload file"
        disabled={upload_in_progress}
      >
        <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 16V5M8 9l4-4 4 4M5 19h14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
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
      {#if upload_in_progress}
        <span class="file-count">upload {upload_progress}%</span>
      {/if}
    </div>
  </div>
  {#if file_cards.length > 0}
    <div class="file-list">
      {#each file_cards as file}
        <article
          class="file-row"
          class:dragging={dragging_id === file.id}
          class:drop-target={drag_over_id === file.id && dragging_id !== file.id}
          draggable
          on:dragstart={(event) => on_drag_start(file.id, event)}
          on:dragover={(event) => on_drag_over(file.id, event)}
          on:drop={(event) => on_drop(file.id, event)}
          on:dragend={on_drag_end}
        >
          <div class="file-meta">
            <span class="file-id">id {file.id}</span>
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
