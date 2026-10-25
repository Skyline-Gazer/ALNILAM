<script lang="ts">
  let selected = $state(false);
</script>
<button
  type="button"
  class="rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-sm text-sky-100 transition hover:bg-sky-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
  aria-pressed={selected}
  onclick={() => (selected = !selected)}
>
  {selected ? "Interactive island ready ✓" : "Test Svelte island"}
</button>

