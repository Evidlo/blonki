import JSZip from 'jszip';
import { decompress } from 'fzstd';
import * as zstd from '@bokuweb/zstd-wasm';
import initSqlJs from 'sql.js';
import type { Deck, Card } from '../types';

export interface APKGData {
  decks: Deck[];
  cards: Card[];
  settings: any;
}

export interface APKGGenerationOptions {
  includeSettings?: boolean;
}

// APKG Parser - for reading APKG files
export class APKGParser {
  // Helper function to check if a deck name is generic and should be replaced with filename
  private isGenericDeckName(name: string): boolean {
    const genericNames = [
      'Imported Deck',
      'Default',
      'Default Deck',
      'Untitled',
      'Untitled Deck',
      'New Deck',
      'Deck',
      'Collection',
      'Anki Deck'
    ];
    return genericNames.includes(name) || name.trim() === '';
  }

  async parseAPKG(arrayBuffer: ArrayBuffer, filename?: string): Promise<APKGData> {
    try {
      // Debug: Log file info
      console.log('APKG file size:', arrayBuffer.byteLength);
      console.log('First 16 bytes:', Array.from(new Uint8Array(arrayBuffer.slice(0, 16))));
      
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
      return await this.parseSQLite(sqliteData, filename);
    } catch (error) {
      console.error('APKG parsing failed:', error);
      throw new Error(`Failed to parse APKG file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseSQLite(sqliteData: Uint8Array, filename?: string): Promise<APKGData> {
    const now = new Date();
    const decks: Deck[] = [];
    const cards: Card[] = [];

    try {
      console.log('Loading SQLite database with sql.js...');
      
      // Initialize sql.js with fallback for GitHub Pages
      const SQL = await initSqlJs({
        locateFile: (file: string) => {
          if (file.endsWith('.wasm')) {
            // Use CDN for GitHub Pages compatibility (serves correct MIME type)
            return `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`;
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
      
      console.log(`Deck name from APKG: ${deckName}`);
      
      // If the deck name is generic and we have a filename, use the filename instead
      if (this.isGenericDeckName(deckName) && filename) {
        const cleanFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
        console.log(`Using filename as deck name: ${cleanFilename}`);
        deckName = cleanFilename;
      }
      
      // Get cards using a simple query
      try {
        const cardsResult = db.exec("SELECT n.flds FROM notes n");
        if (cardsResult.length > 0) {
          const values = cardsResult[0].values;
          
          console.log(`Found ${values.length} notes`);
          
          for (const row of values) {
            const fieldsData = row[0] as string;
            
            // Parse the fields string using Unicode unit separator (U+001F)
            const fields = this.parseFieldsString(fieldsData);
            
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
        cardCount: cards.length,
        isLinkedToFile: false
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
    if (!fieldsData || typeof fieldsData !== 'string') {
      console.warn('Invalid fields data:', fieldsData);
      return ['', ''];
    }

    console.log('Parsing fields data:', {
      length: fieldsData.length,
      firstChars: fieldsData.substring(0, 50),
      hasUnitSeparator: fieldsData.includes('\x1F'),
      hasPipe: fieldsData.includes('|'),
      hasComma: fieldsData.includes(','),
      hasSemicolon: fieldsData.includes(';')
    });

    // Anki stores fields separated by Unicode unit separator (U+001F)
    const unitSeparator = '\x1F';
    
    // Try Unicode unit separator first (most common in Anki)
    if (fieldsData.includes(unitSeparator)) {
      const fields = fieldsData.split(unitSeparator);
      console.log(`Split by unit separator: ${fields.length} fields`);
      return fields.map(field => this.cleanField(field));
    }
    
    // Fallback to pipe-separated (older Anki versions)
    if (fieldsData.includes('|')) {
      const fields = fieldsData.split('|');
      console.log(`Split by pipe: ${fields.length} fields`);
      return fields.map(field => this.cleanField(field));
    }
    
    // Try comma-separated (some exports)
    if (fieldsData.includes(',')) {
      const fields = fieldsData.split(',');
      console.log(`Split by comma: ${fields.length} fields`);
      return fields.map(field => this.cleanField(field));
    }
    
    // Try semicolon-separated (some exports)
    if (fieldsData.includes(';')) {
      const fields = fieldsData.split(';');
      console.log(`Split by semicolon: ${fields.length} fields`);
      return fields.map(field => this.cleanField(field));
    }
    
    // Try JSON format (some newer Anki versions)
    try {
      const parsed = JSON.parse(fieldsData);
      if (Array.isArray(parsed)) {
        console.log(`Parsed as JSON array: ${parsed.length} fields`);
        return parsed.map(field => this.cleanField(field));
      }
    } catch (e) {
      // Not JSON format
      console.log('Not JSON format, trying other methods');
    }
    
    // Try to detect if it's a single field that might be HTML
    if (fieldsData.trim().length > 0) {
      console.log('Treating as single field');
      return [this.cleanField(fieldsData), ''];
    }
    
    // Empty or invalid data
    console.warn('No valid field data found');
    return ['', ''];
  }

  private cleanField(field: string): string {
    if (!field) return '';
    
    console.log('Cleaning field:', {
      original: field.substring(0, 100),
      length: field.length,
      hasQuotes: field.startsWith("'") && field.endsWith("'"),
      hasEscaping: field.includes('\\')
    });
    
    // Remove SQL escaping and quotes
    let cleaned = field
      .replace(/^'|'$/g, '') // Remove surrounding quotes
      .replace(/''/g, "'") // Unescape single quotes
      .replace(/\\n/g, '\n') // Unescape newlines
      .replace(/\\t/g, '\t') // Unescape tabs
      .replace(/\\r/g, '\r') // Unescape carriage returns
      .replace(/\\\\/g, '\\') // Unescape backslashes
      .replace(/\\"/g, '"') // Unescape double quotes
      .replace(/\\'/g, "'") // Unescape single quotes
      .trim();
    
    // Handle empty fields that might have been null/undefined
    if (cleaned === 'null' || cleaned === 'undefined' || cleaned === '') {
      return '';
    }
    
    console.log('Cleaned field result:', {
      cleaned: cleaned.substring(0, 100),
      length: cleaned.length
    });
    
    return cleaned;
  }

  private cleanHtml(html: string): string {
    if (!html) return '';
    
    console.log('Cleaning HTML:', {
      original: html.substring(0, 100),
      length: html.length,
      hasTags: /<[^>]*>/.test(html),
      hasEntities: /&[a-zA-Z0-9#]+;/.test(html)
    });
    
    // More comprehensive HTML cleaning with better entity handling
    let cleaned = html
      // Decode HTML entities first
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&hellip;/g, '...')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&copy;/g, '©')
      .replace(/&reg;/g, '®')
      .replace(/&trade;/g, '™')
      // Handle numeric entities
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
      .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
      // Remove HTML tags but preserve line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
      // Normalize whitespace
      .replace(/\n\s*\n/g, '\n') // Multiple newlines to single
      .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
      .replace(/\n /g, '\n') // Remove leading spaces after newlines
      .replace(/ \n/g, '\n') // Remove trailing spaces before newlines
      .trim();
    
    console.log('Cleaned HTML result:', {
      cleaned: cleaned.substring(0, 100),
      length: cleaned.length
    });
    
    return cleaned;
  }
}

// APKG Generator - for creating APKG files
export class APKGGenerator {
  private sqlJs: any = null;
  private zstdInitialized = false;

  async initialize() {
    if (!this.sqlJs) {
      this.sqlJs = await initSqlJs({
        locateFile: (file: string) => {
          if (file.endsWith('.wasm')) {
            // Use CDN for GitHub Pages compatibility
            return `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`;
          }
          return file;
        }
      });
    }

    if (!this.zstdInitialized) {
      try {
        console.log('🔧 Initializing Zstd WASM module...');
        console.log('🔧 Zstd library version:', zstd);
        console.log('🔧 Zstd.init function:', typeof zstd.init);
        
        // Initialize Zstd using Vite bundler approach (no path needed)
        console.log('🔧 Initializing Zstd with Vite bundler...');
        await zstd.init();
        console.log('🔧 ✅ Zstd WASM module loaded successfully via Vite');
        
        console.log('🔧 ✅ Zstd WASM module initialized successfully');
        console.log('🔧 Zstd functions available:', Object.keys(zstd));
        this.zstdInitialized = true;
      } catch (error) {
        console.error('🔧 ❌ Failed to initialize Zstd WASM module:', error);
        console.error('🔧 ❌ Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        throw new Error(`Zstd initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async generateAPKG(decks: Deck[], cards: Card[], options: APKGGenerationOptions = {}): Promise<Uint8Array> {
    try {
      console.log('Starting APKG generation:', {
        deckCount: decks.length,
        cardCount: cards.length,
        includeSettings: options.includeSettings
      });

      // Validate input data
      this.validateInputData(decks, cards);

    await this.initialize();

    // Create SQLite database
    const db = new this.sqlJs.Database();
    
    // Initialize Anki database schema
    this.initializeAnkiSchema(db);
    
    // Insert decks
    this.insertDecks(db, decks);
    
    // Insert cards and notes
    this.insertCardsAndNotes(db, decks, cards);
    
    // Insert settings if requested
    if (options.includeSettings) {
      this.insertSettings(db);
    }
    
    // Export database to bytes
    const dbBytes = db.export();
    console.log('Database exported, size:', dbBytes.length);
    
    // Compress the database using Zstandard
    console.log('🔧 About to call zstd.compress...');
    console.log('🔧 Zstd object:', zstd);
    console.log('🔧 Zstd.compress function:', typeof zstd.compress);
    console.log('🔧 Input data type:', typeof dbBytes, 'Length:', dbBytes.length);
    
    let compressedDb: Uint8Array;
    try {
      compressedDb = zstd.compress(dbBytes);
      console.log('🔧 ✅ Database compressed successfully, size:', compressedDb.length);
    } catch (compressError) {
      console.error('🔧 ❌ Zstd compression failed:', compressError);
      console.error('🔧 ❌ Compression error details:', {
        name: compressError instanceof Error ? compressError.name : 'Unknown',
        message: compressError instanceof Error ? compressError.message : 'Unknown error',
        stack: compressError instanceof Error ? compressError.stack : 'No stack trace'
      });
      throw compressError;
    }
    
    // Create ZIP file
    const zip = new JSZip();
      // Use .anki21b extension for Zstd compressed files
    zip.file('collection.anki21b', compressedDb);
    
    // Generate ZIP file
      const zipData = await zip.generateAsync({ 
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      console.log('APKG generation completed, final size:', zipData.length);
      return zipData;
    } catch (error) {
      console.error('APKG generation failed:', error);
      throw new Error(`Failed to generate APKG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateInputData(decks: Deck[], cards: Card[]): void {
    if (!decks || decks.length === 0) {
      throw new Error('No decks provided for APKG generation');
    }

    if (!cards || cards.length === 0) {
      throw new Error('No cards provided for APKG generation');
    }

    // Validate deck structure
    for (const deck of decks) {
      if (!deck.id || !deck.name) {
        throw new Error('Invalid deck: missing id or name');
      }
    }

    // Validate card structure
    for (const card of cards) {
      if (!card.id || !card.deckId || !card.front || !card.back) {
        throw new Error('Invalid card: missing required fields (id, deckId, front, back)');
      }
    }

    // Check that all cards belong to valid decks
    const deckIds = new Set(decks.map(d => d.id));
    const invalidCards = cards.filter(c => !deckIds.has(c.deckId));
    if (invalidCards.length > 0) {
      throw new Error(`Found ${invalidCards.length} cards with invalid deck IDs`);
    }
  }

  private initializeAnkiSchema(db: any) {
    // Create the main tables that Anki expects
    const schema = `
      -- Decks table
      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        mtime_secs INTEGER NOT NULL,
        usn INTEGER NOT NULL,
        config TEXT,
        desc TEXT
      );

      -- Notes table
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY,
        guid TEXT NOT NULL UNIQUE,
        mid INTEGER NOT NULL,
        mod INTEGER NOT NULL,
        usn INTEGER NOT NULL,
        tags TEXT,
        flds TEXT NOT NULL,
        sfld INTEGER NOT NULL,
        csum INTEGER NOT NULL,
        flags INTEGER NOT NULL,
        data TEXT
      );

      -- Cards table
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY,
        nid INTEGER NOT NULL,
        did INTEGER NOT NULL,
        ord INTEGER NOT NULL,
        mod INTEGER NOT NULL,
        usn INTEGER NOT NULL,
        type INTEGER NOT NULL,
        queue INTEGER NOT NULL,
        due INTEGER NOT NULL,
        ivl INTEGER NOT NULL,
        factor REAL NOT NULL,
        reps INTEGER NOT NULL,
        lapses INTEGER NOT NULL,
        left INTEGER NOT NULL,
        odue INTEGER NOT NULL,
        odid INTEGER NOT NULL,
        flags INTEGER NOT NULL,
        data TEXT
      );

      -- Models table (card templates)
      CREATE TABLE IF NOT EXISTS col (
        id INTEGER PRIMARY KEY,
        crt INTEGER NOT NULL,
        mod INTEGER NOT NULL,
        scm INTEGER NOT NULL,
        ver INTEGER NOT NULL,
        dty INTEGER NOT NULL,
        usn INTEGER NOT NULL,
        ls INTEGER NOT NULL,
        conf TEXT,
        models TEXT,
        decks TEXT,
        dconf TEXT,
        tags TEXT
      );

      -- Insert default collection data
      INSERT OR REPLACE INTO col VALUES (
        1, -- id
        ${Math.floor(Date.now() / 1000)}, -- crt (creation time)
        ${Math.floor(Date.now() / 1000)}, -- mod (modification time)
        ${Math.floor(Date.now() / 1000)}, -- scm (schema modification time)
        11, -- ver (version)
        0, -- dty (dirty flag)
        0, -- usn (update sequence number)
        0, -- ls (last sync)
        '{}', -- conf (configuration)
        '{}', -- models (card templates)
        '{}', -- decks (deck configuration)
        '{}', -- dconf (deck configuration)
        '{}' -- tags
      );
    `;

    db.exec(schema);
  }

  private insertDecks(db: any, decks: Deck[]) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO decks (id, name, mtime_secs, usn, config, desc)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < decks.length; i++) {
      const deck = decks[i];
      const deckId = i + 1; // Use numeric ID for SQLite
      const config = JSON.stringify({
        new: { perDay: 20, delays: [1, 10] },
        rev: { perDay: 200, fuzz: 0.1, ivlFct: 1, maxIvl: 36500, ease4: 1.3, bury: true },
        lapse: { leechFails: 8, delays: [10], leechAction: 0 },
        dyn: false,
        autoplay: true,
        timer: 0,
        replayq: true,
        mod: 0
      });

      stmt.run([
        deckId,
        deck.name,
        Math.floor(deck.updatedAt.getTime() / 1000),
        0, // usn
        config,
        deck.description || ''
      ]);
    }

    stmt.free();
  }

  private insertCardsAndNotes(db: any, decks: Deck[], cards: Card[]) {
    // Create multiple models for different card types
    const basicModelId = 1;
    const clozeModelId = 2;
    
    this.insertBasicModel(db, basicModelId);
    this.insertClozeModel(db, clozeModelId);

    // Create deck ID mapping
    const deckIdMap = new Map<string, number>();
    decks.forEach((deck, index) => {
      deckIdMap.set(deck.id, index + 1);
    });

    const noteStmt = db.prepare(`
      INSERT OR REPLACE INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const cardStmt = db.prepare(`
      INSERT OR REPLACE INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    console.log(`Inserting ${cards.length} cards and notes`);

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const noteId = i + 1; // Use numeric ID for SQLite
      const cardId = i + 1; // Use numeric ID for SQLite
      const deckId = deckIdMap.get(card.deckId) || 1; // Use mapped deck ID
      
      // Determine if this is a cloze deletion card
      const isCloze = this.isClozeCard(card);
      const modelId = isCloze ? clozeModelId : basicModelId;
      
      // Create note with appropriate fields
      const fields = this.createNoteFields(card, isCloze);
      const sortField = this.getSortField(card, isCloze);
      const checksum = this.calculateChecksum(sortField);
      
      console.log(`Creating note for card ${card.id}:`, {
        isCloze,
        modelId,
        fields: fields.substring(0, 100),
        sortField: sortField.substring(0, 50)
      });
      
      noteStmt.run([
        noteId,
        this.generateGuid(),
        modelId,
        Math.floor(card.updatedAt.getTime() / 1000),
        0, // usn
        '', // tags
        fields,
        sortField,
        checksum,
        0, // flags
        '' // data
      ]);

      // Create card(s) - cloze cards might have multiple cards per note
      const cardTemplates = this.getCardTemplates(card, isCloze);
      
      for (let j = 0; j < cardTemplates.length; j++) {
        const template = cardTemplates[j];
      const due = this.calculateDue(card);
      const interval = Math.max(1, card.interval);
      
      cardStmt.run([
          cardId + j, // Unique card ID (numeric)
        noteId,
        deckId,
          j, // ord (card template order)
        Math.floor(card.updatedAt.getTime() / 1000),
        0, // usn
        0, // type (0 = new, 1 = learning, 2 = review, 3 = relearning)
        this.calculateQueue(card),
        due,
        interval,
        card.easeFactor,
        card.repetitions,
        0, // lapses
        0, // left
        0, // odue
        0, // odid
        0, // flags
        '' // data
      ]);
      }
    }

    noteStmt.free();
    cardStmt.free();
  }

  private isClozeCard(card: Card): boolean {
    // Check if the card contains cloze deletion syntax {{c1::text}}
    return /{{c\d+::[^}]+}}/.test(card.front) || /{{c\d+::[^}]+}}/.test(card.back);
  }

  private createNoteFields(card: Card, isCloze: boolean): string {
    if (isCloze) {
      // For cloze cards, use the front as the text field
      return `${card.front}\x1f${card.back || ''}`;
    } else {
      // For basic cards, use front and back
      return `${card.front}\x1f${card.back}`;
    }
  }

  private getSortField(card: Card, isCloze: boolean): string {
    if (isCloze) {
      // For cloze cards, use the text without cloze markers
      return card.front.replace(/{{c\d+::([^}]+)}}/g, '$1');
    } else {
      // For basic cards, use the front
      return card.front;
    }
  }

  private getCardTemplates(card: Card, isCloze: boolean): any[] {
    if (isCloze) {
      // Extract cloze numbers and create templates for each
      const clozeMatches = card.front.match(/{{c(\d+)::[^}]+}}/g);
      if (clozeMatches) {
        const clozeNumbers = [...new Set(clozeMatches.map(m => {
          const match = m.match(/{{c(\d+)::/);
          return match ? parseInt(match[1]) : 1;
        }))];
        return clozeNumbers.map(num => ({ clozeNumber: num }));
      }
      return [{ clozeNumber: 1 }]; // Default to c1
    } else {
      // Basic card has one template
      return [{}];
    }
  }

  private insertBasicModel(db: any, modelId: number) {
    const model = {
      id: modelId,
      name: 'Basic',
      type: 0,
      mod: Math.floor(Date.now() / 1000),
      usn: 0,
      sortf: 0,
      did: 1,
      tmpls: [{
        name: 'Card 1',
        ord: 0,
        qfmt: '{{Front}}',
        afmt: '{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}',
        did: null,
        bqfmt: '',
        bafmt: ''
      }],
      req: [[[0, 'all', [0]]]],
      flds: [
        {
          name: 'Front',
          ord: 0,
          sticky: false,
          rtl: false,
          font: 'Arial',
          size: 20,
          media: []
        },
        {
          name: 'Back',
          ord: 1,
          sticky: false,
          rtl: false,
          font: 'Arial',
          size: 20,
          media: []
        }
      ],
      css: '.card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}\n',
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
      latexPost: '\\end{document}',
      latexsvg: false,
      vers: []
    };

    this.insertModelIntoCollection(db, modelId, model);
  }

  private insertClozeModel(db: any, modelId: number) {
    const model = {
      id: modelId,
      name: 'Cloze',
      type: 1, // Cloze type
      mod: Math.floor(Date.now() / 1000),
      usn: 0,
      sortf: 0,
      did: 1,
      tmpls: [{
        name: 'Cloze',
        ord: 0,
        qfmt: '{{cloze:Text}}',
        afmt: '{{cloze:Text}}<br><br>{{Extra}}',
        did: null,
        bqfmt: '',
        bafmt: ''
      }],
      req: [[[0, 'all', [0]]]],
      flds: [
        {
          name: 'Text',
          ord: 0,
          sticky: false,
          rtl: false,
          font: 'Arial',
          size: 20,
          media: []
        },
        {
          name: 'Extra',
          ord: 1,
          sticky: false,
          rtl: false,
          font: 'Arial',
          size: 20,
          media: []
        }
      ],
      css: '.card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}\n\n.cloze {\n font-weight: bold;\n color: blue;\n}',
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
      latexPost: '\\end{document}',
      latexsvg: false,
      vers: []
    };

    this.insertModelIntoCollection(db, modelId, model);
  }

  private insertModelIntoCollection(db: any, modelId: number, model: any) {
    // Get existing models
    const colResult = db.exec("SELECT models FROM col WHERE id = 1");
    let models = {};
    
    if (colResult.length > 0 && colResult[0].values.length > 0) {
      try {
        models = JSON.parse(colResult[0].values[0][0] as string) || {};
      } catch (e) {
        console.warn('Could not parse existing models, starting fresh');
        models = {};
      }
    }
    
    // Add the new model
    (models as any)[modelId] = model;
    
    // Update the col table with all models
    const colStmt = db.prepare('UPDATE col SET models = ? WHERE id = 1');
    colStmt.run([JSON.stringify(models)]);
    colStmt.free();
    
    console.log(`Inserted model ${modelId} (${model.name})`);
  }

  private insertSettings(db: any) {
    const settings = {
      nextPos: 1,
      estTimes: true,
      activeDecks: [1],
      curDeck: 1,
      newBury: true,
      timeLim: 0,
      newSpread: 0,
      dueCounts: true,
      curModel: 1,
      collapseTime: 1200,
      addToCur: true,
      dayLearnFirst: false,
      newMix: 0,
      learnCutoff: 20,
      leechFails: 8,
      disp: 0,
      maxTaken: 60,
      newSort: 0,
      newPerDayMinimum: 0
    };

    const stmt = db.prepare('UPDATE col SET conf = ? WHERE id = 1');
    stmt.run([JSON.stringify(settings)]);
    stmt.free();
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private calculateChecksum(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private calculateDue(card: Card): number {
    // Convert our SRS data to Anki's due system
    if (card.repetitions === 0) {
      return 0; // New card
    }
    
    const now = Date.now();
    const daysSinceLastReview = Math.floor((now - card.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysSinceLastReview + card.interval);
  }

  private calculateQueue(card: Card): number {
    // 0 = new, 1 = learning, 2 = review, 3 = relearning
    if (card.repetitions === 0) {
      return 0; // New
    } else if (card.interval < 1) {
      return 1; // Learning
    } else {
      return 2; // Review
    }
  }
}

// Create singleton instances
export const apkgParser = new APKGParser();
export const apkgGenerator = new APKGGenerator();
