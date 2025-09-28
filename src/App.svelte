<script lang="ts">
  import { onMount } from 'svelte';
  import { appStore } from './stores/appStore';
  import { settingsStore } from './stores/settingsStore';
  import { storageService } from './services/storageService';
  import { keyboardService } from './services/keyboardService';
  import { themeService } from './services/themeService';
  import DeckView from './views/DeckView.svelte';
  import StatsView from './views/StatsView.svelte';
  import SettingsView from './views/SettingsView.svelte';
  import ExtrasView from './views/ExtrasView.svelte';
  import InfoView from './views/InfoView.svelte';
  import type { AppState } from './types';

  let currentView: AppState['currentView'] = 'learn';
  let viewHistory: string[] = [];

  // Subscribe to app store changes
  appStore.subscribe(state => {
    currentView = state.currentView;
    viewHistory = state.viewHistory;
  });

  // Handle keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    console.log(`Key pressed: ${event.key}, target:`, event.target);
    const handled = keyboardService.handleKeydown(event);
    console.log(`Keyboard event handled: ${handled}`);
  }

  function navigateToView(view: AppState['currentView']) {
    if (view !== currentView) {
      const newHistory = [...viewHistory, currentView];
      appStore.update(state => ({ 
        ...state, 
        currentView: view, 
        viewHistory: newHistory 
      }));
    }
  }

  function goBack() {
    if (viewHistory.length > 0) {
      const newHistory = [...viewHistory];
      const previousView = newHistory.pop();
      if (previousView) {
        appStore.update(state => ({ 
          ...state, 
          currentView: previousView as AppState['currentView'], 
          viewHistory: newHistory 
        }));
      }
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    
    // Initialize services (fire and forget)
    storageService.initialize().catch(console.error);
    // Theme service initializes automatically
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="min-h-screen bg-gray-200 dark:bg-gray-900 flex flex-col w-full max-w-full overflow-x-hidden">
  <!-- Header -->
  <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 w-full">
    <div class="w-full max-w-4xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <button 
          class="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-transparent border-none p-0 cursor-pointer"
          on:click={() => navigateToView('info')}
          title="Click to view app information"
          aria-label="Blonki - Click to view app information"
        >
          Blonki
        </button>
        <nav class="flex space-x-1">
          <button
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors
              {currentView === 'learn' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}"
            on:click={() => navigateToView('learn')}
          >
            Deck
            <kbd class="ml-1 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">6</kbd>
          </button>
          <button
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors
              {currentView === 'stats' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}"
            on:click={() => navigateToView('stats')}
          >
            Stats
            <kbd class="ml-1 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">7</kbd>
          </button>
          <button
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors
              {currentView === 'settings' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}"
            on:click={() => navigateToView('settings')}
          >
            Settings
            <kbd class="ml-1 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">8</kbd>
          </button>
          <button
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors
              {currentView === 'extras' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}"
            on:click={() => navigateToView('extras')}
          >
            Extras
            <kbd class="ml-1 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">9</kbd>
          </button>
          <button
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors
              {currentView === 'info' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}"
            on:click={() => navigateToView('info')}
            title="App Information"
          >
            Info
            <kbd class="ml-1 px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">0</kbd>
          </button>
        </nav>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 flex justify-center w-full">
    <div class="w-full max-w-4xl px-4 py-6 overflow-x-hidden">
    {#if currentView === 'learn'}
      <DeckView />
    {:else if currentView === 'stats'}
      <StatsView />
    {:else if currentView === 'settings'}
      <SettingsView />
    {:else if currentView === 'extras'}
      <ExtrasView />
    {:else if currentView === 'info'}
      <InfoView />
    {/if}
    </div>
  </main>

</div>