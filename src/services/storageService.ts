import { FileSystemAccessAdapter, LocalStorageAdapter, isFilesystemSupported } from '../utils/storage';
import { get } from 'svelte/store';
import { appStore } from '../stores/appStore';
import { settingsStore } from '../stores/settingsStore';
import { deckStore } from '../stores/deckStore';
import { cardStore } from '../stores/cardStore';
import type { Card } from '../types';

class StorageService {
  private adapter: FileSystemAccessAdapter | null = null;
  private localStorageAdapter: LocalStorageAdapter;

  constructor() {
    this.localStorageAdapter = new LocalStorageAdapter();
  }

  async initialize() {
    // Load settings directly from localStorage to determine storage type
    const settings = await this.localStorageAdapter.loadSettings();
    settingsStore.set(settings);
    
    // Create adapter based on current storage type
    if (settings.storageType === 'fileSystemAccess' && isFilesystemSupported()) {
      this.adapter = new FileSystemAccessAdapter();
    }
    
    // Load initial data using the appropriate adapter
    await this.loadDecks();
    await this.loadCards();
  }

  // File System Access API methods
  async linkDeckToFile(deckId: string, fileHandle: FileSystemFileHandle) {
    if (!this.adapter) {
      throw new Error('File System Access API not supported');
    }
    return await this.adapter.linkDeckToFile(deckId, fileHandle);
  }

  async unlinkDeckFromFile(deckId: string) {
    if (!this.adapter) {
      throw new Error('File System Access API not supported');
    }
    this.adapter.unlinkDeckFromFile(deckId);
  }

  getDeckFilePath(deckId: string): string {
    if (!this.adapter) {
      return 'Browser Storage';
    }
    return this.adapter.getDeckFilePath(deckId);
  }

  isDeckLinkedToFile(deckId: string): boolean {
    if (!this.adapter) {
      return false;
    }
    return this.adapter.isDeckLinkedToFile(deckId);
  }

  async loadDeckFromFile(fileHandle: FileSystemFileHandle) {
    if (!this.adapter) {
      throw new Error('File System Access API not supported');
    }
    return await this.adapter.loadDeckFromFile(fileHandle);
  }

  // Data management methods
  async exportData() {
    const data = {
      decks: get(deckStore),
      cards: get(cardStore),
      settings: get(settingsStore),
      version: '1.0.0'
    };
    return data;
  }

  async importData(data: any) {
    if (data.decks) {
      await this.saveDecks(data.decks);
    }
    if (data.cards) {
      await this.saveCards(data.cards);
    }
    if (data.settings) {
      await this.saveSettings(data.settings);
    }
  }

  async createBackup() {
    const data = await this.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    return blob;
  }

  async downloadBackup() {
    const blob = await this.createBackup();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blonki-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async restoreFromBackup(file: File) {
    const text = await file.text();
    const data = JSON.parse(text);
    await this.importData(data);
  }

  async migrateFromLocalStorage() {
    // This would migrate data from localStorage to the current storage system
    // For now, just load from localStorage
    const localData = localStorage.getItem('blonki-data');
    if (localData) {
      const data = JSON.parse(localData);
      await this.importData(data);
    }
  }

  async clearAllData() {
    deckStore.set([]);
    cardStore.set([]);
    settingsStore.set(this.getDefaultSettings());
  }

  // Store interaction methods
  async loadSettings() {
    if (this.adapter) {
      const settings = await this.adapter.loadSettings();
      settingsStore.set(settings);
    } else {
      const settings = await this.localStorageAdapter.loadSettings();
      settingsStore.set(settings);
    }
  }

  async saveSettings(settings: any) {
    if (this.adapter) {
      await this.adapter.saveSettings(settings);
    } else {
      await this.localStorageAdapter.saveSettings(settings);
    }
    settingsStore.set(settings);
    
    // Recreate adapter if storage type changed
    if (settings.storageType === 'fileSystemAccess' && isFilesystemSupported() && !this.adapter) {
      this.adapter = new FileSystemAccessAdapter();
    } else if (settings.storageType === 'localStorage' && this.adapter) {
      this.adapter = null;
    }
  }

  async loadDecks() {
    if (this.adapter) {
      const decks = await this.adapter.loadDecks();
      deckStore.set(decks);
    } else {
      const decks = await this.localStorageAdapter.loadDecks();
      deckStore.set(decks);
    }
  }

  async saveDecks(decks: any[]) {
    if (this.adapter) {
      await this.adapter.saveDecks(decks);
    } else {
      await this.localStorageAdapter.saveDecks(decks);
    }
    deckStore.set(decks);
  }

  async loadCards() {
    if (this.adapter) {
      const cards = await this.adapter.loadCards();
      cardStore.set(cards);
    } else {
      const cards = await this.localStorageAdapter.loadCards();
      cardStore.set(cards);
    }
  }

  async saveCards(cards: any[]) {
    if (this.adapter) {
      await this.adapter.saveCards(cards);
    } else {
      await this.localStorageAdapter.saveCards(cards);
    }
    cardStore.set(cards);
  }

  // Card management
  async addCard(card: any) {
    const cards = get(cardStore);
    const newCards = [...cards, card];
    await this.saveCards(newCards);
  }

  async updateCard(card: any) {
    const cards = get(cardStore);
    const updatedCards = cards.map(c => c.id === card.id ? card : c);
    await this.saveCards(updatedCards);
  }

  async deleteCard(cardId: string) {
    const cards = get(cardStore);
    const filteredCards = cards.filter(c => c.id !== cardId);
    await this.saveCards(filteredCards);
  }

  // Deck management
  async addDeck(deck: any) {
    const decks = get(deckStore);
    const newDecks = [...decks, deck];
    await this.saveDecks(newDecks);
  }

  async updateDeck(deck: any) {
    const decks = get(deckStore);
    const updatedDecks = decks.map(d => d.id === deck.id ? deck : d);
    await this.saveDecks(updatedDecks);
  }

  async deleteDeck(deckId: string) {
    const decks = get(deckStore);
    const cards = get(cardStore);
    
    // If this is a linked deck in File System Access mode, unlink it first
    if (this.adapter && this.isDeckLinkedToFile(deckId)) {
      this.unlinkDeckFromFile(deckId);
    }
    
    // Delete all cards in this deck
    const filteredCards = cards.filter(c => c.deckId !== deckId);
    await this.saveCards(filteredCards);
    
    // Delete the deck
    const filteredDecks = decks.filter(d => d.id !== deckId);
    await this.saveDecks(filteredDecks);
  }

  async getCardsForDeck(deckId: string) {
    const cards = get(cardStore);
    return cards.filter(card => card.deckId === deckId);
  }

  // Method to save cards only to localStorage without triggering file saves
  async saveCardsToLocalStorageOnly(cards: Card[]) {
    if (this.adapter && 'saveCardsToLocalStorageOnly' in this.adapter) {
      await (this.adapter as any).saveCardsToLocalStorageOnly(cards);
    } else {
      await this.localStorageAdapter.saveCards(cards);
    }
    cardStore.set(cards);
  }

  private getDefaultSettings() {
    return {
      storageType: 'localStorage' as const,
      srsAlgorithm: 'sm2' as const,
      sm2InitialInterval: 1,
      sm2EasyInterval: 4,
      sm2MinInterval: 1,
      sm2MaxInterval: 36500,
      theme: 'auto' as const,
      cardsPerSession: 20
    };
  }
}

export const storageService = new StorageService();