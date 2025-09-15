import { get } from 'svelte/store';
import { deckStore } from '../stores/deckStore';
import { cardStore } from '../stores/cardStore';
import { settingsStore } from '../stores/settingsStore';
import { APKGGenerator } from './apkgFormat';
import type { Deck, Card, Settings } from '../types';

export interface ExportOptions {
  deckIds?: string[];
  format: 'json' | 'apkg';
  includeSettings?: boolean;
}

export interface ExportResult {
  success: boolean;
  message: string;
  data?: Blob;
  filename?: string;
}

class ExportService {
  private apkgGenerator = new APKGGenerator();

  async exportData(options: ExportOptions): Promise<ExportResult> {
    try {
      const { deckIds, format, includeSettings = true } = options;
      
      // Get all data
      const allDecks = get(deckStore);
      const allCards = get(cardStore);
      const settings = get(settingsStore);

      // Filter decks and cards if specific deck IDs are provided
      const selectedDecks = deckIds 
        ? allDecks.filter(deck => deckIds.includes(deck.id))
        : allDecks;
      
      const selectedCards = deckIds
        ? allCards.filter(card => deckIds.includes(card.deckId))
        : allCards;

      if (selectedDecks.length === 0) {
        throw new Error('No decks selected for export');
      }

      switch (format) {
        case 'json':
          return await this.exportJSON(selectedDecks, selectedCards, includeSettings ? settings : undefined);
        case 'apkg':
          return await this.exportAPKG(selectedDecks, selectedCards);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async exportJSON(
    decks: Deck[], 
    cards: Card[], 
    settings?: Settings
  ): Promise<ExportResult> {
    const exportData = {
      decks,
      cards,
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `blonki-export-${new Date().toISOString().split('T')[0]}.json`;

    return {
      success: true,
      message: `Successfully exported ${decks.length} decks and ${cards.length} cards`,
      data: blob,
      filename
    };
  }

  private async exportAPKG(decks: Deck[], cards: Card[]): Promise<ExportResult> {
    try {
      // Generate proper APKG file
      const apkgData = await this.apkgGenerator.generateAPKG(decks, cards, {
        includeSettings: true
      });

      const blob = new Blob([apkgData], { type: 'application/zip' });
      const filename = `blonki-export-${new Date().toISOString().split('T')[0]}.apkg`;

      return {
        success: true,
        message: `Successfully exported ${decks.length} decks and ${cards.length} cards as APKG`,
        data: blob,
        filename
      };
    } catch (error) {
      console.error('APKG generation failed:', error);
      throw new Error(`Failed to generate APKG file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadExport(options: ExportOptions): Promise<void> {
    const result = await this.exportData(options);
    
    if (!result.success) {
      throw new Error(result.message);
    }

    if (!result.data || !result.filename) {
      throw new Error('Export data or filename missing');
    }

    // Create download link
    const url = URL.createObjectURL(result.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async exportDeck(deckId: string, format: 'json' | 'apkg' = 'json'): Promise<void> {
    await this.downloadExport({
      deckIds: [deckId],
      format,
      includeSettings: false
    });
  }

  async exportAllDecks(format: 'json' | 'apkg' = 'json'): Promise<void> {
    await this.downloadExport({
      format,
      includeSettings: true
    });
  }

  async exportSelectedDecks(deckIds: string[], format: 'json' | 'apkg' = 'json'): Promise<void> {
    await this.downloadExport({
      deckIds,
      format,
      includeSettings: false
    });
  }
}

// Create singleton instance
export const exportService = new ExportService();
