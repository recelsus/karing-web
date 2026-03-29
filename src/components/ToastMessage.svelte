<script lang="ts">
  export let message = '';
  export let kind: 'status' | 'error' = 'status';
</script>

{#if message}
  <div class="toast-wrap" aria-live="polite">
    <p class:toast={true} class:toast-error={kind === 'error'}>
      {message}
    </p>
  </div>
{/if}
