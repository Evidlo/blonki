// Core data types
export interface Card {
  id: string;
  front: string;
  back: string;
  deckId: string;
  createdAt: Date;
  updatedAt: Date;
  // Spaced repetition data
  interval: number; // days
  repetitions: number;
  easeFactor: number;
  dueDate: Date;
  lastReviewed?: Date;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  cardCount: number;
}

export interface ReviewResult {
  cardId: string;
  response: 'correct' | 'incorrect';
  responseTime: number; // milliseconds
  timestamp: Date;
}

// App state types
export interface AppState {
  currentView: 'learn' | 'edit' | 'stats' | 'settings' | 'extras';
  currentDeck?: string;
  currentCard?: string;
  viewHistory: string[];
}

// Settings types
export interface Settings {
  storageType: 'localStorage' | 'filesystem';
  srsAlgorithm: 'sm2' | 'sm17' | 'custom';
  // SM2 parameters
  sm2InitialInterval: number;
  sm2EasyInterval: number;
  sm2MinInterval: number;
  sm2MaxInterval: number;
  // UI settings
  theme: 'light' | 'dark' | 'auto';
  cardsPerSession: number;
}

// Storage types
export interface StorageAdapter {
  saveDecks(decks: Deck[]): Promise<void>;
  loadDecks(): Promise<Deck[]>;
  saveCards(cards: Card[]): Promise<void>;
  loadCards(): Promise<Card[]>;
  saveSettings(settings: Settings): Promise<void>;
  loadSettings(): Promise<Settings>;
  saveReviewResults(results: ReviewResult[]): Promise<void>;
  loadReviewResults(): Promise<ReviewResult[]>;
}

// SRS Algorithm types
export interface SRSAlgorithm {
  name: string;
  calculateNextReview(
    card: Card,
    response: 'correct' | 'incorrect',
    responseTime: number
  ): Partial<Card>;
}

// Import/Export types
export interface ImportOptions {
  source: 'file' | 'url';
  data: File | string;
  mergeWithExisting: boolean;
}

export interface ExportOptions {
  deckIds: string[];
  format: 'apkg' | 'json';
}
