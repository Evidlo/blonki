<script lang="ts">
  import { onMount } from 'svelte';
  import type { Card } from '../types';

  let cards: Card[] = [];
  let reviewData: any[] = [];

  onMount(() => {
    loadStatsData();
  });

  async function loadStatsData() {
    // TODO: Load actual review data from storage
    // For now, create sample data
    const sampleCards: Card[] = [
      {
        id: '1',
        front: 'Hello',
        back: 'Hola',
        deckId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        interval: 1,
        repetitions: 5,
        easeFactor: 2.5,
        dueDate: new Date(),
        lastReviewed: new Date()
      },
      {
        id: '2',
        front: 'Goodbye',
        back: 'Adiós',
        deckId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        interval: 3,
        repetitions: 3,
        easeFactor: 2.3,
        dueDate: new Date(),
        lastReviewed: new Date()
      }
    ];
    
    cards = sampleCards;
    
    // Generate sample review data for the last 30 days
    reviewData = generateSampleReviewData();
  }

  function generateSampleReviewData() {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        reviews: Math.floor(Math.random() * 20) + 5,
        correct: Math.floor(Math.random() * 15) + 3,
        incorrect: Math.floor(Math.random() * 5) + 1
      });
    }
    
    return data;
  }

  function getTotalReviews() {
    return reviewData.reduce((sum, day) => sum + day.reviews, 0);
  }

  function getTotalCorrect() {
    return reviewData.reduce((sum, day) => sum + day.correct, 0);
  }

  function getAccuracy() {
    const total = getTotalReviews();
    const correct = getTotalCorrect();
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }

  function getCardsDue() {
    const today = new Date();
    return cards.filter(card => new Date(card.dueDate) <= today).length;
  }
</script>

<div class="space-y-6">
  <h2 class="text-xl font-semibold text-gray-900">Statistics</h2>

  <!-- Summary Cards -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
    <div class="bg-white rounded-lg shadow p-6">
      <div class="text-2xl font-bold text-blue-600">{getTotalReviews()}</div>
      <div class="text-sm text-gray-500">Total Reviews</div>
    </div>
    
    <div class="bg-white rounded-lg shadow p-6">
      <div class="text-2xl font-bold text-green-600">{getTotalCorrect()}</div>
      <div class="text-sm text-gray-500">Correct Answers</div>
    </div>
    
    <div class="bg-white rounded-lg shadow p-6">
      <div class="text-2xl font-bold text-purple-600">{getAccuracy()}%</div>
      <div class="text-sm text-gray-500">Accuracy</div>
    </div>
    
    <div class="bg-white rounded-lg shadow p-6">
      <div class="text-2xl font-bold text-orange-600">{getCardsDue()}</div>
      <div class="text-sm text-gray-500">Cards Due</div>
    </div>
  </div>

  <!-- Review History Chart -->
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Review History (Last 30 Days)</h3>
    
    {#if reviewData.length > 0}
      <div class="space-y-4">
        {#each reviewData as day}
          <div class="flex items-center space-x-4">
            <div class="w-20 text-sm text-gray-600">
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div class="flex-1 bg-gray-200 rounded-full h-4 relative">
              <div 
                class="bg-blue-500 h-4 rounded-full"
                style="width: {(day.reviews / 25) * 100}%"
              ></div>
              <div class="absolute inset-0 flex items-center justify-center text-xs text-gray-700 font-medium">
                {day.reviews}
              </div>
            </div>
            <div class="w-16 text-sm text-gray-600 text-right">
              {day.correct}/{day.reviews}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-8 text-gray-500">
        No review data available
      </div>
    {/if}
  </div>

  <!-- Card Performance Grid -->
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Card Performance</h3>
    
    {#if cards.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each cards as card}
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="text-sm font-medium text-gray-900 mb-2">
              {card.front}
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-xs text-gray-600">
                <span>Repetitions:</span>
                <span>{card.repetitions}</span>
              </div>
              <div class="flex justify-between text-xs text-gray-600">
                <span>Interval:</span>
                <span>{card.interval} days</span>
              </div>
              <div class="flex justify-between text-xs text-gray-600">
                <span>Ease Factor:</span>
                <span>{card.easeFactor.toFixed(2)}</span>
              </div>
              <div class="flex justify-between text-xs text-gray-600">
                <span>Due:</span>
                <span>{new Date(card.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-8 text-gray-500">
        No cards available
      </div>
    {/if}
  </div>
</div>
