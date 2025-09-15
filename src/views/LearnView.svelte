<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { deckStore, selectedDeckStore } from '../stores/deckStore';
  import { cardStore, currentCardStore, studySessionStore } from '../stores/cardStore';
  import { appStore } from '../stores/appStore';
  import { settingsStore } from '../stores/settingsStore';
  import { storageService } from '../services/storageService';
  import { importService } from '../services/importService';
  import { exportService } from '../services/exportService';
  import TableNavigation from '../components/TableNavigation.svelte';
  import type { Deck, Card } from '../types';

  let decks: Deck[] = [];
  let selectedDeck: string | null = null;
  let cards: Card[] = [];
  let currentCard: Card | null = null;
  let showBack = false;
  let currentCardIndex = 0;
  let selectedDeckIndex = 0;
  let isInStudyMode = false;
  let studySession: any = null;

  // Subscribe to stores
  deckStore.subscribe(value => decks = value);
  selectedDeckStore.subscribe(value => selectedDeck = value);
  cardStore.subscribe(value => cards = value);
  currentCardStore.subscribe(value => currentCard = value);
  studySessionStore.subscribe(value => {
    studySession = value;
    isInStudyMode = value.isActive;
    currentCardIndex = value.currentCardIndex;
    showBack = value.showBack;
    
    // If we're in study mode, load the current card
    if (value.isActive && cards.length > 0 && value.currentCardIndex < cards.length) {
      currentCardStore.set(cards[value.currentCardIndex]);
    }
  });

  onMount(() => {
    // Reset selected deck when entering Learn view
    selectedDeckStore.set(null);
    
    // Data is loaded by storage service initialization in App.svelte
    // Just subscribe to store changes
    
    // Check if there's an active study session to restore
    if (studySession && studySession.isActive && studySession.deckId) {
      selectedDeckStore.set(studySession.deckId);
      loadCardsForDeck(studySession.deckId);
    }
    
    // Listen for keyboard events
    window.addEventListener('keyboard-correct', handleKeyboardCorrect);
    window.addEventListener('keyboard-incorrect', handleKeyboardIncorrect);
  });

  onDestroy(() => {
    window.removeEventListener('keyboard-correct', handleKeyboardCorrect);
    window.removeEventListener('keyboard-incorrect', handleKeyboardIncorrect);
  });

  function selectDeck(deckId: string) {
    selectedDeckStore.set(deckId);
    loadCardsForDeck(deckId);
    studySessionStore.set({
      isActive: true,
      currentCardIndex: 0,
      showBack: false,
      deckId: deckId
    });
  }

  function selectDeckByIndex(index: number) {
    if (index >= 0 && index < decks.length) {
      selectedDeckIndex = index;
      selectDeck(decks[index].id);
    }
  }

  function handleKeyboardCorrect() {
    if (currentCard && showBack) {
      handleResponse('correct');
    }
  }

  function handleKeyboardIncorrect() {
    if (currentCard && showBack) {
      handleResponse('incorrect');
    }
  }

  async function loadCardsForDeck(deckId: string) {
    try {
      const deckCards = await storageService.getCardsForDeck(deckId);
      cardStore.set(deckCards);
      if (deckCards.length > 0) {
        currentCardStore.set(deckCards[0]);
        currentCardIndex = 0;
      }
    } catch (error) {
      console.error('Failed to load cards for deck:', error);
    }
  }

  function showCardBack() {
    studySessionStore.update(session => ({
      ...session,
      showBack: true
    }));
  }

  function handleResponse(response: 'correct' | 'incorrect') {
    if (!currentCard) return;

    // TODO: Update card with SRS algorithm
    // TODO: Save review result
    
    // Move to next card
    nextCard();
  }

  function nextCard() {
    if (currentCardIndex < cards.length - 1) {
      const newIndex = currentCardIndex + 1;
      studySessionStore.update(session => ({
        ...session,
        currentCardIndex: newIndex,
        showBack: false
      }));
    } else {
      // Finished all cards
      exitStudyMode();
    }
  }

  function exitStudyMode() {
      selectedDeckStore.set(null);
      currentCardStore.set(null);
    studySessionStore.set({
      isActive: false,
      currentCardIndex: 0,
      showBack: false,
      deckId: null
    });
  }

  // TODO: Import from URL functionality needs to be redesigned for File System Access mode
  // The user flow needs to be thought through for how to handle downloaded .apkg files
  // when File System Access is selected (where to save them, etc.)
  /*
  async function importFromURL() {
    const url = prompt('Enter the URL to import from:');
    if (!url) return;

    try {
      const result = await importService.importFromURL(url);
      if (!result.success) {
        alert(`Import failed: ${result.message}`);
      }
      // Data will be automatically updated via store subscriptions
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  */

  async function openFromFile() {
    try {
      // Check if File System Access API is supported
      if (!('showOpenFilePicker' in window)) {
        // Fallback to traditional file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.apkg';
        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (!file) return;

          try {
            const result = await importService.importFile(file);
            if (!result.success) {
              alert(`Import failed: ${result.message}`);
            }
            // Data will be automatically updated via store subscriptions
          } catch (error) {
            console.error('Import failed:', error);
            alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        };
        input.click();
        return;
      }

      // Use File System Access API
      const fileHandles = await window.showOpenFilePicker?.({
        types: [{
          description: 'Anki Package files',
          accept: {
            'application/zip': ['.apkg']
          }
        }],
        multiple: false
      });

      if (!fileHandles || fileHandles.length === 0) {
        return; // User cancelled
      }

      const fileHandle = fileHandles[0];
      
      // Check current storage type
      const settings = get(settingsStore);
      if (settings.storageType === 'fileSystemAccess') {
        // Load deck from file and link it
        const { deck, cards } = await storageService.loadDeckFromFile(fileHandle);
        console.log('Loaded deck with ID:', deck.id);
        
        // Link the deck to the file
        await storageService.linkDeckToFile(deck.id, fileHandle);
        
        // Update deck with file linking properties
        const linkedDeck = {
          ...deck,
          isLinkedToFile: true,
          filePath: storageService.getDeckFilePath(deck.id)
        };
        
        // Add deck and cards using storage service to ensure they're saved to localStorage
        const currentDecks = get(deckStore);
        const currentCards = get(cardStore);
        
        // Save the new deck and cards through storage service
        await storageService.saveDecks([...currentDecks, linkedDeck]);
        // Only save cards to localStorage initially, not to file (avoids permission dialog)
        await storageService.saveCardsToLocalStorageOnly([...currentCards, ...cards]);
      } else {
        // Traditional import (localStorage mode)
        const file = await fileHandle.getFile();
        const result = await importService.importFile(file);
        if (!result.success) {
          alert(`Import failed: ${result.message}`);
        }
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        alert(`Failed to open file: ${error.message}`);
      }
    }
  }

  async function exportDeck(deckId: string) {
    try {
      await exportService.exportDeck(deckId);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function exportAllDecks() {
    try {
      await exportService.exportAllDecks();
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function deleteDeck(deckId: string, deckName: string) {
    if (confirm(`Are you sure you want to delete the deck "${deckName}"? This will also delete all cards in this deck.`)) {
      try {
        // First delete all cards in this deck
        const cardsToDelete = cards.filter(card => card.deckId === deckId);
        for (const card of cardsToDelete) {
          await storageService.deleteCard(card.id);
        }
        
        // Then delete the deck
        await storageService.deleteDeck(deckId);
        
        // Reset selection if the deleted deck was selected
        if (selectedDeck === deckId) {
          selectedDeck = null;
          selectedDeckStore.set(null);
        }
      } catch (error) {
        console.error('Delete failed:', error);
        alert(`Failed to delete deck: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
</script>

{#if !selectedDeck}
  <!-- Deck Selection View -->
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Select a Deck to Study</h2>
      <div class="flex space-x-2">
        <!-- TODO: Import from URL functionality commented out - needs redesign for File System Access mode -->
        <!--
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          on:click={importFromURL}
        >
          Import from URL
        </button>
        -->
        <button
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          on:click={openFromFile}
        >
          Open from File
        </button>
        <button
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          on:click={exportAllDecks}
        >
          Export All
        </button>
      </div>
    </div>

    {#if decks.length === 0}
      <div class="text-center py-12">
        <div class="text-gray-500 mb-4">No decks available</div>
        <p class="text-sm text-gray-400">Import a deck or create one in the Edit tab</p>
      </div>
    {:else}
      <TableNavigation items={decks} selectedIndex={selectedDeckIndex} onSelect={selectDeckByIndex}>
          <thead class="bg-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deck Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cards
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
          {#each decks as deck, index}
            <tr 
              class="hover:bg-gray-200 {selectedDeckIndex === index ? 'selected' : ''}"
              on:click={() => selectDeck(deck.id)}
              on:mouseenter={() => selectedDeckIndex = index}
            >
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {deck.name}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {deck.filePath || 'Browser Storage'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {deck.cardCount}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    on:click={() => selectDeck(deck.id)}
                  >
                    Study
                  </button>
                  <button
                    class="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                    on:click|stopPropagation={() => exportDeck(deck.id)}
                  >
                    Export
                  </button>
                  <button
                    class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    on:click|stopPropagation={() => deleteDeck(deck.id, deck.name)}
                    title="Delete deck"
                  >
                    Delete
                  </button>
                </div>
                </td>
              </tr>
            {/each}
          </tbody>
      </TableNavigation>
    {/if}
  </div>
{:else if isInStudyMode && currentCard}
  <!-- Card Review View -->
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow-lg p-8">
      <!-- Back button -->
      <div class="mb-4">
        <button
          class="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
          on:click={exitStudyMode}
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Decks
        </button>
      </div>
      
      <!-- Progress indicator -->
      <div class="mb-6">
        <div class="flex justify-between text-sm text-gray-600 mb-2">
          <span>Card {currentCardIndex + 1} of {cards.length}</span>
          <span>{Math.round(((currentCardIndex + 1) / cards.length) * 100)}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style="width: {((currentCardIndex + 1) / cards.length) * 100}%"
          ></div>
        </div>
      </div>

      <!-- Card content -->
      <div class="text-center mb-8">
        <div class="min-h-[200px] flex items-center justify-center">
          {#if !showBack}
            <div class="text-2xl font-medium text-gray-900">
              {currentCard.front}
            </div>
          {:else}
            <div class="text-2xl font-medium text-gray-900">
              {currentCard.back}
            </div>
          {/if}
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex justify-center space-x-4">
        {#if !showBack}
          <button
            class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            on:click={showCardBack}
          >
            Show Answer
          </button>
        {:else}
          <button
            class="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            on:click={() => handleResponse('incorrect')}
          >
            Incorrect
          </button>
          <button
            class="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            on:click={() => handleResponse('correct')}
          >
            Correct
          </button>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <!-- No cards available -->
  <div class="text-center py-12">
    <div class="text-gray-500 mb-4">No cards available in this deck</div>
    <button
      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      on:click={() => selectedDeckStore.set(null)}
    >
      Back to Decks
    </button>
  </div>
{/if}
