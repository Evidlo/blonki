<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { settingsStore } from '../stores/settingsStore';
  import { storageService } from '../services/storageService';
  import { themeService } from '../services/themeService';
  import { isFilesystemSupported } from '../utils/storage';
  import type { Settings } from '../types';

  let settings: Settings = {
    storageType: 'localStorage',
    srsAlgorithm: 'sm2',
    sm2InitialInterval: 1,
    sm2EasyInterval: 4,
    sm2MinInterval: 1,
    sm2MaxInterval: 36500,
    theme: 'auto',
    cardsPerSession: 20
  };

  let filesystemSupported = false;

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

  async function createNewFile() {
    try {
      await storageService.createNewFile();
    } catch (error) {
      console.error('Failed to create new file:', error);
      alert('Failed to create new file. Please try again.');
    }
  }

  async function openFile() {
    try {
      await storageService.openFile();
    } catch (error) {
      console.error('Failed to open file:', error);
      alert('Failed to open file. Please try again.');
    }
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
      storageType: 'localStorage',
      srsAlgorithm: 'sm2',
      sm2InitialInterval: 1,
      sm2EasyInterval: 4,
      sm2MinInterval: 1,
      sm2MaxInterval: 36500,
      theme: 'auto',
      cardsPerSession: 20
    };
    settingsStore.set(settings);
  }
</script>

<div class="max-w-2xl mx-auto space-y-6">
  <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>

  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
    <!-- Storage Settings -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Data Storage</h3>
      
      <div class="space-y-4">
        <div>
          <label for="storage-type" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Storage Type</label>
          <select
            id="storage-type"
            bind:value={settings.storageType}
            on:change={(e) => updateSetting('storageType', (e.target as HTMLSelectElement).value as 'localStorage' | 'filesystem')}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="localStorage">Browser Local Storage</option>
            <option value="filesystem" disabled={!filesystemSupported}>
              Filesystem API {!filesystemSupported ? '(Not Supported)' : ''}
            </option>
          </select>
          {#if !filesystemSupported}
            <p class="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
              Filesystem API is not supported in this browser. Using Local Storage instead.
            </p>
          {:else if settings.storageType === 'filesystem'}
            <div class="mt-4 space-y-2">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Filesystem storage allows you to save your data to a local file.
              </p>
              <div class="flex space-x-2">
                <button
                  class="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                  on:click={createNewFile}
                >
                  Create New File
                </button>
                <button
                  class="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  on:click={openFile}
                >
                  Open File
                </button>
              </div>
            </div>
          {/if}
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
