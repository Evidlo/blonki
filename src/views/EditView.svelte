<script lang="ts">
  import { onMount } from 'svelte';
  import { deckStore, selectedDeckStore } from '../stores/deckStore';
  import { cardStore, currentCardStore } from '../stores/cardStore';
  import type { Deck, Card } from '../types';

  let decks: Deck[] = [];
  let selectedDeck: string | null = null;
  let cards: Card[] = [];
  let currentCard: Card | null = null;
  let editingCard: Card | null = null;
  let isEditing = false;

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
  }

  function editCard(card: Card) {
    editingCard = { ...card };
    isEditing = true;
  }

  function saveCard() {
    if (!editingCard) return;
    
    // TODO: Save to storage
    const updatedCards = cards.map(card => 
      card.id === editingCard!.id ? editingCard! : card
    );
    cardStore.set(updatedCards);
    
    isEditing = false;
    editingCard = null;
  }

  function cancelEdit() {
    isEditing = false;
    editingCard = null;
  }

  function createNewCard() {
    if (!selectedDeck) return;
    
    const newCard: Card = {
      id: Date.now().toString(),
      front: '',
      back: '',
      deckId: selectedDeck,
      createdAt: new Date(),
      updatedAt: new Date(),
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      dueDate: new Date()
    };
    
    editingCard = newCard;
    isEditing = true;
  }
</script>

{#if !selectedDeck}
  <!-- Deck Selection View -->
  <div class="space-y-6">
    <h2 class="text-xl font-semibold text-gray-900">Select a Deck to Edit</h2>

    {#if decks.length === 0}
      <div class="text-center py-12">
        <div class="text-gray-500 mb-4">No decks available</div>
        <p class="text-sm text-gray-400">Create a new deck to get started</p>
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
                    Edit
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
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
      <div class="bg-white rounded-lg shadow overflow-hidden table-container">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
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
            {#each cards as card}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-900">
                  {card.front}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                  {card.back}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    class="text-blue-600 hover:text-blue-900"
                    on:click={() => editCard(card)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
{/if}
