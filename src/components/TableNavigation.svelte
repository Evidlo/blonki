<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { keyboardService, type KeyboardHandler } from '../services/keyboardService';

  export let items: any[] = [];
  export let selectedIndex = 0;
  export let onSelect: (index: number) => void = () => {};

  let tableRef: HTMLTableElement;

  const keyboardHandler: KeyboardHandler = {
    handleKeydown: (event: KeyboardEvent) => {
      // Only handle navigation if this table is visible and focused
      if (!tableRef || tableRef.offsetParent === null) {
        return false;
      }

      // Up arrow or J key
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'j') {
        event.preventDefault();
        if (selectedIndex > 0) {
          selectedIndex--;
          onSelect(selectedIndex);
        }
        return true;
      }

      // Down arrow or K key
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (selectedIndex < items.length - 1) {
          selectedIndex++;
          onSelect(selectedIndex);
        }
        return true;
      }

      // Enter key to activate selected item
      if (event.key === 'Enter') {
        event.preventDefault();
        onSelect(selectedIndex);
        return true;
      }

      return false;
    }
  };

  onMount(() => {
    keyboardService.registerHandler(keyboardHandler);
  });

  onDestroy(() => {
    keyboardService.unregisterHandler(keyboardHandler);
  });

  function handleRowClick(index: number) {
    selectedIndex = index;
    onSelect(index);
  }

  function handleRowMouseEnter(index: number) {
    selectedIndex = index;
  }
</script>

<div class="table-container">
  <table class="min-w-full divide-y divide-gray-200" bind:this={tableRef}>
    <slot />
  </table>
</div>

<style>
  .table-container {
    overflow-x: auto;
  }
  
  :global(.table-container table tbody tr) {
    cursor: pointer;
  }
  
  :global(.table-container table tbody tr:hover) {
    background-color: #e5e7eb;
  }
  
  :global(.table-container table tbody tr.selected) {
    background-color: #eff6ff;
    box-shadow: 0 0 0 2px #dbeafe;
  }
</style>
