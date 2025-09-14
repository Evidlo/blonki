import JSZip from 'jszip';
import { decompress } from 'fzstd';
import initSqlJs from 'sql.js';
import type { Deck, Card } from '../types';

export interface APKGData {
  decks: Deck[];
  cards: Card[];
  settings: any;
}

export class APKGParser {
  async parseAPKG(arrayBuffer: ArrayBuffer): Promise<APKGData> {
    try {
      // Load the ZIP file
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Find the collection file
      const sqliteFile = zip.file("collection.anki21b") || zip.file("collection.anki2");
      
      if (!sqliteFile) {
        throw new Error('No collection file found in APKG');
      }

      let sqliteData: Uint8Array;

      if (sqliteFile.name.endsWith('.anki21b')) {
        // Decompress the Zstd file
        const compressedData = await sqliteFile.async("uint8array");
        sqliteData = decompress(compressedData);
      } else {
        // For .anki2 files, just read it directly
        sqliteData = await sqliteFile.async("uint8array");
      }

      // Parse the SQLite database
      return await this.parseSQLite(sqliteData);
    } catch (error) {
      console.error('APKG parsing failed:', error);
      throw new Error(`Failed to parse APKG file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseSQLite(sqliteData: Uint8Array): Promise<APKGData> {
    const now = new Date();
    const decks: Deck[] = [];
    const cards: Card[] = [];

    try {
      console.log('Loading SQLite database with sql.js...');
      
      // Initialize sql.js with explicit WASM path
      const SQL = await initSqlJs({
        locateFile: (file: string) => {
          if (file.endsWith('.wasm')) {
            return `/node_modules/sql.js/dist/${file}`;
          }
          return file;
        }
      });
      const db = new SQL.Database(sqliteData);
      
      console.log('SQLite database loaded successfully');
      
      // Get deck information from the col table
      let deckName = 'Imported Deck';
      try {
        // The col table has deck information in JSON format in the 'decks' column
        const colResult = db.exec("SELECT decks FROM col LIMIT 1");
        if (colResult.length > 0 && colResult[0].values.length > 0) {
          const decksJson = colResult[0].values[0][0] as string;
          if (decksJson) {
            try {
              const decksData = JSON.parse(decksJson);
              // Get the first deck name from the decks object
              const deckIds = Object.keys(decksData);
              if (deckIds.length > 0) {
                const firstDeck = decksData[deckIds[0]];
                if (firstDeck && firstDeck.name) {
                  deckName = firstDeck.name;
                }
              }
            } catch (e) {
              console.warn('Could not parse decks JSON:', e);
            }
          }
        }
      } catch (error) {
        console.warn('Could not read col table:', error);
      }
      
      console.log(`Deck name: ${deckName}`);
      
      // Get cards using a simple query
      try {
        const cardsResult = db.exec("SELECT n.flds FROM notes n");
        if (cardsResult.length > 0) {
          const values = cardsResult[0].values;
          
          console.log(`Found ${values.length} notes`);
          
          // Debug: Print first few raw field strings
          console.log('=== DEBUG: Raw field data samples ===');
          for (let i = 0; i < Math.min(3, values.length); i++) {
            const fieldsData = values[i][0] as string;
            console.log(`Note ${i + 1} raw fields:`, JSON.stringify(fieldsData));
            console.log(`Note ${i + 1} length:`, fieldsData.length);
            console.log(`Note ${i + 1} contains pipe:`, fieldsData.includes('|'));
            console.log(`Note ${i + 1} contains comma:`, fieldsData.includes(','));
            console.log('---');
          }
          console.log('=== END DEBUG ===');
          
          for (const row of values) {
            const fieldsData = row[0] as string;
            
            // Parse the fields string (usually pipe-separated in Anki)
            const fields = this.parseFieldsString(fieldsData);
            
            console.log(`Parsed fields for note:`, fields);
            
            if (fields.length >= 2) {
              const card: Card = {
                id: (Date.now() + Math.random()).toString(),
                front: this.cleanHtml(fields[0] || 'No front content'),
                back: this.cleanHtml(fields[1] || 'No back content'),
                deckId: Date.now().toString(),
                createdAt: now,
                updatedAt: now,
                interval: 1,
                repetitions: 0,
                easeFactor: 2.5,
                dueDate: now
              };
              
              console.log(`Created card - Front: "${card.front}", Back: "${card.back}"`);
              cards.push(card);
            }
          }
        }
      } catch (error) {
        console.warn('Could not read notes table:', error);
        throw new Error('Could not read notes from the database');
      }
      
      console.log(`Created ${cards.length} cards`);
      
      if (cards.length === 0) {
        throw new Error('No cards found in the APKG file');
      }
      
      // Create the deck
      const deckId = Date.now().toString();
      const deck: Deck = {
        id: deckId,
        name: deckName,
        description: 'Imported from APKG file',
        createdAt: now,
        updatedAt: now,
        cardCount: cards.length
      };
      
      // Update deck ID in all cards
      cards.forEach(card => {
        card.deckId = deckId;
      });
      
      decks.push(deck);
      
      console.log(`Final result: ${decks.length} decks, ${cards.length} cards`);
      console.log(`Deck name: ${deck.name}`);
      
      // Close the database
      db.close();
      
      return {
        decks,
        cards,
        settings: {}
      };
      
    } catch (error) {
      console.error('SQLite parsing failed:', error);
      throw new Error(`Failed to parse APKG file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseFieldsString(fieldsData: string): string[] {
    console.log(`Parsing fields string: "${fieldsData}"`);
    
    // Anki typically stores fields as pipe-separated values
    // But we need to be careful about escaped characters
    
    // Try pipe-separated first (most common in Anki)
    if (fieldsData.includes('|')) {
      // Split by pipe, but be careful about escaped pipes
      const fields = fieldsData.split('|');
      console.log(`Split by pipe:`, fields);
      return fields.map(field => this.cleanField(field));
    }
    
    // Try JSON format (some newer Anki versions)
    try {
      const parsed = JSON.parse(fieldsData);
      if (Array.isArray(parsed)) {
        console.log(`Parsed as JSON array:`, parsed);
        return parsed.map(field => this.cleanField(field));
      }
    } catch (e) {
      console.log(`Not JSON format`);
    }
    
    // Try comma-separated (but this is risky as content might contain commas)
    if (fieldsData.includes(',')) {
      console.log(`Trying comma separation (risky)`);
      const fields = fieldsData.split(',');
      console.log(`Split by comma:`, fields);
      return fields.map(field => this.cleanField(field));
    }
    
    // Single field
    console.log(`Single field detected`);
    return [this.cleanField(fieldsData)];
  }

  private cleanField(field: string): string {
    if (!field) return '';
    
    console.log(`Cleaning field: "${field}"`);
    
    // Remove SQL escaping and quotes
    let cleaned = field
      .replace(/^'|'$/g, '') // Remove surrounding quotes
      .replace(/''/g, "'") // Unescape single quotes
      .replace(/\\n/g, '\n') // Unescape newlines
      .replace(/\\t/g, '\t') // Unescape tabs
      .replace(/\\r/g, '\r') // Unescape carriage returns
      .replace(/\\\\/g, '\\') // Unescape backslashes
      .trim();
    
    console.log(`Cleaned field: "${cleaned}"`);
    return cleaned;
  }

  private cleanHtml(html: string): string {
    // Simple HTML cleaning - remove tags and decode entities
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}

// Create singleton instance
export const apkgParser = new APKGParser();