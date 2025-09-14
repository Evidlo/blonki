import type { StorageAdapter, Deck, Card, Settings, ReviewResult } from '../types';

// Local Storage implementation
class LocalStorageAdapter implements StorageAdapter {
  private prefix = 'blonki_';

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async saveDecks(decks: Deck[]): Promise<void> {
    localStorage.setItem(this.getKey('decks'), JSON.stringify(decks));
  }

  async loadDecks(): Promise<Deck[]> {
    const data = localStorage.getItem(this.getKey('decks'));
    if (!data) return [];
    
    const decks = JSON.parse(data);
    // Convert date strings back to Date objects
    return decks.map((deck: any) => ({
      ...deck,
      createdAt: new Date(deck.createdAt),
      updatedAt: new Date(deck.updatedAt)
    }));
  }

  async saveCards(cards: Card[]): Promise<void> {
    localStorage.setItem(this.getKey('cards'), JSON.stringify(cards));
  }

  async loadCards(): Promise<Card[]> {
    const data = localStorage.getItem(this.getKey('cards'));
    if (!data) return [];
    
    const cards = JSON.parse(data);
    // Convert date strings back to Date objects
    return cards.map((card: any) => ({
      ...card,
      createdAt: new Date(card.createdAt),
      updatedAt: new Date(card.updatedAt),
      dueDate: new Date(card.dueDate),
      lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : undefined
    }));
  }

  async saveSettings(settings: Settings): Promise<void> {
    localStorage.setItem(this.getKey('settings'), JSON.stringify(settings));
  }

  async loadSettings(): Promise<Settings> {
    const data = localStorage.getItem(this.getKey('settings'));
    if (!data) return this.getDefaultSettings();
    return JSON.parse(data);
  }

  async saveReviewResults(results: ReviewResult[]): Promise<void> {
    localStorage.setItem(this.getKey('reviewResults'), JSON.stringify(results));
  }

  async loadReviewResults(): Promise<ReviewResult[]> {
    const data = localStorage.getItem(this.getKey('reviewResults'));
    if (!data) return [];
    
    const results = JSON.parse(data);
    // Convert date strings back to Date objects
    return results.map((result: any) => ({
      ...result,
      timestamp: new Date(result.timestamp)
    }));
  }

  private getDefaultSettings(): Settings {
    return {
      storageType: 'localStorage',
      srsAlgorithm: 'sm2',
      sm2InitialInterval: 1,
      sm2EasyInterval: 4,
      sm2MinInterval: 1,
      sm2MaxInterval: 36500,
      theme: 'auto',
      cardsPerSession: 20
    };
  }
}

// Filesystem API implementation (when supported)
class FilesystemStorageAdapter implements StorageAdapter {
  private fileHandle: FileSystemFileHandle | null = null;

  async saveDecks(decks: Deck[]): Promise<void> {
    // TODO: Implement filesystem storage
    throw new Error('Filesystem storage not yet implemented');
  }

  async loadDecks(): Promise<Deck[]> {
    // TODO: Implement filesystem storage
    throw new Error('Filesystem storage not yet implemented');
  }

  async saveCards(cards: Card[]): Promise<void> {
    // TODO: Implement filesystem storage
    throw new Error('Filesystem storage not yet implemented');
  }

  async loadCards(): Promise<Card[]> {
    // TODO: Implement filesystem storage
    throw new Error('Filesystem storage not yet implemented');
  }

  async saveSettings(settings: Settings): Promise<void> {
    // TODO: Implement filesystem storage
    throw new Error('Filesystem storage not yet implemented');
  }

  async loadSettings(): Promise<Settings> {
    // TODO: Implement filesystem storage
    throw new Error('Filesystem storage not yet implemented');
  }

  async saveReviewResults(results: ReviewResult[]): Promise<void> {
    // TODO: Implement filesystem storage
    throw new Error('Filesystem storage not yet implemented');
  }

  async loadReviewResults(): Promise<ReviewResult[]> {
    // TODO: Implement filesystem storage
    throw new Error('Filesystem storage not yet implemented');
  }
}

// Storage factory
export function createStorageAdapter(type: 'localStorage' | 'filesystem'): StorageAdapter {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter();
    case 'filesystem':
      return new FilesystemStorageAdapter();
    default:
      throw new Error(`Unknown storage type: ${type}`);
  }
}

// Check if Filesystem API is supported
export function isFilesystemSupported(): boolean {
  return 'showOpenFilePicker' in window;
}
