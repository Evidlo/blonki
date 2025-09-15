import type { StorageAdapter, Deck, Card, Settings, ReviewResult } from '../types';
import { APKGParser, APKGGenerator } from '../services/apkgFormat';

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
export class LocalStorageAdapter implements StorageAdapter {
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

// File System Access API implementation for .apkg file linking
export class FileSystemAccessAdapter implements StorageAdapter {
  private localStorageAdapter: LocalStorageAdapter;
  private fileHandles: Map<string, FileSystemFileHandle> = new Map(); // deckId -> fileHandle
  private filePaths: Map<string, string> = new Map(); // deckId -> display path
  private hasUnsavedChanges: Map<string, boolean> = new Map(); // deckId -> has changes
  private apkgGenerator: APKGGenerator;

  constructor() {
    this.localStorageAdapter = new LocalStorageAdapter();
    this.apkgGenerator = new APKGGenerator();
  }

  // Link a deck to a specific .apkg file
  async linkDeckToFile(deckId: string, fileHandle: FileSystemFileHandle): Promise<void> {
    console.log('Linking deck to file:', deckId, fileHandle.name);
    this.fileHandles.set(deckId, fileHandle);
    
    // Try to get the file name for display
    try {
      const file = await fileHandle.getFile();
      // Try to get the full path if available, fallback to filename
      const fullPath = (file as any).path || file.name;
      this.filePaths.set(deckId, fullPath);
      console.log('File path set to:', fullPath);
    } catch (error) {
      this.filePaths.set(deckId, '[File Permission Error]');
    }
  }

  // Unlink a deck from its file
  unlinkDeckFromFile(deckId: string): void {
    this.fileHandles.delete(deckId);
    this.filePaths.delete(deckId);
  }

  // Get the file path for a deck (for display)
  getDeckFilePath(deckId: string): string {
    return this.filePaths.get(deckId) || 'Browser Storage';
  }

  // Check if a deck is linked to a file
  isDeckLinkedToFile(deckId: string): boolean {
    return this.fileHandles.has(deckId);
  }

  // Save a specific deck to its linked .apkg file
  async saveDeckToFile(deckId: string, deck: Deck, cards: Card[]): Promise<void> {
    console.log('saveDeckToFile called for deck:', deckId, 'with', cards.length, 'cards');
    
    const fileHandle = this.fileHandles.get(deckId);
    if (!fileHandle) {
      throw new Error('Deck is not linked to a file');
    }

    try {
      // Generate proper APKG file
      console.log('Generating APKG file for deck:', deck.name);
      const apkgData = await this.apkgGenerator.generateAPKG([deck], cards, {
        includeSettings: false
      });

      console.log('Writing APKG to file handle:', fileHandle.name);
      const writable = await fileHandle.createWritable();
      await writable.write(apkgData);
      await writable.close();
      console.log('Successfully saved deck to APKG file');
    } catch (error: any) {
      console.error('Failed to save deck to file:', error);
      this.filePaths.set(deckId, '[File Permission Error]');
      throw new Error(`Failed to save deck to file: ${error.message}`);
    }
  }

  // Load a deck from a .apkg file
  async loadDeckFromFile(fileHandle: FileSystemFileHandle): Promise<{ deck: Deck; cards: Card[] }> {
    try {
      const file = await fileHandle.getFile();
      console.log('File System Access - File name:', file.name);
      console.log('File System Access - File size:', file.size);
      console.log('File System Access - File type:', file.type);
      
      const arrayBuffer = await file.arrayBuffer();
      console.log('File System Access - ArrayBuffer size:', arrayBuffer.byteLength);
      
      // Try to parse as .apkg file first
      try {
        const parser = new APKGParser();
        const apkgData = await parser.parseAPKG(arrayBuffer);
        
        // For File System Access, we'll take the first deck and its cards
        // In the future, we might want to handle multiple decks
        if (apkgData.decks.length === 0) {
          throw new Error('No decks found in APKG file');
        }
        
        const deck = apkgData.decks[0];
        const cards = apkgData.cards.filter(card => card.deckId === deck.id);
        
        // If the deck name is generic, use the filename
        if (deck.name === 'Imported Deck' || deck.name === 'Default') {
          const fileName = file.name.replace('.apkg', '');
          deck.name = fileName;
        }
        
        return { deck, cards };
      } catch (apkgError) {
        // APKG parsing failed - no fallback
        throw new Error(`Failed to parse APKG file: ${apkgError instanceof Error ? apkgError.message : 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Failed to load deck from file:', error);
      throw new Error(`Failed to load deck from file: ${error.message}`);
    }
  }

  // StorageAdapter interface implementation
  async saveDecks(decks: Deck[]): Promise<void> {
    console.log('FileSystemAccessAdapter.saveDecks called with', decks.length, 'decks');
    console.log('Deck IDs:', decks.map(d => d.id));
    
    // Save all decks to localStorage as fallback
    await this.localStorageAdapter.saveDecks(decks);
    console.log('Decks saved to localStorage');
    
    // Note: We don't save to file here to avoid permission dialogs on initial load
    // File saving will happen in saveCards when user makes actual edits
  }

  async loadDecks(): Promise<Deck[]> {
    const decks = await this.localStorageAdapter.loadDecks();
    
    // Update file paths for linked decks
    return decks.map(deck => ({
      ...deck,
      filePath: this.getDeckFilePath(deck.id),
      isLinkedToFile: this.isDeckLinkedToFile(deck.id)
    }));
  }

  async saveCards(cards: Card[]): Promise<void> {
    console.log('FileSystemAccessAdapter.saveCards called with', cards.length, 'cards');
    console.log('Available file handles:', Array.from(this.fileHandles.keys()));
    
    // Save all cards to localStorage as fallback
    await this.localStorageAdapter.saveCards(cards);
    
    // Mark decks as having unsaved changes and save to file
    const deckIds = new Set(cards.map(card => card.deckId));
    console.log('Deck IDs from cards:', Array.from(deckIds));
    
    for (const deckId of deckIds) {
      console.log(`Checking deck ${deckId}: has file handle = ${this.fileHandles.has(deckId)}`);
      if (this.fileHandles.has(deckId)) {
        // Mark as having unsaved changes
        this.hasUnsavedChanges.set(deckId, true);
        
        console.log('Saving cards for linked deck:', deckId);
        const deck = (await this.localStorageAdapter.loadDecks()).find(d => d.id === deckId);
        if (deck) {
          const deckCards = cards.filter(card => card.deckId === deckId);
          await this.saveDeckToFile(deckId, deck, deckCards);
          // Mark as saved after successful save
          this.hasUnsavedChanges.set(deckId, false);
        } else {
          console.log('Deck not found in localStorage:', deckId);
        }
      } else {
        console.log('No file handle for deck:', deckId);
      }
    }
  }

  async loadCards(): Promise<Card[]> {
    return await this.localStorageAdapter.loadCards();
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.localStorageAdapter.saveSettings(settings);
  }

  async loadSettings(): Promise<Settings> {
    return await this.localStorageAdapter.loadSettings();
  }

  async saveReviewResults(results: ReviewResult[]): Promise<void> {
    await this.localStorageAdapter.saveReviewResults(results);
  }

  async loadReviewResults(): Promise<ReviewResult[]> {
    return await this.localStorageAdapter.loadReviewResults();
  }

  // Method to save cards only to localStorage without triggering file saves
  async saveCardsToLocalStorageOnly(cards: Card[]): Promise<void> {
    await this.localStorageAdapter.saveCards(cards);
  }
}

// Storage factory
export function createStorageAdapter(type: 'localStorage' | 'fileSystemAccess'): StorageAdapter {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter();
    case 'fileSystemAccess':
      return new FileSystemAccessAdapter();
    default:
      throw new Error(`Unknown storage type: ${type}`);
  }
}

// Check if File System Access API is supported
export function isFilesystemSupported(): boolean {
  return 'showOpenFilePicker' in window;
}
