<script lang="ts">
  let selected = $state(false);
</script>
<button
  type="button"
  class="rounded-full border border-[var(--outline-variant)] bg-[var(--primary-container)] px-4 py-2 text-sm text-[var(--on-primary-container)] transition hover:bg-[var(--surface-container-highest)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
  aria-pressed={selected}
  onclick={() => (selected = !selected)}
>
  {selected ? "Interactive island ready ✓" : "Test Svelte island"}
</button>

