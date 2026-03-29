<script lang="ts">
  export let search_query = '';
  export let show_composer = false;
  export let on_search_input: () => void;
  export let on_toggle_composer: () => void;
</script>

<section class="hero">
  <div class="hero-bar">
    <p class="eyebrow">karing-web</p>
    <label class="search-control">
      <input
        type="search"
        bind:value={search_query}
        placeholder="search"
        on:input={on_search_input}
      />
    </label>
    <button
      type="button"
      class="add-button"
      on:click={on_toggle_composer}
      aria-expanded={show_composer}
      aria-controls="new-memo-panel"
    >
      +
    </button>
  </div>
</section>
