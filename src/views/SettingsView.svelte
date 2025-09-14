<script lang="ts">
  import { onMount } from 'svelte';
  import { settingsStore } from '../stores/settingsStore';
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
    // TODO: Load from storage
    settingsStore.subscribe(value => settings = value);
  }

  function checkFilesystemSupport() {
    // Check if Filesystem API is supported
    filesystemSupported = 'showOpenFilePicker' in window;
  }

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    settings = { ...settings, [key]: value };
    settingsStore.set(settings);
    // TODO: Save to storage
  }

  function saveSettings() {
    settingsStore.set(settings);
    // TODO: Save to storage
    alert('Settings saved!');
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
  <h2 class="text-xl font-semibold text-gray-900">Settings</h2>

  <div class="bg-white rounded-lg shadow p-6 space-y-6">
    <!-- Storage Settings -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-4">Data Storage</h3>
      
      <div class="space-y-4">
        <div>
          <label for="storage-type" class="block text-sm font-medium text-gray-700 mb-2">Storage Type</label>
          <select
            id="storage-type"
            bind:value={settings.storageType}
            on:change={(e) => updateSetting('storageType', (e.target as HTMLSelectElement).value as 'localStorage' | 'filesystem')}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="localStorage">Browser Local Storage</option>
            <option value="filesystem" disabled={!filesystemSupported}>
              Filesystem API {!filesystemSupported ? '(Not Supported)' : ''}
            </option>
          </select>
          {#if !filesystemSupported}
            <p class="text-sm text-yellow-600 mt-1">
              Filesystem API is not supported in this browser. Using Local Storage instead.
            </p>
          {/if}
        </div>
      </div>
    </div>

    <!-- SRS Algorithm Settings -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-4">Spaced Repetition Algorithm</h3>
      
      <div class="space-y-4">
        <div>
          <label for="srs-algorithm" class="block text-sm font-medium text-gray-700 mb-2">Algorithm</label>
          <select
            id="srs-algorithm"
            bind:value={settings.srsAlgorithm}
            on:change={(e) => updateSetting('srsAlgorithm', (e.target as HTMLSelectElement).value as 'sm2' | 'sm17' | 'custom')}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="sm2">SM-2 (Anki Default)</option>
            <option value="sm17">SM-17 (Anki 2.1+)</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {#if settings.srsAlgorithm === 'sm2' || settings.srsAlgorithm === 'custom'}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="initial-interval" class="block text-sm font-medium text-gray-700 mb-2">Initial Interval (days)</label>
              <input
                id="initial-interval"
                type="number"
                bind:value={settings.sm2InitialInterval}
                on:change={(e) => updateSetting('sm2InitialInterval', parseInt((e.target as HTMLInputElement).value))}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            
            <div>
              <label for="easy-interval" class="block text-sm font-medium text-gray-700 mb-2">Easy Interval (days)</label>
              <input
                id="easy-interval"
                type="number"
                bind:value={settings.sm2EasyInterval}
                on:change={(e) => updateSetting('sm2EasyInterval', parseInt((e.target as HTMLInputElement).value))}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            
            <div>
              <label for="min-interval" class="block text-sm font-medium text-gray-700 mb-2">Min Interval (days)</label>
              <input
                id="min-interval"
                type="number"
                bind:value={settings.sm2MinInterval}
                on:change={(e) => updateSetting('sm2MinInterval', parseInt((e.target as HTMLInputElement).value))}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            
            <div>
              <label for="max-interval" class="block text-sm font-medium text-gray-700 mb-2">Max Interval (days)</label>
              <input
                id="max-interval"
                type="number"
                bind:value={settings.sm2MaxInterval}
                on:change={(e) => updateSetting('sm2MaxInterval', parseInt((e.target as HTMLInputElement).value))}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- UI Settings -->
    <div>
      <h3 class="text-lg font-medium text-gray-900 mb-4">User Interface</h3>
      
      <div class="space-y-4">
        <div>
          <label for="theme" class="block text-sm font-medium text-gray-700 mb-2">Theme</label>
          <select
            id="theme"
            bind:value={settings.theme}
            on:change={(e) => updateSetting('theme', (e.target as HTMLSelectElement).value as 'light' | 'dark' | 'auto')}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="auto">Auto (System)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        
        <div>
          <label for="cards-per-session" class="block text-sm font-medium text-gray-700 mb-2">Cards per Session</label>
          <input
            id="cards-per-session"
            type="number"
            bind:value={settings.cardsPerSession}
            on:change={(e) => updateSetting('cardsPerSession', parseInt((e.target as HTMLInputElement).value))}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="100"
          />
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-between pt-6 border-t border-gray-200">
      <button
        class="px-4 py-2 text-gray-600 hover:text-gray-900"
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
