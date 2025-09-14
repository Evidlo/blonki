<script lang="ts">
  import { onMount } from 'svelte';
  import { deckStore, selectedDeckStore } from '../stores/deckStore';
  import { cardStore, currentCardStore } from '../stores/cardStore';
  import { appStore } from '../stores/appStore';
  import type { Deck, Card } from '../types';

  let decks: Deck[] = [];
  let selectedDeck: string | null = null;
  let cards: Card[] = [];
  let currentCard: Card | null = null;
  let showBack = false;
  let currentCardIndex = 0;

  // Subscribe to stores
  deckStore.subscribe(value => decks = value);
  selectedDeckStore.subscribe(value => selectedDeck = value);
  cardStore.subscribe(value => cards = value);
  currentCardStore.subscribe(value => currentCard = value);

  onMount(() => {
    loadDecks();
  });

  async function loadDecks() {
    // TODO: Load from storage
    // For now, create some sample data
    const sampleDecks: Deck[] = [
      {
        id: '1',
        name: 'Spanish Vocabulary',
        description: 'Basic Spanish words and phrases',
        createdAt: new Date(),
        updatedAt: new Date(),
        cardCount: 0
      },
      {
        id: '2',
        name: 'JavaScript Concepts',
        description: 'Programming concepts and syntax',
        createdAt: new Date(),
        updatedAt: new Date(),
        cardCount: 0
      }
    ];
    deckStore.set(sampleDecks);
  }

  function selectDeck(deckId: string) {
    selectedDeckStore.set(deckId);
    loadCardsForDeck(deckId);
  }

  async function loadCardsForDeck(deckId: string) {
    // TODO: Load cards from storage
    // For now, create some sample cards
    const sampleCards: Card[] = [
      {
        id: '1',
        front: 'Hello',
        back: 'Hola',
        deckId,
        createdAt: new Date(),
        updatedAt: new Date(),
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: new Date()
      },
      {
        id: '2',
        front: 'Goodbye',
        back: 'Adiós',
        deckId,
        createdAt: new Date(),
        updatedAt: new Date(),
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: new Date()
      }
    ];
    cardStore.set(sampleCards);
    if (sampleCards.length > 0) {
      currentCardStore.set(sampleCards[0]);
      currentCardIndex = 0;
    }
  }

  function showCardBack() {
    showBack = true;
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
      currentCardIndex++;
      currentCardStore.set(cards[currentCardIndex]);
      showBack = false;
    } else {
      // Finished all cards
      selectedDeckStore.set(null);
      currentCardStore.set(null);
      showBack = false;
    }
  }

  function importFromURL() {
    // TODO: Implement URL import
    alert('Import from URL - Coming soon!');
  }

  function openFromFile() {
    // TODO: Implement file import
    alert('Open from File - Coming soon!');
  }
</script>

{#if !selectedDeck}
  <!-- Deck Selection View -->
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-900">Select a Deck to Study</h2>
      <div class="flex space-x-2">
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          on:click={importFromURL}
        >
          Import from URL
        </button>
        <button
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          on:click={openFromFile}
        >
          Open from File
        </button>
      </div>
    </div>

    {#if decks.length === 0}
      <div class="text-center py-12">
        <div class="text-gray-500 mb-4">No decks available</div>
        <p class="text-sm text-gray-400">Import a deck or create one in the Edit tab</p>
      </div>
    {:else}
      <div class="bg-white rounded-lg shadow overflow-hidden table-container">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
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
            {#each decks as deck}
              <tr class="hover:bg-gray-50">
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
                  <button
                    class="text-blue-600 hover:text-blue-900"
                    on:click={() => selectDeck(deck.id)}
                  >
                    Study
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
{:else if currentCard}
  <!-- Card Review View -->
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow-lg p-8">
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
