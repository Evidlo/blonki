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
  import { isFilesystemSupported } from '../utils/storage';
  import { SM2Adapter } from '../utils/sm2Adapter';
  import TableNavigation from '../components/TableNavigation.svelte';
  import type { Deck, Card, Settings } from '../types';

  let decks: Deck[] = [];
  let selectedDeck: string | null = null;
  let cards: Card[] = [];
  let currentCard: Card | null = null;
  let showBack = false;
  let currentCardIndex = 0;
  let selectedDeckIndex = 0;
  let isInStudyMode = false;
  let studySession: any = null;
  let editingCard: Card | null = null;
  let isEditing = false;
  let selectedCardIndex = 0;
  let settings: Settings | null = null;
  let studyCards: Card[] = [];
  let srsCounts = { new: 0, learning: 0, due: 0 };
  let deckSRSCounts: Record<string, { new: number; learning: number; due: number }> = {};

  // Function to get SRS counts for a deck
  function getSRSCounts(deckId: string): { new: number; learning: number; due: number } {
    const deckCards = cards.filter(card => card.deckId === deckId);
    const counts = SM2Adapter.countCardsByStatus(deckCards);
    return counts;
  }

  // Subscribe to stores
  deckStore.subscribe(value => decks = value);
  selectedDeckStore.subscribe(value => selectedDeck = value);
  cardStore.subscribe(value => {
    cards = value;
    // Update SRS counts when cards change - but only if we have a selected deck
    if (selectedDeck) {
      srsCounts = getSRSCounts(selectedDeck);
    }
  });
  currentCardStore.subscribe(value => currentCard = value);
  settingsStore.subscribe(value => settings = value);
  studySessionStore.subscribe(value => {
    studySession = value;
    isInStudyMode = value.isActive;
    currentCardIndex = value.currentCardIndex;
    showBack = value.showBack;
    
    // If we're in study mode, load the current card from study cards
    if (value.isActive && studyCards.length > 0 && value.currentCardIndex < studyCards.length) {
      console.log('Study session subscription - setting current card:', studyCards[value.currentCardIndex]);
      currentCardStore.set(studyCards[value.currentCardIndex]);
    }
  });

  // Reactive statement to find the current deck
  $: currentDeck = selectedDeck ? decks.find(d => d.id === selectedDeck) : null;
  
  // Reactive statement to update SRS counts for all decks when cards or decks change
  $: {
    deckSRSCounts = {};
    for (const deck of decks) {
      const counts = getSRSCounts(deck.id);
      deckSRSCounts[deck.id] = counts;
    }
  }

  onMount(async () => {
    // Reset selected deck when entering Learn view
    selectedDeckStore.set(null);
    
    // Data is loaded by storage service initialization in App.svelte
    // Just subscribe to store changes
    
    // Check if there's an active study session to restore
    if (studySession && studySession.isActive && studySession.deckId) {
      selectedDeckStore.set(studySession.deckId);
      await loadCardsForDeck(studySession.deckId);
      
      // Restore study cards and SRS counts
      const dueCardsLimit = settings?.dueCardsLimit || 50;
      studyCards = SM2Adapter.getStudyCards(cards, dueCardsLimit);
      srsCounts = getSRSCounts(studySession.deckId);
      
      // Set current card from study cards
      if (studyCards.length > 0 && studySession.currentCardIndex < studyCards.length) {
        currentCardStore.set(studyCards[studySession.currentCardIndex]);
      }
    }
    
    // Listen for keyboard events
    window.addEventListener('keyboard-correct', handleKeyboardCorrect);
    window.addEventListener('keyboard-incorrect', handleKeyboardIncorrect);
    window.addEventListener('keyboard-quality', handleKeyboardQuality);
    window.addEventListener('keyboard-escape', handleKeyboardEscape);
  });

  onDestroy(() => {
    window.removeEventListener('keyboard-correct', handleKeyboardCorrect);
    window.removeEventListener('keyboard-incorrect', handleKeyboardIncorrect);
    window.removeEventListener('keyboard-quality', handleKeyboardQuality);
    window.removeEventListener('keyboard-escape', handleKeyboardEscape);
  });

  async function selectDeck(deckId: string) {
    selectedDeckStore.set(deckId);
    await loadCardsForDeck(deckId);
    
    // Get SRS-aware study cards
    const dueCardsLimit = settings?.dueCardsLimit || 50;
    studyCards = SM2Adapter.getStudyCards(cards, dueCardsLimit);
    srsCounts = getSRSCounts(deckId);
    
    console.log('selectDeck - studyCards:', studyCards.length, 'cards:', studyCards);
    
    if (studyCards.length === 0) {
      // No cards due for study
      alert('No cards are due for review right now!');
      return;
    }
    
    studySessionStore.set({
      isActive: true,
      currentCardIndex: 0,
      showBack: false,
      deckId: deckId
    });
    
    // Set the first study card as current
    if (studyCards.length > 0) {
      currentCardStore.set(studyCards[0]);
    }
  }

  function editDeck(deckId: string) {
    selectedDeckStore.set(deckId);
    loadCardsForDeck(deckId);
    // Don't enter study mode, just show the cards list
  }

  function selectDeckByIndex(index: number) {
    if (index >= 0 && index < decks.length) {
      selectedDeckIndex = index;
      selectDeck(decks[index].id);
    }
  }

  function handleKeyboardCorrect() {
    if (currentCard) {
      if (!showBack) {
        // Show the answer first
        showCardBack();
      } else {
        // Mark as quality 3 (good)
        handleQualityResponse(3);
      }
    }
  }

  function handleKeyboardIncorrect() {
    if (currentCard) {
      if (!showBack) {
        // Show the answer first
        showCardBack();
      } else {
        // Mark as quality 1 (again)
        handleQualityResponse(1);
      }
    }
  }

  function handleKeyboardQuality(event: Event) {
    const customEvent = event as CustomEvent;
    if (currentCard && !showBack) {
      // Show the answer first
      showCardBack();
    } else if (currentCard) {
      // Mark with quality grade
      handleQualityResponse(customEvent.detail.quality);
    }
  }

  function handleKeyboardEscape() {
    // Priority order: editing mode > study mode > deck selection
    if (isEditing) {
      cancelEdit();
    } else if (isInStudyMode) {
      exitStudyMode();
    } else if (selectedDeck) {
      selectedDeckStore.set(null);
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

  function handleQualityResponse(quality: 1 | 2 | 3 | 4) {
    if (!currentCard) return;
    
    // Show answer first if not already shown
    if (!showBack) {
      showCardBack();
      return;
    }
    
    // Process the quality response
    processQualityResponse(quality);
  }

  async function processQualityResponse(quality: 1 | 2 | 3 | 4) {
    if (!currentCard) return;

    try {
      // Calculate new SRS values using SM-2 algorithm
      const newSRSValues = SM2Adapter.calculateNewSRSValuesWithQuality(currentCard, quality);
      
      // Update the card with new SRS values
      const updatedCard = {
        ...currentCard,
        ...newSRSValues,
        updatedAt: new Date()
      };
      
      // Save the updated card
      await storageService.updateCard(updatedCard);
      
      // Update the current card in the study cards array
      if (studyCards.length > 0 && currentCardIndex < studyCards.length) {
        studyCards[currentCardIndex] = updatedCard;
      }
      
      // Reload cards to reflect changes in storage
      if (selectedDeck) {
        await loadCardsForDeck(selectedDeck);
        // Update SRS counts from the current cards
        srsCounts = getSRSCounts(selectedDeck);
        console.log('Updated SRS counts:', srsCounts);
      }
    } catch (error) {
      console.error('Failed to update card with SRS values:', error);
    }
    
    // Move to next card after updating study cards
    nextCard();
  }

  function showCardBack() {
    studySessionStore.update(session => ({
      ...session,
      showBack: true
    }));
  }

  async function handleResponse(response: 'correct' | 'incorrect') {
    if (!currentCard) return;

    try {
      // Calculate new SRS values using SM-2 algorithm
      const newSRSValues = SM2Adapter.calculateNewSRSValues(currentCard, response);
      
      // Update the card with new SRS values
      const updatedCard = {
        ...currentCard,
        ...newSRSValues,
        updatedAt: new Date()
      };
      
      // Save the updated card
      await storageService.updateCard(updatedCard);
      
      // Reload cards to reflect changes
      if (selectedDeck) {
        await loadCardsForDeck(selectedDeck);
      }
    } catch (error) {
      console.error('Failed to update card with SRS values:', error);
    }
    
    // Move to next card
    nextCard();
  }

  function nextCard() {
    // Get the current index from the store to ensure we have the latest value
    const currentIndex = get(studySessionStore).currentCardIndex;
    console.log('nextCard called - currentCardIndex:', currentIndex, 'studyCards.length:', studyCards.length);
    
    if (currentIndex < studyCards.length - 1) {
      const newIndex = currentIndex + 1;
      console.log('Moving to next card - newIndex:', newIndex, 'card:', studyCards[newIndex]);
      studySessionStore.update(session => ({
        ...session,
        currentCardIndex: newIndex,
        showBack: false
      }));
      // Update current card to the next study card
      if (studyCards[newIndex]) {
        currentCardStore.set(studyCards[newIndex]);
      }
    } else {
      // Finished all study cards
      console.log('Finished all study cards');
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


  function selectCardByIndex(index: number) {
    if (index >= 0 && index < cards.length) {
      selectedCardIndex = index;
      editCard(cards[index]);
    }
  }

  function editCard(card: Card) {
    editingCard = { ...card };
    isEditing = true;
  }

  function createNewCard() {
    if (!selectedDeck) return;
    
    const newCard: Omit<Card, 'id' | 'createdAt' | 'updatedAt'> = {
      front: '',
      back: '',
      deckId: selectedDeck,
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      dueDate: new Date()
    };

    editingCard = newCard as Card; // Temporary for editing
    isEditing = true;
  }

  async function saveCard() {
    if (!editingCard || !selectedDeck) return;

    try {
      if (editingCard.id) {
        // Update existing card
        await storageService.updateCard(editingCard);
      } else {
        // Create new card
        await storageService.addCard(editingCard);
      }
      
      // Reload cards for the current deck
      await loadCardsForDeck(selectedDeck);
      
      isEditing = false;
      editingCard = null;
    } catch (error) {
      console.error('Save failed:', error);
      alert(`Failed to save card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function cancelEdit() {
    isEditing = false;
    editingCard = null;
  }

  async function deleteCard(cardId: string, cardFront: string) {
    if (confirm(`Are you sure you want to delete this card?\n\nFront: "${cardFront}"`)) {
      try {
        await storageService.deleteCard(cardId);
        
        // Reload cards for the current deck
        if (selectedDeck) {
          await loadCardsForDeck(selectedDeck);
        }
      } catch (error) {
        console.error('Delete failed:', error);
        alert(`Failed to delete card: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
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
            const result = await importService.importFile(file, true); // Merge with existing
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
      
      // Check if File System Access API is available
      if (isFilesystemSupported()) {
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
        const result = await importService.importFile(file, true); // Merge with existing
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
        // Delete the deck (this will also delete all cards in the deck)
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
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deck Name
              </th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <!-- <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cards
              </th> -->
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                New / Learn / Due
              </th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
          {#each decks as deck, index}
            {@const srsCounts = deckSRSCounts[deck.id] ?? { new: 0, learning: 0, due: 0 }}
            <tr 
              class="hover:bg-gray-200 {selectedDeckIndex === index ? 'selected' : ''}"
              on:click={() => selectDeck(deck.id)}
              on:mouseenter={() => selectedDeckIndex = index}
            >
                <td class="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {deck.name}
                </td>
                <td class="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                  {deck.isLinkedToFile ? 'Filesystem' : 'Browser Storage'}
                </td>
                <!-- <td class="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                  {deck.cardCount}
                </td> -->
                <td class="px-5 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex space-x-2">
                    <span class="text-blue-600 font-semibold">{srsCounts.new}</span>
                    <span class="text-gray-400">/</span>
                    <span class="text-red-600 font-semibold">{srsCounts.learning}</span>
                    <span class="text-gray-400">/</span>
                    <span class="text-green-600 font-semibold">{srsCounts.due}</span>
                  </div>
                </td>
                <td class="px-5 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                    on:click={() => selectDeck(deck.id)}
                  >
                    Study
                  </button>
                  <button
                    class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    on:click|stopPropagation={() => editDeck(deck.id)}
                    title="Edit deck"
                  >
                    Edit
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
          <kbd class="ml-2 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">ESC</kbd>
        </button>
      </div>
      
      <!-- Progress indicator -->
      <div class="mb-6">
        <div class="flex justify-between text-sm text-gray-600 mb-2">
          <span>Card {currentCardIndex + 1} of {studyCards.length}</span>
          <span>{Math.round(((currentCardIndex + 1) / studyCards.length) * 100)}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style="width: {((currentCardIndex + 1) / studyCards.length) * 100}%"
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
            class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            on:click={showCardBack}
          >
            Show Answer
            <span class="text-xs bg-blue-500 px-1.5 py-0.5 rounded font-mono">SPC</span>
          </button>
        {:else}
          <button
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
            on:click={() => handleQualityResponse(1)}
          >
            Again
            <span class="text-xs bg-red-500 px-1.5 py-0.5 rounded font-mono">1</span>
          </button>
          <button
            class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2"
            on:click={() => handleQualityResponse(2)}
          >
            Hard
            <span class="text-xs bg-orange-500 px-1.5 py-0.5 rounded font-mono">2</span>
          </button>
          <button
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            on:click={() => handleQualityResponse(3)}
          >
            Good
            <span class="text-xs bg-green-500 px-1.5 py-0.5 rounded font-mono">3</span>
          </button>
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            on:click={() => handleQualityResponse(4)}
          >
            Easy
            <span class="text-xs bg-blue-500 px-1.5 py-0.5 rounded font-mono">4</span>
          </button>
        {/if}
      </div>
      
      <!-- SRS Counts Display -->
      <div class="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Study Progress</div>
        {#if currentCard}
          {@const currentStatus = SM2Adapter.getCardStatus(currentCard)}
          <div class="flex space-x-3 text-sm font-medium">
            <span class="text-blue-600 {currentStatus === 'new' ? 'underline' : ''}">
              New: {srsCounts.new}
            </span>
            <span class="text-red-600 {currentStatus === 'learning' ? 'underline' : ''}">
              Learn: {srsCounts.learning}
            </span>
            <span class="text-green-600 {currentStatus === 'due' ? 'underline' : ''}">
              Due: {srsCounts.due}
            </span>
          </div>
          <div class="text-xs text-gray-400 mt-1">Status: {currentStatus}</div>
        {:else}
          <div class="flex space-x-3 text-sm font-medium">
            <span class="text-blue-600">New: {srsCounts.new}</span>
            <span class="text-red-600">Learn: {srsCounts.learning}</span>
            <span class="text-green-600">Due: {srsCounts.due}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
{:else if isEditing}
  <!-- Card Editing View -->
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow-lg p-8">
      <h3 class="text-lg font-semibold text-gray-900 mb-6">Edit Card</h3>
      
      <div class="space-y-6">
        <div>
          <label for="card-front" class="block text-sm font-medium text-gray-700 mb-2">Front</label>
          <textarea
            id="card-front"
            value={editingCard?.front || ''}
            on:input={(e) => editingCard && (editingCard.front = (e.target as HTMLTextAreaElement).value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
            placeholder="Enter the front of the card..."
          ></textarea>
        </div>
        
        <div>
          <label for="card-back" class="block text-sm font-medium text-gray-700 mb-2">Back</label>
          <textarea
            id="card-back"
            value={editingCard?.back || ''}
            on:input={(e) => editingCard && (editingCard.back = (e.target as HTMLTextAreaElement).value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
            placeholder="Enter the back of the card..."
          ></textarea>
        </div>
      </div>

      <div class="flex justify-end space-x-4 mt-8">
        <button
          class="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          on:click={cancelEdit}
        >
          Cancel
          <kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">ESC</kbd>
        </button>
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          on:click={saveCard}
        >
          Save Card
        </button>
      </div>
    </div>
  </div>
{:else if selectedDeck}
  <!-- Cards List View -->
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900">{currentDeck?.name || 'Deck'}</h2>
      <div class="flex space-x-2">
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          on:click={createNewCard}
        >
          Add New Card
        </button>
        <button
          class="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
          on:click={() => selectedDeckStore.set(null)}
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Decks
          <kbd class="ml-2 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">ESC</kbd>
        </button>
      </div>
    </div>

    {#if cards.length === 0}
      <div class="text-center py-12">
        <div class="text-gray-500 mb-4">No cards in this deck</div>
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          on:click={createNewCard}
        >
          Create First Card
        </button>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <TableNavigation items={cards} selectedIndex={selectedCardIndex} onSelect={selectCardByIndex}>
          <table class="min-w-full table-fixed">
            <thead class="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-2/5">
                  Front
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-2/5">
                  Back
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/5">
                  Actions
                </th>
              </tr>
            </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200">
          {#each cards as card, index}
            <tr 
              class="hover:bg-gray-200 dark:hover:bg-gray-700 {selectedCardIndex === index ? 'selected' : ''}"
              on:click={() => editCard(card)}
              on:mouseenter={() => selectedCardIndex = index}
            >
              <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white overflow-hidden">
                <div class="truncate" title={card.front}>
                  {card.front}
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 overflow-hidden">
                <div class="truncate" title={card.back}>
                  {card.back}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    on:click|stopPropagation={() => editCard(card)}
                  >
                    Edit
                  </button>
                  <button
                    class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    on:click|stopPropagation={() => deleteCard(card.id, card.front)}
                    title="Delete card"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
          </table>
        </TableNavigation>
      </div>
    {/if}
  </div>
{:else}
  <!-- No cards available -->
  <div class="text-center py-12">
    <div class="text-gray-500 mb-4">No cards available in this deck</div>
    <button
      class="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
      on:click={() => selectedDeckStore.set(null)}
    >
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Decks
      <kbd class="ml-2 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">ESC</kbd>
    </button>
  </div>
{/if}

