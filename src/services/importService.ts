import { storageService } from './storageService';
import { apkgParser } from './apkgParser';
import type { Deck, Card } from '../types';

export interface ImportResult {
  success: boolean;
  message: string;
  decksImported: number;
  cardsImported: number;
}

class ImportService {
  async importFile(file: File, mergeWithExisting = false): Promise<ImportResult> {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      switch (fileExtension) {
        case 'json':
          return await this.importJSON(file, mergeWithExisting);
        case 'apkg':
          return await this.importAPKG(file, mergeWithExisting);
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        decksImported: 0,
        cardsImported: 0
      };
    }
  }

  async importJSON(file: File, mergeWithExisting = false): Promise<ImportResult> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate the data structure
      if (!data.decks || !Array.isArray(data.decks)) {
        throw new Error('Invalid JSON format: missing or invalid decks array');
      }
      
      if (!data.cards || !Array.isArray(data.cards)) {
        throw new Error('Invalid JSON format: missing or invalid cards array');
      }

      // Convert date strings to Date objects
      const decks: Deck[] = data.decks.map((deck: any) => ({
        ...deck,
        createdAt: new Date(deck.createdAt),
        updatedAt: new Date(deck.updatedAt)
      }));

      const cards: Card[] = data.cards.map((card: any) => ({
        ...card,
        createdAt: new Date(card.createdAt),
        updatedAt: new Date(card.updatedAt),
        dueDate: new Date(card.dueDate),
        lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : undefined
      }));

      // Import the data
      await storageService.importData({ decks, cards, settings: data.settings }, mergeWithExisting);

      return {
        success: true,
        message: `Successfully imported ${decks.length} decks and ${cards.length} cards`,
        decksImported: decks.length,
        cardsImported: cards.length
      };
    } catch (error) {
      throw new Error(`Failed to import JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async importAPKG(file: File, mergeWithExisting = false): Promise<ImportResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = await apkgParser.parseAPKG(arrayBuffer);
      
      // If deck name is still "Imported Deck", use filename as fallback
      if (data.decks.length > 0 && data.decks[0].name === 'Imported Deck') {
        const filename = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        data.decks[0].name = filename;
      }
      
      await storageService.importData(data, mergeWithExisting);

      return {
        success: true,
        message: `Successfully imported ${data.decks.length} decks and ${data.cards.length} cards from APKG`,
        decksImported: data.decks.length,
        cardsImported: data.cards.length
      };
    } catch (error) {
      throw new Error(`Failed to import APKG file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  async importFromURL(url: string, mergeWithExisting = false): Promise<ImportResult> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType) {
        throw new Error('No content type specified');
      }

      if (contentType.includes('application/json')) {
        const data = await response.json();
        return await this.importJSONData(data, mergeWithExisting);
      } else if (contentType.includes('application/zip') || url.endsWith('.apkg')) {
        const arrayBuffer = await response.arrayBuffer();
        const data = await apkgParser.parseAPKG(arrayBuffer);
        await storageService.importData(data, mergeWithExisting);
        
        return {
          success: true,
          message: `Successfully imported from URL: ${data.decks.length} decks and ${data.cards.length} cards`,
          decksImported: data.decks.length,
          cardsImported: data.cards.length
        };
      } else {
        throw new Error(`Unsupported content type: ${contentType}`);
      }
    } catch (error) {
      throw new Error(`Failed to import from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async importJSONData(data: any, mergeWithExisting = false): Promise<ImportResult> {
    // Validate the data structure
    if (!data.decks || !Array.isArray(data.decks)) {
      throw new Error('Invalid JSON format: missing or invalid decks array');
    }
    
    if (!data.cards || !Array.isArray(data.cards)) {
      throw new Error('Invalid JSON format: missing or invalid cards array');
    }

    // Convert date strings to Date objects
    const decks: Deck[] = data.decks.map((deck: any) => ({
      ...deck,
      createdAt: new Date(deck.createdAt),
      updatedAt: new Date(deck.updatedAt)
    }));

    const cards: Card[] = data.cards.map((card: any) => ({
      ...card,
      createdAt: new Date(card.createdAt),
      updatedAt: new Date(card.updatedAt),
      dueDate: new Date(card.dueDate),
      lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : undefined
    }));

    // Import the data
    await storageService.importData({ decks, cards, settings: data.settings }, mergeWithExisting);

    return {
      success: true,
      message: `Successfully imported ${decks.length} decks and ${cards.length} cards from URL`,
      decksImported: decks.length,
      cardsImported: cards.length
    };
  }
}

// Create singleton instance
export const importService = new ImportService();
