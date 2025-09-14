import { writable } from 'svelte/store';
import type { AppState } from '../types';

const initialState: AppState = {
  currentView: 'learn',
  viewHistory: []
};

export const appStore = writable<AppState>(initialState);
