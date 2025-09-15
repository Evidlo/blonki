<script lang="ts">
  import { onMount } from 'svelte';
  import { appStore } from '../stores/appStore';
  import type { AppState } from '../types';

  let currentView: AppState['currentView'] = 'info';


  function navigateToView(view: AppState['currentView']) {
    appStore.update(state => {
      const newHistory = [...state.viewHistory, state.currentView];
      return {
        ...state,
        currentView: view,
        viewHistory: newHistory
      };
    });
  }
</script>

<div class="max-w-4xl mx-auto p-6">
  <div class="space-y-8">
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">Blonki</h1>
      <p class="text-xl text-gray-600 dark:text-gray-300">Web-based Anki Client</p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Version 1.0.0</p>
    </div>

    <!-- About Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">About</h2>
      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
        Blonki is a modern, web-based Anki client built with Svelte 5 and TypeScript. 
        It provides a responsive interface for spaced repetition learning with full support 
        for importing and exporting Anki decks (.apkg files) and comprehensive data management.
      </p>
    </div>

    <!-- Features Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">FAQ</h2>
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">How do I sync?</h3>
        Files are currently either saved in browser storage on the host filesystem (Chrome only).  With filesystem storage, you can use Syncthing/Dropbox or an equivalent service for syncing files.
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">Can I sync with Ankiweb?</h3>
          No, Blonki is not designed to sync with Ankiweb.  It is designed to sync with your own files on your own device.
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">What files are supported?</h3>
        Currently only .apkg files are supported.
        </div>
      </div>
    </div>


    <!-- Keyboard Shortcuts -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Keyboard Shortcuts</h2>
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">Study Interface</h3>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-gray-700 dark:text-gray-300">Show Answer / Mark Correct</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Spacebar</kbd>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-700 dark:text-gray-300">Show Answer / Mark Incorrect</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">F</kbd>
            </div>
          </div>
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">Navigation</h3>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-gray-700 dark:text-gray-300">Switch to Deck tab</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">1</kbd>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-700 dark:text-gray-300">Switch to Stats tab</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">2</kbd>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-700 dark:text-gray-300">Switch to Settings tab</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">3</kbd>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-700 dark:text-gray-300">Switch to Extras tab</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">4</kbd>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-700 dark:text-gray-300">Switch to Info tab</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">5</kbd>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-700 dark:text-gray-300">Go Back</span>
              <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">Esc</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
