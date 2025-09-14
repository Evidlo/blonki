import type { StorageAdapter, Deck, Card, Settings, ReviewResult } from '../types';

// Type declarations for Filesystem API
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (options?: {
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
      multiple?: boolean;
    }) => Promise<FileSystemFileHandle[]>;
  }
}

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

  getDefaultSettings(): Settings {
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
export class FilesystemStorageAdapter implements StorageAdapter {
  private fileHandle: FileSystemFileHandle | null = null;
  private dataCache: {
    decks: Deck[];
    cards: Card[];
    settings: Settings;
    reviewResults: ReviewResult[];
  } | null = null;

  constructor() {
    this.loadFromCache();
  }

  private async loadFromCache() {
    try {
      const data = await this.loadDataFile();
      this.dataCache = data;
    } catch (error) {
      console.warn('Failed to load data from filesystem, using empty cache:', error);
      this.dataCache = {
        decks: [],
        cards: [],
        settings: this.getDefaultSettings(),
        reviewResults: []
      };
    }
  }

  private async loadDataFile(): Promise<{
    decks: Deck[];
    cards: Card[];
    settings: Settings;
    reviewResults: ReviewResult[];
  }> {
    if (!this.fileHandle) {
      throw new Error('No file handle available');
    }

    const file = await this.fileHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);

    // Convert date strings back to Date objects
    return {
      decks: data.decks?.map((deck: any) => ({
        ...deck,
        createdAt: new Date(deck.createdAt),
        updatedAt: new Date(deck.updatedAt)
      })) || [],
      cards: data.cards?.map((card: any) => ({
        ...card,
        createdAt: new Date(card.createdAt),
        updatedAt: new Date(card.updatedAt),
        dueDate: new Date(card.dueDate),
        lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : undefined
      })) || [],
      settings: data.settings || this.getDefaultSettings(),
      reviewResults: data.reviewResults?.map((result: any) => ({
        ...result,
        timestamp: new Date(result.timestamp)
      })) || []
    };
  }

  private async saveDataFile(data: {
    decks: Deck[];
    cards: Card[];
    settings: Settings;
    reviewResults: ReviewResult[];
  }): Promise<void> {
    if (!this.fileHandle) {
      throw new Error('No file handle available');
    }

    const writable = await this.fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    
    this.dataCache = data;
  }

  async saveDecks(decks: Deck[]): Promise<void> {
    if (!this.dataCache) {
      await this.loadFromCache();
    }
    
    if (this.dataCache) {
      this.dataCache.decks = decks;
      await this.saveDataFile(this.dataCache);
    }
  }

  async loadDecks(): Promise<Deck[]> {
    if (!this.dataCache) {
      await this.loadFromCache();
    }
    
    return this.dataCache?.decks || [];
  }

  async saveCards(cards: Card[]): Promise<void> {
    if (!this.dataCache) {
      await this.loadFromCache();
    }
    
    if (this.dataCache) {
      this.dataCache.cards = cards;
      await this.saveDataFile(this.dataCache);
    }
  }

  async loadCards(): Promise<Card[]> {
    if (!this.dataCache) {
      await this.loadFromCache();
    }
    
    return this.dataCache?.cards || [];
  }

  async saveSettings(settings: Settings): Promise<void> {
    if (!this.dataCache) {
      await this.loadFromCache();
    }
    
    if (this.dataCache) {
      this.dataCache.settings = settings;
      await this.saveDataFile(this.dataCache);
    }
  }

  async loadSettings(): Promise<Settings> {
    if (!this.dataCache) {
      await this.loadFromCache();
    }
    
    return this.dataCache?.settings || this.getDefaultSettings();
  }

  async saveReviewResults(results: ReviewResult[]): Promise<void> {
    if (!this.dataCache) {
      await this.loadFromCache();
    }
    
    if (this.dataCache) {
      this.dataCache.reviewResults = results;
      await this.saveDataFile(this.dataCache);
    }
  }

  async loadReviewResults(): Promise<ReviewResult[]> {
    if (!this.dataCache) {
      await this.loadFromCache();
    }
    
    return this.dataCache?.reviewResults || [];
  }

  private getDefaultSettings(): Settings {
    return {
      storageType: 'filesystem',
      srsAlgorithm: 'sm2',
      sm2InitialInterval: 1,
      sm2EasyInterval: 4,
      sm2MinInterval: 1,
      sm2MaxInterval: 36500,
      theme: 'auto',
      cardsPerSession: 20
    };
  }

  // Method to set the file handle (called when user selects a file)
  setFileHandle(fileHandle: FileSystemFileHandle) {
    this.fileHandle = fileHandle;
  }

  // Method to create a new file
  async createNewFile(): Promise<void> {
    try {
      const fileHandle = await window.showSaveFilePicker?.({
        types: [{
          description: 'Blonki data file',
          accept: {
            'application/json': ['.blonki']
          }
        }]
      });
      
      if (!fileHandle) {
        throw new Error('File picker was cancelled');
      }
      
      this.fileHandle = fileHandle;
      
      // Initialize with empty data
      this.dataCache = {
        decks: [],
        cards: [],
        settings: this.getDefaultSettings(),
        reviewResults: []
      };
      
      await this.saveDataFile(this.dataCache);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        throw error;
      }
    }
  }

  // Method to open an existing file
  async openFile(): Promise<void> {
    try {
      const fileHandles = await window.showOpenFilePicker?.({
        types: [{
          description: 'Blonki data file',
          accept: {
            'application/json': ['.blonki']
          }
        }]
      });
      
      if (!fileHandles || fileHandles.length === 0) {
        throw new Error('File picker was cancelled');
      }
      
      this.fileHandle = fileHandles[0];
      await this.loadFromCache();
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        throw error;
      }
    }
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
