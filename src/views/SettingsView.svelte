<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { settingsStore } from '../stores/settingsStore';
  import { storageService } from '../services/storageService';
  import { themeService } from '../services/themeService';
  import { isFilesystemSupported } from '../utils/storage';
  import { OpenAIService } from '../services/openaiService';
  import type { Settings } from '../types';

  let settings: Settings = {
    srsAlgorithm: 'sm2',
    sm2InitialInterval: 1,
    sm2EasyInterval: 4,
    sm2MinInterval: 1,
    sm2MaxInterval: 36500,
    theme: 'auto',
    cardsPerSession: 20,
    dueCardsLimit: 50,
    openaiEndpoint: 'https://api.openai.com',
    openaiApiKey: '',
    openaiModel: '',
    openaiModels: []
  };

  let filesystemSupported = false;
  let isLoadingModels = false;
  let openaiError = '';

  // Reactive computed values for button state
  $: hasValidEndpoint = settings?.openaiEndpoint && settings.openaiEndpoint.trim() !== '';
  $: hasValidApiKey = settings?.openaiApiKey && settings.openaiApiKey.trim() !== '';
  $: canListModels = hasValidEndpoint && hasValidApiKey && !isLoadingModels;

  onMount(() => {
    loadSettings();
    checkFilesystemSupport();
  });

  async function loadSettings() {
    // Get the current value from the store
    const currentSettings = get(settingsStore);
    if (currentSettings && Object.keys(currentSettings).length > 0) {
      settings = currentSettings;
    }
  }

  function checkFilesystemSupport() {
    // Check if Filesystem API is supported
    filesystemSupported = isFilesystemSupported();
  }


  async function downloadBackup() {
    try {
      await storageService.downloadBackup();
    } catch (error) {
      console.error('Failed to download backup:', error);
      alert('Failed to download backup. Please try again.');
    }
  }

  async function restoreFromBackup(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    try {
      await storageService.restoreFromBackup(file);
      // Clear the input
      input.value = '';
    } catch (error) {
      console.error('Failed to restore backup:', error);
      alert('Failed to restore backup. Please try again.');
    }
  }

  async function migrateFromLocalStorage() {
    if (confirm('This will copy all data from localStorage to the current storage. Continue?')) {
      try {
        await storageService.migrateFromLocalStorage();
      } catch (error) {
        console.error('Failed to migrate data:', error);
        alert('Failed to migrate data. Please try again.');
      }
    }
  }

  async function clearAllData() {
    if (confirm('This will permanently delete all your data. Are you sure?')) {
      if (confirm('This action cannot be undone. Are you absolutely sure?')) {
        try {
          await storageService.clearAllData();
        } catch (error) {
          console.error('Failed to clear data:', error);
          alert('Failed to clear data. Please try again.');
        }
      }
    }
  }

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    settings = { ...settings, [key]: value };
    settingsStore.set(settings);
    
    try {
      await storageService.saveSettings(settings);
      
      // If theme changed, update theme service
      if (key === 'theme') {
        await themeService.setTheme(value as Settings['theme']);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  async function saveSettings() {
    try {
      await storageService.saveSettings(settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  }

  function resetToDefaults() {
    settings = {
      srsAlgorithm: 'sm2',
      sm2InitialInterval: 1,
      sm2EasyInterval: 4,
      sm2MinInterval: 1,
      sm2MaxInterval: 36500,
      theme: 'auto',
      cardsPerSession: 20,
      dueCardsLimit: 50,
      openaiEndpoint: 'https://api.openai.com',
      openaiApiKey: '',
      openaiModel: '',
      openaiModels: []
    };
    settingsStore.set(settings);
  }

  async function listOpenAIModels() {
    if (!settings.openaiEndpoint || !settings.openaiApiKey) {
      openaiError = 'Please enter both endpoint and API key';
      return;
    }

    isLoadingModels = true;
    openaiError = '';

    try {
      const openaiService = new OpenAIService(settings.openaiEndpoint, settings.openaiApiKey);
      const models = await openaiService.listModels();
      
      settings = { ...settings, openaiModels: models };
      settingsStore.set(settings);
      await storageService.saveSettings(settings);
    } catch (error) {
      openaiError = error instanceof Error ? error.message : 'Failed to list models';
      console.error('Failed to list OpenAI models:', error);
    } finally {
      isLoadingModels = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto space-y-6">
  <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>

  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
    <!-- Storage Information -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Data Storage</h3>
      
      <div class="space-y-4">
        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            {#if filesystemSupported}
              <strong>File System Access API</strong> is supported in this browser. 
              Decks will be automatically linked to .apkg files on your disk, and changes are saved directly to those files.
            {:else}
              <strong>Browser Storage</strong> is being used. File System Access API is not supported in this browser.
            {/if}
          </p>
        </div>
      </div>
    </div>

    <!-- SRS Algorithm Settings -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Spaced Repetition Algorithm</h3>
      
      <div class="space-y-4">
        <div>
          <label for="srs-algorithm" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Algorithm</label>
          <select
            id="srs-algorithm"
            bind:value={settings.srsAlgorithm}
            on:change={(e) => updateSetting('srsAlgorithm', (e.target as HTMLSelectElement).value as 'sm2' | 'sm17' | 'custom')}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="sm2">SM-2 (Anki Default)</option>
            <option value="sm17">SM-17 (Anki 2.1+)</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {#if settings.srsAlgorithm === 'sm2' || settings.srsAlgorithm === 'custom'}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="initial-interval" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Initial Interval (days)</label>
              <input
                id="initial-interval"
                type="number"
                bind:value={settings.sm2InitialInterval}
                on:change={(e) => updateSetting('sm2InitialInterval', parseInt((e.target as HTMLInputElement).value))}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="1"
              />
            </div>
            
            <div>
              <label for="easy-interval" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Easy Interval (days)</label>
              <input
                id="easy-interval"
                type="number"
                bind:value={settings.sm2EasyInterval}
                on:change={(e) => updateSetting('sm2EasyInterval', parseInt((e.target as HTMLInputElement).value))}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="1"
              />
            </div>
            
            <div>
              <label for="min-interval" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Interval (days)</label>
              <input
                id="min-interval"
                type="number"
                bind:value={settings.sm2MinInterval}
                on:change={(e) => updateSetting('sm2MinInterval', parseInt((e.target as HTMLInputElement).value))}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="1"
              />
            </div>
            
            <div>
              <label for="max-interval" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Interval (days)</label>
              <input
                id="max-interval"
                type="number"
                bind:value={settings.sm2MaxInterval}
                on:change={(e) => updateSetting('sm2MaxInterval', parseInt((e.target as HTMLInputElement).value))}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="1"
              />
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- UI Settings -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">User Interface</h3>
      
      <div class="space-y-4">
        <div>
          <label for="theme" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
          <select
            id="theme"
            bind:value={settings.theme}
            on:change={(e) => updateSetting('theme', (e.target as HTMLSelectElement).value as 'light' | 'dark' | 'auto')}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="auto">Auto (System)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        
        <div>
          <label for="cards-per-session" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cards per Session</label>
          <input
            id="cards-per-session"
            type="number"
            bind:value={settings.cardsPerSession}
            on:change={(e) => updateSetting('cardsPerSession', parseInt((e.target as HTMLInputElement).value))}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            min="1"
            max="100"
          />
        </div>
        
        <div>
          <label for="due-cards-limit" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Cards Limit</label>
          <input
            id="due-cards-limit"
            type="number"
            bind:value={settings.dueCardsLimit}
            on:change={(e) => updateSetting('dueCardsLimit', parseInt((e.target as HTMLInputElement).value))}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            min="1"
            max="200"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Maximum number of due cards to study in one session</p>
        </div>
      </div>
    </div>

    <!-- OpenAI Settings -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">OpenAI Integration</h3>
      
      <div class="space-y-4">
        <div>
          <label for="openai-endpoint" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Endpoint</label>
          <input
            id="openai-endpoint"
            type="url"
            bind:value={settings.openaiEndpoint}
            on:change={(e) => updateSetting('openaiEndpoint', (e.target as HTMLInputElement).value)}
            placeholder="https://api.openai.com"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">OpenAI-compatible API endpoint (e.g., OpenAI, Ollama, etc.)</p>
        </div>

        <div>
          <label for="openai-api-key" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Key</label>
          <input
            id="openai-api-key"
            type="password"
            bind:value={settings.openaiApiKey}
            on:change={(e) => updateSetting('openaiApiKey', (e.target as HTMLInputElement).value)}
            placeholder="sk-..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">API key for authentication (sent as Authorization: Bearer header)</p>
        </div>

        <div class="flex gap-4 items-end">
          <div class="flex-1">
            <label for="openai-model" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Model</label>
            <select
              id="openai-model"
              bind:value={settings.openaiModel}
              on:change={(e) => updateSetting('openaiModel', (e.target as HTMLSelectElement).value)}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={!settings.openaiModels || settings.openaiModels.length === 0}
            >
              <option value="">Select a model...</option>
              {#each (settings.openaiModels || []) as model}
                <option value={model}>{model}</option>
              {/each}
            </select>
          </div>
          
          <div>
            <button
              type="button"
              on:click={listOpenAIModels}
              disabled={!canListModels}
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoadingModels ? 'Loading...' : 'List Models'}
            </button>
          </div>
        </div>

        {#if openaiError}
          <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p class="text-sm text-red-800 dark:text-red-200">{openaiError}</p>
          </div>
        {/if}

        {#if settings.openaiModels && settings.openaiModels.length > 0}
          <div class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p class="text-sm text-green-800 dark:text-green-200">
              Found {settings.openaiModels.length} model{settings.openaiModels.length === 1 ? '' : 's'} available
            </p>
          </div>
        {/if}

        <!-- Debug info (remove in production) -->
        <div class="p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
          <p>Debug: Endpoint="{settings?.openaiEndpoint || 'undefined'}" (valid: {hasValidEndpoint})</p>
          <p>Debug: API Key="{settings?.openaiApiKey ? '***' + settings.openaiApiKey.slice(-4) : 'empty'}" (valid: {hasValidApiKey})</p>
          <p>Debug: Can list models: {canListModels}</p>
        </div>
      </div>
    </div>

    <!-- Backup and Migration -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Backup & Migration</h3>
      
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Backup Data</h4>
            <button
              class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              on:click={downloadBackup}
            >
              Download Backup
            </button>
          </div>
          
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Restore Data</h4>
            <input
              type="file"
              accept=".json"
              on:change={restoreFromBackup}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Migration</h4>
            <button
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              on:click={migrateFromLocalStorage}
            >
              Migrate from localStorage
            </button>
          </div>
          
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Danger Zone</h4>
            <button
              class="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              on:click={clearAllData}
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-600">
      <button
        class="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        on:click={resetToDefaults}
      >
        Reset to Defaults
      </button>
      
      <button
        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        on:click={saveSettings}
      >
        Save Settings
      </button>
    </div>
  </div>
</div>
