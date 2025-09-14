import { writable } from 'svelte/store';
import type { Deck } from '../types';

export const deckStore = writable<Deck[]>([]);
export const selectedDeckStore = writable<string | null>(null);
