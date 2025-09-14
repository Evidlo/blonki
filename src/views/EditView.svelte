<script lang="ts">
  import { onMount } from 'svelte';
  import { deckStore, selectedDeckStore } from '../stores/deckStore';
  import { cardStore, currentCardStore } from '../stores/cardStore';
  import { storageService } from '../services/storageService';
  import { exportService } from '../services/exportService';
  import TableNavigation from '../components/TableNavigation.svelte';
  import type { Deck, Card } from '../types';

  let decks: Deck[] = [];
  let selectedDeck: string | null = null;
  let cards: Card[] = [];
  let currentCard: Card | null = null;
  let editingCard: Card | null = null;
  let isEditing = false;
  let selectedDeckIndex = 0;
  let selectedCardIndex = 0;

  // Subscribe to stores
  deckStore.subscribe(value => decks = value);
  selectedDeckStore.subscribe(value => selectedDeck = value);
  cardStore.subscribe(value => cards = value);
  currentCardStore.subscribe(value => currentCard = value);

  onMount(() => {
    // Data is loaded by storage service initialization in App.svelte
    // Just subscribe to store changes
  });

  function selectDeck(deckId: string) {
    selectedDeckStore.set(deckId);
    loadCardsForDeck(deckId);
  }

  function selectDeckByIndex(index: number) {
    if (index >= 0 && index < decks.length) {
      selectedDeckIndex = index;
      selectDeck(decks[index].id);
    }
  }

  function selectCardByIndex(index: number) {
    if (index >= 0 && index < cards.length) {
      selectedCardIndex = index;
      editCard(cards[index]);
    }
  }

  async function loadCardsForDeck(deckId: string) {
    try {
      const deckCards = await storageService.getCardsForDeck(deckId);
      cardStore.set(deckCards);
    } catch (error) {
      console.error('Failed to load cards for deck:', error);
    }
  }

  function editCard(card: Card) {
    editingCard = { ...card };
    isEditing = true;
  }

  async function saveCard() {
    if (!editingCard) return;
    
    try {
      if (editingCard.id && cards.some(card => card.id === editingCard!.id)) {
        // Update existing card
        await storageService.updateCard(editingCard);
      } else {
        // Create new card
        await storageService.addCard(editingCard);
      }
      
      isEditing = false;
      editingCard = null;
    } catch (error) {
      console.error('Failed to save card:', error);
    }
  }

  function cancelEdit() {
    isEditing = false;
    editingCard = null;
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

  async function deleteCard(cardId: string, cardFront: string) {
    if (confirm(`Are you sure you want to delete this card?\n\nFront: "${cardFront}"`)) {
      try {
        await storageService.deleteCard(cardId);
        
        // Reset editing state if the deleted card was being edited
        if (editingCard && editingCard.id === cardId) {
          editingCard = null;
          isEditing = false;
          currentCardStore.set(null);
        }
        
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
</script>

{#if !selectedDeck}
  <!-- Deck Selection View -->
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Select a Deck to Edit</h2>
      <button
        class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        on:click={exportAllDecks}
      >
        Export All
      </button>
    </div>

    {#if decks.length === 0}
      <div class="text-center py-12">
        <div class="text-gray-500 mb-4">No decks available</div>
        <p class="text-sm text-gray-400">Create a new deck to get started</p>
      </div>
    {:else}
      <TableNavigation items={decks} selectedIndex={selectedDeckIndex} onSelect={selectDeckByIndex}>
        <thead class="bg-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deck Name
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
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
                {deck.description || 'No description'}
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
                    Edit
                  </button>
                  <button
                    class="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                    on:click={() => exportDeck(deck.id)}
                  >
                    Export
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </TableNavigation>
    {/if}
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
          class="px-4 py-2 text-gray-600 hover:text-gray-900"
          on:click={cancelEdit}
        >
          Cancel
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
{:else}
  <!-- Cards List View -->
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900">Cards in Deck</h2>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        on:click={createNewCard}
      >
        Add New Card
      </button>
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
      <TableNavigation items={cards} selectedIndex={selectedCardIndex} onSelect={selectCardByIndex}>
        <thead class="bg-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Front
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Back
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each cards as card, index}
            <tr 
              class="hover:bg-gray-200 {selectedCardIndex === index ? 'selected' : ''}"
              on:click={() => editCard(card)}
              on:mouseenter={() => selectedCardIndex = index}
            >
              <td class="px-6 py-4 text-sm text-gray-900">
                {card.front}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">
                {card.back}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    on:click={() => editCard(card)}
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
      </TableNavigation>
    {/if}
  </div>
{/if}
