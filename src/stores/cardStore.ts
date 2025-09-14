import { writable } from 'svelte/store';
import type { Card } from '../types';

export const cardStore = writable<Card[]>([]);
export const currentCardStore = writable<Card | null>(null);
export const studySessionStore = writable<{
  isActive: boolean;
  currentCardIndex: number;
  showBack: boolean;
  deckId: string | null;
}>({
  isActive: false,
  currentCardIndex: 0,
  showBack: false,
  deckId: null
});
