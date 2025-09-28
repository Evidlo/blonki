import { get } from 'svelte/store';
import { deckStore } from '../stores/deckStore';
import { cardStore } from '../stores/cardStore';
import { settingsStore } from '../stores/settingsStore';
import { APKGGenerator } from './apkgFormat';
import type { Deck, Card, Settings } from '../types';

export interface ExportOptions {
  deckIds?: string[];
  format: 'apkg';
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

      // Only APKG format is supported
      return await this.exportAPKG(selectedDecks, selectedCards);
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }


  private async exportAPKG(decks: Deck[], cards: Card[]): Promise<ExportResult> {
    try {
      console.log('Starting APKG export:', {
        deckCount: decks.length,
        cardCount: cards.length,
        deckNames: decks.map(d => d.name)
      });

      // Validate data before export
      if (decks.length === 0) {
        throw new Error('No decks to export');
      }

      if (cards.length === 0) {
        throw new Error('No cards to export');
      }

      // Generate proper APKG file
      const apkgData = await this.apkgGenerator.generateAPKG(decks, cards, {
        includeSettings: true
      });

      if (!apkgData || apkgData.length === 0) {
        throw new Error('Generated APKG file is empty');
      }

      const blob = new Blob([apkgData], { type: 'application/zip' });
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = decks.length === 1 
        ? `${decks[0].name.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.apkg`
        : `blonki-export-${timestamp}.apkg`;

      console.log('APKG export completed:', {
        filename,
        size: apkgData.length,
        blobSize: blob.size
      });

      return {
        success: true,
        message: `Successfully exported ${decks.length} deck${decks.length === 1 ? '' : 's'} and ${cards.length} card${cards.length === 1 ? '' : 's'} as APKG`,
        data: blob,
        filename
      };
    } catch (error) {
      console.error('APKG generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to generate APKG file: ${errorMessage}`);
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

  async exportDeck(deckId: string): Promise<void> {
    await this.downloadExport({
      deckIds: [deckId],
      format: 'apkg',
      includeSettings: false
    });
  }

  async exportAllDecks(): Promise<void> {
    await this.downloadExport({
      format: 'apkg',
      includeSettings: true
    });
  }

  async exportSelectedDecks(deckIds: string[]): Promise<void> {
    await this.downloadExport({
      deckIds,
      format: 'apkg',
      includeSettings: false
    });
  }
}

// Create singleton instance
export const exportService = new ExportService();
