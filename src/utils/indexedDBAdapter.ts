import type { StorageAdapter, Deck, Card, Settings, ReviewResult } from '../types';

// IndexedDB implementation for large data and file handles
export class IndexedDBAdapter implements StorageAdapter {
  private dbName = 'blonki_db';
  private version = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDB();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('decks')) {
          db.createObjectStore('decks', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('reviewResults')) {
          db.createObjectStore('reviewResults', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('fileHandles')) {
          db.createObjectStore('fileHandles', { keyPath: 'deckId' });
        }
        
        console.log('IndexedDB schema created');
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initializeDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  // StorageAdapter interface implementation
  async saveDecks(decks: Deck[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['decks'], 'readwrite');
    const store = transaction.objectStore('decks');
    
    // Clear existing decks and save new ones
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        let completed = 0;
        if (decks.length === 0) {
          resolve();
          return;
        }
        
        decks.forEach(deck => {
          const request = store.add(deck);
          request.onsuccess = () => {
            completed++;
            if (completed === decks.length) {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async loadDecks(): Promise<Deck[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['decks'], 'readonly');
    const store = transaction.objectStore('decks');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const decks = request.result.map(deck => ({
          ...deck,
          createdAt: new Date(deck.createdAt),
          updatedAt: new Date(deck.updatedAt)
        }));
        resolve(decks);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveCards(cards: Card[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cards'], 'readwrite');
    const store = transaction.objectStore('cards');
    
    // Clear existing cards and save new ones
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        let completed = 0;
        if (cards.length === 0) {
          resolve();
          return;
        }
        
        cards.forEach(card => {
          const request = store.add(card);
          request.onsuccess = () => {
            completed++;
            if (completed === cards.length) {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async loadCards(): Promise<Card[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cards'], 'readonly');
    const store = transaction.objectStore('cards');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const cards = request.result.map(card => ({
          ...card,
          createdAt: new Date(card.createdAt),
          updatedAt: new Date(card.updatedAt),
          dueDate: new Date(card.dueDate),
          lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : undefined
        }));
        resolve(cards);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveReviewResults(results: ReviewResult[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['reviewResults'], 'readwrite');
    const store = transaction.objectStore('reviewResults');
    
    // Clear existing results and save new ones
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        let completed = 0;
        if (results.length === 0) {
          resolve();
          return;
        }
        
        results.forEach(result => {
          const request = store.add(result);
          request.onsuccess = () => {
            completed++;
            if (completed === results.length) {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async loadReviewResults(): Promise<ReviewResult[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['reviewResults'], 'readonly');
    const store = transaction.objectStore('reviewResults');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.map(result => ({
          ...result,
          timestamp: new Date(result.timestamp)
        }));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Settings are handled by localStorage adapter
  async saveSettings(settings: Settings): Promise<void> {
    throw new Error('Settings should be saved using LocalStorageAdapter');
  }

  async loadSettings(): Promise<Settings> {
    throw new Error('Settings should be loaded using LocalStorageAdapter');
  }

  // File handle management
  async storeFileHandle(deckId: string, fileHandle: FileSystemFileHandle): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['fileHandles'], 'readwrite');
    const store = transaction.objectStore('fileHandles');
    
    return new Promise((resolve, reject) => {
      const request = store.put({ deckId, fileHandle });
      request.onsuccess = () => {
        console.log(`Stored file handle for deck: ${deckId}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async loadFileHandle(deckId: string): Promise<FileSystemFileHandle | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['fileHandles'], 'readonly');
    const store = transaction.objectStore('fileHandles');
    
    return new Promise((resolve, reject) => {
      const request = store.get(deckId);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.fileHandle) {
          // Verify the handle is still valid
          result.fileHandle.getFile()
            .then(() => {
              console.log(`Loaded valid file handle for deck: ${deckId}`);
              resolve(result.fileHandle);
            })
            .catch(() => {
              console.log(`File handle no longer valid for deck: ${deckId}`);
              // Remove invalid handle
              this.removeFileHandle(deckId);
              resolve(null);
            });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeFileHandle(deckId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['fileHandles'], 'readwrite');
    const store = transaction.objectStore('fileHandles');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(deckId);
      request.onsuccess = () => {
        console.log(`Removed file handle for deck: ${deckId}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFileHandles(): Promise<Map<string, FileSystemFileHandle>> {
    const db = await this.ensureDB();
    const transaction = db.transaction(['fileHandles'], 'readonly');
    const store = transaction.objectStore('fileHandles');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const fileHandles = new Map<string, FileSystemFileHandle>();
        const results = request.result;
        
        let processed = 0;
        if (results.length === 0) {
          resolve(fileHandles);
          return;
        }
        
        results.forEach(result => {
          if (result && result.fileHandle) {
            result.fileHandle.getFile()
              .then(() => {
                fileHandles.set(result.deckId, result.fileHandle);
                processed++;
                if (processed === results.length) {
                  resolve(fileHandles);
                }
              })
              .catch(() => {
                console.log(`File handle no longer valid for deck: ${result.deckId}`);
                this.removeFileHandle(result.deckId);
                processed++;
                if (processed === results.length) {
                  resolve(fileHandles);
                }
              });
          } else {
            processed++;
            if (processed === results.length) {
              resolve(fileHandles);
            }
          }
        });
      };
      request.onerror = () => reject(request.error);
    });
  }
}
