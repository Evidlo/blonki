<script lang="ts">
  import { onMount } from 'svelte';
  import { settingsStore } from '../stores/settingsStore';
  import { deckStore } from '../stores/deckStore';
  import { cardStore } from '../stores/cardStore';
  import { appStore } from '../stores/appStore';
  import { OpenAIService } from '../services/openaiService';
  import { storageService } from '../services/storageService';
  import type { Settings, Deck, Card } from '../types';

  // YouTube Deck Generator state
  let promptCollapsed = true;
  let transcript = '';
  let cardsToGenerate = 10;
  let isGenerating = false;
  let errorMessage = '';
  let successMessage = '';

  // Initialize the user prompt template with placeholders
  let userPrompt = `Generate a deck of {cardsToGenerate} flash cards of important facts based on the below YouTube transcript. Your response should be JSON in the following format: {"generated_deck_title": "...", "cards":[{"question":"...", "answer":"..."}, ...]}
Provide a short title of at most 4 words (with underscores for spaces) in the JSON response which summarizes the transcript content. You should fill in the ellipses in the provided JSON example. Do not provide extra formatting like newlines in your questions/answers or wrap the response in a code fence.

{transcript}`;

  // Settings
  let settings: Settings;

  // Subscribe to settings store
  settingsStore.subscribe(value => {
    settings = value;
  });

  function togglePrompt() {
    promptCollapsed = !promptCollapsed;
  }

  interface GeneratedCard {
    question: string;
    answer: string;
  }

  interface GeneratedDeckResponse {
    generated_deck_title: string;
    cards: GeneratedCard[];
  }

  async function generateDeck() {
    if (!transcript.trim()) {
      errorMessage = 'Please enter a transcript to generate cards from.';
      return;
    }

    if (!settings.openaiEndpoint || !settings.openaiApiKey || !settings.openaiModel) {
      errorMessage = 'Please configure OpenAI settings in the Settings page first.';
      return;
    }

    isGenerating = true;
    errorMessage = '';
    successMessage = '';

    // Debug: Log the LLM configuration being used
    console.log(`🚀 Starting deck generation with LLM endpoint: ${settings.openaiEndpoint}`);
    console.log(`🤖 Using model: ${settings.openaiModel}`);
    console.log(`📝 Generating ${cardsToGenerate} cards from transcript (${transcript.length} characters)`);

    try {
      const openaiService = new OpenAIService(settings.openaiEndpoint, settings.openaiApiKey);
      
      // Fixed system prompt for JSON output
      const systemPrompt = "You are an assistant that only returns valid JSON objects. Your entire response must be a single, valid JSON object, with no other text, commentary, or markdown fences (```json).";

      // Evaluate the template with current values
      const evaluatedPrompt = userPrompt
        .replace('{cardsToGenerate}', cardsToGenerate.toString())
        .replace('{transcript}', transcript);

      // Make the API call
      const response = await openaiService.createChatCompletion({
        model: settings.openaiModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: evaluatedPrompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
        response_format: {
          type: 'json_object'
        }
      });

      // Debug: Log the raw JSON response from the LLM
      console.log('🔍 Raw JSON response from LLM:', response);

      // Parse the JSON response
      let generatedData: GeneratedDeckResponse;
      try {
        generatedData = JSON.parse(response);
      } catch (parseError) {
        console.error('❌ JSON parsing failed:', parseError);
        throw new Error('The AI returned invalid JSON. Please try again.');
      }

      // Validate the response structure
      if (!generatedData.generated_deck_title || !Array.isArray(generatedData.cards)) {
        console.error('❌ Invalid response structure:', generatedData);
        throw new Error('The AI response is missing required fields. Please try again.');
      }

      if (generatedData.cards.length === 0) {
        console.error('❌ No cards generated:', generatedData);
        throw new Error('No cards were generated. Please try with a different transcript or prompt.');
      }

      // Debug: Log parsing results
      console.log(`✅ Successfully parsed ${generatedData.cards.length} cards from JSON`);
      console.log(`📚 Deck title: "${generatedData.generated_deck_title}"`);
      console.log('📋 Generated cards:', generatedData.cards);

      // Create the deck
      const deckId = crypto.randomUUID();
      const deck: Deck = {
        id: deckId,
        name: generatedData.generated_deck_title.replace(/_/g, ' '),
        description: `Generated from YouTube transcript (${generatedData.cards.length} cards)`,
        createdAt: new Date(),
        updatedAt: new Date(),
        cardCount: generatedData.cards.length,
        isLinkedToFile: false
      };

      // Debug: Log the created deck
      console.log(`🎯 Created deck: "${deck.name}" (ID: ${deckId}) with ${generatedData.cards.length} cards`);

      // Create the cards
      const cards: Card[] = generatedData.cards.map((cardData, index) => ({
        id: crypto.randomUUID(),
        front: cardData.question,
        back: cardData.answer,
        deckId: deckId,
        createdAt: new Date(),
        updatedAt: new Date(),
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: new Date()
      }));

      // Save to storage using the proper methods
      await storageService.addDeck(deck);
      await storageService.saveCards(cards);

      successMessage = `Successfully generated "${deck.name}" with ${cards.length} cards!`;
      
      // Clear the form
      transcript = '';

    } catch (error) {
      console.error('Deck generation failed:', error);
      errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
    } finally {
      isGenerating = false;
    }
  }
</script>

<div class="max-w-4xl mx-auto p-6">
  <div class="space-y-8">
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">Extras</h1>
      <p class="text-xl text-gray-600 dark:text-gray-300">Additional features and tools</p>
    </div>

    <!-- YouTube Deck Generator -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">YouTube Deck Generator</h2>
      <p class="text-gray-700 dark:text-gray-300 mb-6">
        Generate Anki decks from YouTube video transcripts using AI. Be sure to configure an OpenAI-compatible endpoint in the Settings page first.
      </p>

      <!-- Prompt Section -->
      <div class="mb-6">
        <button
          type="button"
          class="flex items-center justify-between w-full text-left text-lg font-medium text-gray-900 dark:text-white mb-3 hover:text-gray-700 dark:hover:text-gray-300"
          on:click={togglePrompt}
        >
          <span>Prompt</span>
          <svg
            class="w-5 h-5 transform transition-transform {promptCollapsed ? 'rotate-0' : 'rotate-180'}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        {#if !promptCollapsed}
          <textarea
            bind:value={userPrompt}
            placeholder="Enter the prompt for the AI to generate flashcards..."
            class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows="6"
          ></textarea>
        {/if}
      </div>

      <!-- Transcript Section -->
      <div class="mb-6">
        <label for="transcript" class="block text-lg font-medium text-gray-900 dark:text-white mb-3">
          Transcript
        </label>
        <textarea
          id="transcript"
          bind:value={transcript}
          placeholder="Paste the YouTube video transcript here..."
          class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows="8"
        ></textarea>
      </div>

      <!-- Generation Controls -->
      <div class="flex items-center gap-4 mb-6">
        <div class="flex items-center gap-2">
          <label for="cards-count" class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Cards to Generate:
          </label>
          <input
            id="cards-count"
            type="number"
            bind:value={cardsToGenerate}
            min="1"
            max="100"
            disabled={isGenerating}
            class="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <button
          type="button"
          on:click={generateDeck}
          disabled={!transcript.trim() || isGenerating}
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center gap-2"
        >
          {#if isGenerating}
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          {:else}
            Generate
          {/if}
        </button>
      </div>

      <!-- Error Message -->
      {#if errorMessage}
        <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-red-700 dark:text-red-300 font-medium">Error</span>
          </div>
          <p class="text-red-600 dark:text-red-400 mt-1">{errorMessage}</p>
        </div>
      {/if}

      <!-- Success Message -->
      {#if successMessage}
        <div class="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="text-green-700 dark:text-green-300 font-medium">Success</span>
          </div>
          <p class="text-green-600 dark:text-green-400 mt-1">{successMessage}</p>
        </div>
      {/if}
    </div>
  </div>
</div>
