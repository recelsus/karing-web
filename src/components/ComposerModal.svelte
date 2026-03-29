<script lang="ts">
  export let show = false;
  export let new_content = '';
  export let creating = false;
  export let on_close: () => void;
  export let on_create: () => void;
</script>

{#if show}
  <div
    class="overlay"
    role="presentation"
    on:click={(event) => {
      if (event.target === event.currentTarget) on_close();
    }}
  >
    <section class="composer composer-modal" id="new-memo-panel">
      <div class="modal-head">
        <label class="composer-label" for="new-content">new note</label>
        <button type="button" class="icon-button ghost" on:click={on_close}>x</button>
      </div>
      <textarea
        id="new-content"
        bind:value={new_content}
        rows="8"
        placeholder="Add a new note"
      ></textarea>
      <div class="toolbar">
        <button type="button" class="primary" on:click={on_create} disabled={creating}>
          {creating ? 'adding...' : 'add'}
        </button>
        <button type="button" class="ghost" on:click={on_close} disabled={creating}>
          close
        </button>
      </div>
    </section>
  </div>
{/if}
