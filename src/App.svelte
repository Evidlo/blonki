<script lang="ts">
  import { onMount } from 'svelte';
  import { appStore } from './stores/appStore';
  import { settingsStore } from './stores/settingsStore';
  import { storageService } from './services/storageService';
  import { keyboardService } from './services/keyboardService';
  import { themeService } from './services/themeService';
  import LearnView from './views/LearnView.svelte';
  import EditView from './views/EditView.svelte';
  import StatsView from './views/StatsView.svelte';
  import SettingsView from './views/SettingsView.svelte';
  import ExtrasView from './views/ExtrasView.svelte';
  import type { AppState } from './types';

  let currentView: AppState['currentView'] = 'learn';
  let viewHistory: string[] = [];

  // Handle keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    keyboardService.handleKeydown(event);
  }

  function navigateToView(view: AppState['currentView']) {
    if (view !== currentView) {
      viewHistory.push(currentView);
      currentView = view;
      appStore.update(state => ({ ...state, currentView, viewHistory }));
    }
  }

  function goBack() {
    if (viewHistory.length > 0) {
      const previousView = viewHistory.pop();
      if (previousView) {
        currentView = previousView as AppState['currentView'];
        appStore.update(state => ({ ...state, currentView, viewHistory }));
      }
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    
    // Initialize services (fire and forget)
    storageService.initialize().catch(console.error);
    // Theme service initializes automatically
    
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="min-h-screen bg-gray-200 dark:bg-gray-900 flex flex-col w-full max-w-full overflow-x-hidden">
  <!-- Header -->
  <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 w-full">
    <div class="w-full max-w-4xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Blonki</h1>
        <nav class="flex space-x-1">
          <button
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors
              {currentView === 'learn' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}"
            on:click={() => navigateToView('learn')}
          >
            Learn
          </button>
          <button
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors
              {currentView === 'edit' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}"
            on:click={() => navigateToView('edit')}
          >
            Edit
          </button>
          <button
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors
              {currentView === 'stats' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}"
            on:click={() => navigateToView('stats')}
          >
            Stats
          </button>
          <button
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors
              {currentView === 'settings' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}"
            on:click={() => navigateToView('settings')}
          >
            Settings
          </button>
          <button
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors
              {currentView === 'extras' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}"
            on:click={() => navigateToView('extras')}
          >
            Extras
          </button>
        </nav>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 flex justify-center w-full">
    <div class="w-full max-w-4xl px-4 py-6 overflow-x-hidden">
      {#if currentView === 'learn'}
        <LearnView />
      {:else if currentView === 'edit'}
        <EditView />
      {:else if currentView === 'stats'}
        <StatsView />
      {:else if currentView === 'settings'}
        <SettingsView />
      {:else if currentView === 'extras'}
        <ExtrasView />
      {/if}
    </div>
  </main>

  <!-- Back Button (when in sub-view) -->
  {#if viewHistory.length > 0}
    <div class="fixed bottom-4 left-4">
      <button
        class="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        on:click={goBack}
        title="Go back (ESC)"
        aria-label="Go back"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  {/if}
</div>