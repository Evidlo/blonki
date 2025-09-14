import { writable } from 'svelte/store';
import type { Card } from '../types';

export const cardStore = writable<Card[]>([]);
export const currentCardStore = writable<Card | null>(null);
