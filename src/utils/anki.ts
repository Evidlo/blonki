import { ApkgExport } from 'anki-apkg-export';
import type { Deck, Card, ImportOptions, ExportOptions } from '../types';

// Convert our internal Card format to Anki format
function cardToAnki(card: Card): any {
  return {
    front: card.front,
    back: card.back,
    deckName: card.deckId, // We'll need to map deckId to deck name
    tags: [],
    // Add any other Anki-specific fields as needed
  };
}

// Convert Anki format to our internal Card format
function ankiToCard(ankiCard: any, deckId: string): Card {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    front: ankiCard.front || '',
    back: ankiCard.back || '',
    deckId,
    createdAt: new Date(),
    updatedAt: new Date(),
    interval: 1,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: new Date()
  };
}

// Import from .apkg file
export async function importFromApkg(file: File, deckId: string): Promise<Card[]> {
  try {
    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // For now, we'll create a simple parser
    // In a real implementation, you'd need to parse the .apkg file format
    // This is a placeholder that creates sample cards
    const sampleCards: Card[] = [
      {
        id: Date.now().toString() + '_1',
        front: 'Sample Front 1',
        back: 'Sample Back 1',
        deckId,
        createdAt: new Date(),
        updatedAt: new Date(),
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: new Date()
      },
      {
        id: Date.now().toString() + '_2',
        front: 'Sample Front 2',
        back: 'Sample Back 2',
        deckId,
        createdAt: new Date(),
        updatedAt: new Date(),
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: new Date()
      }
    ];
    
    return sampleCards;
  } catch (error) {
    console.error('Error importing .apkg file:', error);
    throw new Error('Failed to import .apkg file');
  }
}

// Import from URL
export async function importFromUrl(url: string, deckId: string): Promise<Card[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // For now, we'll assume the URL points to a JSON file with cards
    const data = await response.json();
    
    if (Array.isArray(data)) {
      return data.map((item: any) => ankiToCard(item, deckId));
    } else if (data.cards && Array.isArray(data.cards)) {
      return data.cards.map((item: any) => ankiToCard(item, deckId));
    } else {
      throw new Error('Invalid data format');
    }
  } catch (error) {
    console.error('Error importing from URL:', error);
    throw new Error('Failed to import from URL');
  }
}

// Export to .apkg file
export async function exportToApkg(cards: Card[], deckName: string): Promise<Blob> {
  try {
    const apkg = new ApkgExport({
      name: deckName,
      card: cards.map(card => cardToAnki(card))
    });
    
    return await apkg.save();
  } catch (error) {
    console.error('Error exporting to .apkg:', error);
    throw new Error('Failed to export to .apkg file');
  }
}

// Export to JSON
export function exportToJson(cards: Card[]): string {
  return JSON.stringify(cards, null, 2);
}

// Handle file import
export function handleFileImport(file: File, deckId: string): Promise<Card[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'apkg':
      return importFromApkg(file, deckId);
    case 'json':
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            const cards = Array.isArray(data) ? data : data.cards || [];
            resolve(cards.map((item: any) => ankiToCard(item, deckId)));
          } catch (error) {
            reject(new Error('Invalid JSON file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}

// Download file
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
