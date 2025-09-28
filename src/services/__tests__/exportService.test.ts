import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportService } from '../exportService';
import { deckStore, cardStore } from '../../stores/deckStore';
import { cardStore as cardStoreModule } from '../../stores/cardStore';
import type { Deck, Card } from '../../types';

// Mock the stores
vi.mock('../../stores/deckStore', () => ({
  deckStore: {
    subscribe: vi.fn(),
    set: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock('../../stores/cardStore', () => ({
  cardStore: {
    subscribe: vi.fn(),
    set: vi.fn(),
    update: vi.fn()
  }
}));

// Mock the APKGGenerator
vi.mock('../apkgFormat', () => ({
  APKGGenerator: vi.fn().mockImplementation(() => ({
    generateAPKG: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5]))
  }))
}));

// Mock DOM methods
const mockLink = {
  href: '',
  download: '',
  click: vi.fn()
};

global.document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'a') {
    return mockLink;
  }
  return {} as any;
});

global.document.body = {
  appendChild: vi.fn(),
  removeChild: vi.fn()
} as any;

global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('ExportService', () => {
  const mockDeck: Deck = {
    id: '1',
    name: 'Test Deck',
    description: 'A test deck',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    cardCount: 2,
    isLinkedToFile: false
  };

  const mockCards: Card[] = [
    {
      id: '1',
      front: 'What is the capital of France?',
      back: 'Paris',
      deckId: '1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      dueDate: new Date('2024-01-01')
    },
    {
      id: '2',
      front: 'What is the capital of Germany?',
      back: 'Berlin',
      deckId: '1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      dueDate: new Date('2024-01-01')
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock store getters
    vi.mocked(deckStore.subscribe).mockImplementation((fn) => {
      fn([mockDeck]);
      return () => {};
    });
    
    vi.mocked(cardStoreModule.subscribe).mockImplementation((fn) => {
      fn(mockCards);
      return () => {};
    });
  });

  describe('exportData', () => {
    it('should export single deck as APKG', async () => {
      const result = await exportService.exportData({
        deckIds: ['1'],
        format: 'apkg',
        includeSettings: false
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully exported');
      expect(result.data).toBeInstanceOf(Blob);
      expect(result.filename).toMatch(/\.apkg$/);
    });

    it('should export all decks as APKG', async () => {
      const result = await exportService.exportData({
        format: 'apkg',
        includeSettings: true
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully exported');
      expect(result.data).toBeInstanceOf(Blob);
      expect(result.filename).toMatch(/\.apkg$/);
    });

    it('should throw error for empty decks', async () => {
      vi.mocked(deckStore.subscribe).mockImplementation((fn) => {
        fn([]);
        return () => {};
      });

      const result = await exportService.exportData({
        format: 'apkg',
        includeSettings: false
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No decks selected for export');
    });

    it('should throw error for empty cards', async () => {
      vi.mocked(cardStoreModule.subscribe).mockImplementation((fn) => {
        fn([]);
        return () => {};
      });

      const result = await exportService.exportData({
        deckIds: ['1'],
        format: 'apkg',
        includeSettings: false
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No cards to export');
    });
  });

  describe('downloadExport', () => {
    it('should trigger download for successful export', async () => {
      await exportService.downloadExport({
        deckIds: ['1'],
        format: 'apkg',
        includeSettings: false
      });

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(global.document.body.removeChild).toHaveBeenCalledWith(mockLink);
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('should throw error for failed export', async () => {
      vi.mocked(deckStore.subscribe).mockImplementation((fn) => {
        fn([]);
        return () => {};
      });

      await expect(exportService.downloadExport({
        format: 'apkg',
        includeSettings: false
      })).rejects.toThrow('No decks selected for export');
    });
  });

  describe('exportDeck', () => {
    it('should export single deck with APKG format', async () => {
      await exportService.exportDeck('1');

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toMatch(/\.apkg$/);
    });
  });

  describe('exportAllDecks', () => {
    it('should export all decks with APKG format', async () => {
      await exportService.exportAllDecks();

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toMatch(/\.apkg$/);
    });
  });

  describe('exportSelectedDecks', () => {
    it('should export selected decks with APKG format', async () => {
      await exportService.exportSelectedDecks(['1', '2']);

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toMatch(/\.apkg$/);
    });
  });

  describe('filename generation', () => {
    it('should generate filename with deck name for single deck', async () => {
      const result = await exportService.exportData({
        deckIds: ['1'],
        format: 'apkg',
        includeSettings: false
      });

      expect(result.filename).toMatch(/Test_Deck-.*\.apkg$/);
    });

    it('should generate generic filename for multiple decks', async () => {
      // Mock multiple decks
      vi.mocked(deckStore.subscribe).mockImplementation((fn) => {
        fn([mockDeck, { ...mockDeck, id: '2', name: 'Second Deck' }]);
        return () => {};
      });

      const result = await exportService.exportData({
        format: 'apkg',
        includeSettings: false
      });

      expect(result.filename).toMatch(/blonki-export-.*\.apkg$/);
    });
  });
});
