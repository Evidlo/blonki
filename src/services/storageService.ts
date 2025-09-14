import { FilesystemStorageAdapter, isFilesystemSupported } from '../utils/storage';
import { get } from 'svelte/store';
import { appStore } from '../stores/appStore';
import { settingsStore } from '../stores/settingsStore';
import { deckStore } from '../stores/deckStore';
import { cardStore } from '../stores/cardStore';

class StorageService {
  private adapter: FilesystemStorageAdapter | null = null;

  async initialize() {
    if (isFilesystemSupported()) {
      this.adapter = new FilesystemStorageAdapter();
    }
    
    // Load initial data
    await this.loadSettings();
    await this.loadDecks();
    await this.loadCards();
  }

  // Filesystem API methods
  async createNewFile() {
    if (!this.adapter) {
      throw new Error('Filesystem API not supported');
    }
    return await this.adapter.createNewFile();
  }

  async openFile() {
    if (!this.adapter) {
      throw new Error('Filesystem API not supported');
    }
    return await this.adapter.openFile();
  }

  async setFileHandle(handle: FileSystemFileHandle) {
    if (!this.adapter) {
      throw new Error('Filesystem API not supported');
    }
    this.adapter.setFileHandle(handle);
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
      deckStore.set(data.decks);
    }
    if (data.cards) {
      cardStore.set(data.cards);
    }
    if (data.settings) {
      settingsStore.set(data.settings);
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
    }
  }

  async saveSettings(settings: any) {
    if (this.adapter) {
      await this.adapter.saveSettings(settings);
    }
    settingsStore.set(settings);
  }

  async loadDecks() {
    if (this.adapter) {
      const decks = await this.adapter.loadDecks();
      deckStore.set(decks);
    }
  }

  async saveDecks(decks: any[]) {
    if (this.adapter) {
      await this.adapter.saveDecks(decks);
    }
    deckStore.set(decks);
  }

  async loadCards() {
    if (this.adapter) {
      const cards = await this.adapter.loadCards();
      cardStore.set(cards);
    }
  }

  async saveCards(cards: any[]) {
    if (this.adapter) {
      await this.adapter.saveCards(cards);
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

  private getDefaultSettings() {
    if (this.adapter) {
      return this.adapter.getDefaultSettings();
    }
    return {
      theme: 'light',
      language: 'en',
      reviewMode: 'spaced-repetition',
      newCardsPerDay: 20,
      reviewCardsPerDay: 100
    };
  }
}

export const storageService = new StorageService();