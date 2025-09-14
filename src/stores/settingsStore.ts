import { writable } from 'svelte/store';
import type { Settings } from '../types';

const defaultSettings: Settings = {
  storageType: 'localStorage',
  srsAlgorithm: 'sm2',
  sm2InitialInterval: 1,
  sm2EasyInterval: 4,
  sm2MinInterval: 1,
  sm2MaxInterval: 36500,
  theme: 'auto',
  cardsPerSession: 20
};

export const settingsStore = writable<Settings>(defaultSettings);
