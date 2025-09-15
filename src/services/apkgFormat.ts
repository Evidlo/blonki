import JSZip from 'jszip';
import { decompress } from 'fzstd';
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
  async parseAPKG(arrayBuffer: ArrayBuffer): Promise<APKGData> {
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
    // Anki stores fields separated by Unicode unit separator (U+001F)
    const unitSeparator = '\x1F';
    
    // Try Unicode unit separator first (most common in Anki)
    if (fieldsData.includes(unitSeparator)) {
      const fields = fieldsData.split(unitSeparator);
      return fields.map(field => this.cleanField(field));
    }
    
    // Fallback to pipe-separated (older Anki versions)
    if (fieldsData.includes('|')) {
      const fields = fieldsData.split('|');
      return fields.map(field => this.cleanField(field));
    }
    
    // Try JSON format (some newer Anki versions)
    try {
      const parsed = JSON.parse(fieldsData);
      if (Array.isArray(parsed)) {
        return parsed.map(field => this.cleanField(field));
      }
    } catch (e) {
      // Not JSON format
    }
    
    // Single field
    return [this.cleanField(fieldsData)];
  }

  private cleanField(field: string): string {
    if (!field) return '';
    
    // Remove SQL escaping and quotes
    return field
      .replace(/^'|'$/g, '') // Remove surrounding quotes
      .replace(/''/g, "'") // Unescape single quotes
      .replace(/\\n/g, '\n') // Unescape newlines
      .replace(/\\t/g, '\t') // Unescape tabs
      .replace(/\\r/g, '\r') // Unescape carriage returns
      .replace(/\\\\/g, '\\') // Unescape backslashes
      .trim();
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

// APKG Generator - for creating APKG files
export class APKGGenerator {
  private sqlJs: any = null;

  async initialize() {
    if (!this.sqlJs) {
      this.sqlJs = await initSqlJs();
    }
  }

  async generateAPKG(decks: Deck[], cards: Card[], options: APKGGenerationOptions = {}): Promise<Uint8Array> {
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
    
    // For now, we'll skip compression since fzstd is commented out
    // TODO: Re-enable compression when fzstd is available
    // const compressedDb = compress(dbBytes);
    const compressedDb = dbBytes;
    
    // Create ZIP file
    const zip = new JSZip();
    zip.file('collection.anki21b', compressedDb);
    
    // Generate ZIP file
    return await zip.generateAsync({ type: 'uint8array' });
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

    for (const deck of decks) {
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
        deck.id,
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
    // Create a basic model for front/back cards
    const modelId = 1;
    this.insertModel(db, modelId);

    const noteStmt = db.prepare(`
      INSERT OR REPLACE INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const cardStmt = db.prepare(`
      INSERT OR REPLACE INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const card of cards) {
      const noteId = card.id;
      const cardId = card.id;
      const deckId = card.deckId;
      
      // Create note
      const fields = `${card.front}\x1f${card.back}`;
      const sortField = card.front;
      const checksum = this.calculateChecksum(sortField);
      
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

      // Create card
      const due = this.calculateDue(card);
      const interval = Math.max(1, card.interval);
      
      cardStmt.run([
        cardId,
        noteId,
        deckId,
        0, // ord (card template order)
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

    noteStmt.free();
    cardStmt.free();
  }

  private insertModel(db: any, modelId: number) {
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

    // Update the col table with the model
    const colStmt = db.prepare('UPDATE col SET models = ? WHERE id = 1');
    colStmt.run([JSON.stringify({ [modelId]: model })]);
    colStmt.free();
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
