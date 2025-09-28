import { writable } from 'svelte/store';
import type { Settings } from '../types';

const defaultSettings: Settings = {
  srsAlgorithm: 'sm2',
  sm2InitialInterval: 1,
  sm2EasyInterval: 4,
  sm2MinInterval: 1,
  sm2MaxInterval: 36500,
  theme: 'auto',
  cardsPerSession: 20,
  dueCardsLimit: 50,
  openaiEndpoint: 'https://api.openai.com',
  openaiApiKey: '',
  openaiModel: '',
  openaiModels: []
};

export const settingsStore = writable<Settings>(defaultSettings);
