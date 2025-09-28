import { describe, it, expect, beforeEach } from 'vitest';
import { APKGParser, APKGGenerator } from '../apkgFormat';
import type { Deck, Card } from '../../types';

// Mock data for testing
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
    front: 'The capital of {{c1::France}} is {{c2::Paris}}',
    back: 'This is a cloze deletion card',
    deckId: '1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    interval: 1,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: new Date('2024-01-01')
  }
];

describe('APKGParser', () => {
  let parser: APKGParser;

  beforeEach(() => {
    parser = new APKGParser();
  });

  describe('parseFieldsString', () => {
    it('should parse fields separated by unit separator', () => {
      const fieldsData = 'Front content\x1fBack content';
      const result = (parser as any).parseFieldsString(fieldsData);
      expect(result).toEqual(['Front content', 'Back content']);
    });

    it('should parse fields separated by pipe', () => {
      const fieldsData = 'Front content|Back content';
      const result = (parser as any).parseFieldsString(fieldsData);
      expect(result).toEqual(['Front content', 'Back content']);
    });

    it('should parse fields separated by comma', () => {
      const fieldsData = 'Front content,Back content';
      const result = (parser as any).parseFieldsString(fieldsData);
      expect(result).toEqual(['Front content', 'Back content']);
    });

    it('should handle single field', () => {
      const fieldsData = 'Single field content';
      const result = (parser as any).parseFieldsString(fieldsData);
      expect(result).toEqual(['Single field content', '']);
    });

    it('should handle empty or invalid data', () => {
      const result1 = (parser as any).parseFieldsString('');
      expect(result1).toEqual(['', '']);

      const result2 = (parser as any).parseFieldsString(null as any);
      expect(result2).toEqual(['', '']);
    });
  });

  describe('cleanField', () => {
    it('should remove SQL escaping and quotes', () => {
      const field = "'Escaped \\'quotes\\' and \\n newlines'";
      const result = (parser as any).cleanField(field);
      expect(result).toBe("Escaped 'quotes' and \n newlines");
    });

    it('should handle null and undefined values', () => {
      expect((parser as any).cleanField('null')).toBe('');
      expect((parser as any).cleanField('undefined')).toBe('');
      expect((parser as any).cleanField('')).toBe('');
    });
  });

  describe('cleanHtml', () => {
    it('should decode HTML entities', () => {
      const html = '&lt;b&gt;Hello&lt;/b&gt; &amp; &quot;world&quot;';
      const result = (parser as any).cleanHtml(html);
      expect(result).toBe('Hello & "world"'); // HTML tags are removed in cleanHtml
    });

    it('should preserve line breaks from HTML tags', () => {
      const html = '<p>First paragraph</p><br><div>Second paragraph</div>';
      const result = (parser as any).cleanHtml(html);
      expect(result).toBe('First paragraph\nSecond paragraph'); // Multiple newlines are normalized
    });

    it('should handle numeric entities', () => {
      const html = '&#65; &#x42; &#x43;';
      const result = (parser as any).cleanHtml(html);
      expect(result).toBe('A B C');
    });
  });
});

describe('APKGGenerator', () => {
  let generator: APKGGenerator;

  beforeEach(() => {
    generator = new APKGGenerator();
  });

  describe('validateInputData', () => {
    it('should validate valid input data', () => {
      expect(() => {
        (generator as any).validateInputData([mockDeck], mockCards);
      }).not.toThrow();
    });

    it('should throw error for empty decks', () => {
      expect(() => {
        (generator as any).validateInputData([], mockCards);
      }).toThrow('No decks provided for APKG generation');
    });

    it('should throw error for empty cards', () => {
      expect(() => {
        (generator as any).validateInputData([mockDeck], []);
      }).toThrow('No cards provided for APKG generation');
    });

    it('should throw error for invalid deck structure', () => {
      const invalidDeck = { ...mockDeck, id: '' };
      expect(() => {
        (generator as any).validateInputData([invalidDeck], mockCards);
      }).toThrow('Invalid deck: missing id or name');
    });

    it('should throw error for invalid card structure', () => {
      const invalidCard = { ...mockCards[0], front: '' };
      expect(() => {
        (generator as any).validateInputData([mockDeck], [invalidCard]);
      }).toThrow('Invalid card: missing required fields');
    });

    it('should throw error for cards with invalid deck IDs', () => {
      const invalidCard = { ...mockCards[0], deckId: '999' };
      expect(() => {
        (generator as any).validateInputData([mockDeck], [invalidCard]);
      }).toThrow('Found 1 cards with invalid deck IDs');
    });
  });

  describe('isClozeCard', () => {
    it('should identify cloze cards', () => {
      const clozeCard = { ...mockCards[0], front: 'The capital of {{c1::France}} is Paris' };
      const result = (generator as any).isClozeCard(clozeCard);
      expect(result).toBe(true);
    });

    it('should identify non-cloze cards', () => {
      const result = (generator as any).isClozeCard(mockCards[0]);
      expect(result).toBe(false);
    });
  });

  describe('createNoteFields', () => {
    it('should create fields for basic cards', () => {
      const result = (generator as any).createNoteFields(mockCards[0], false);
      expect(result).toBe('What is the capital of France?\x1fParis');
    });

    it('should create fields for cloze cards', () => {
      const clozeCard = { ...mockCards[0], front: 'The capital of {{c1::France}} is Paris' };
      const result = (generator as any).createNoteFields(clozeCard, true);
      expect(result).toBe('The capital of {{c1::France}} is Paris\x1fParis');
    });
  });

  describe('getSortField', () => {
    it('should return front for basic cards', () => {
      const result = (generator as any).getSortField(mockCards[0], false);
      expect(result).toBe('What is the capital of France?');
    });

    it('should remove cloze markers for cloze cards', () => {
      const clozeCard = { ...mockCards[0], front: 'The capital of {{c1::France}} is Paris' };
      const result = (generator as any).getSortField(clozeCard, true);
      expect(result).toBe('The capital of France is Paris');
    });
  });

  describe('getCardTemplates', () => {
    it('should return single template for basic cards', () => {
      const result = (generator as any).getCardTemplates(mockCards[0], false);
      expect(result).toEqual([{}]);
    });

    it('should return multiple templates for cloze cards', () => {
      const clozeCard = { ...mockCards[0], front: 'The capital of {{c1::France}} is {{c2::Paris}}' };
      const result = (generator as any).getCardTemplates(clozeCard, true);
      expect(result).toEqual([{ clozeNumber: 1 }, { clozeNumber: 2 }]);
    });

    it('should handle single cloze deletion', () => {
      const clozeCard = { ...mockCards[0], front: 'The capital of {{c1::France}} is Paris' };
      const result = (generator as any).getCardTemplates(clozeCard, true);
      expect(result).toEqual([{ clozeNumber: 1 }]);
    });
  });

  describe('generateAPKG', () => {
    it('should generate APKG data successfully', async () => {
      const result = await generator.generateAPKG([mockDeck], mockCards);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid input', async () => {
      await expect(generator.generateAPKG([], mockCards)).rejects.toThrow();
    });
  });
});

describe('Integration Tests', () => {
  it('should round-trip basic cards through APKG generation and parsing', async () => {
    const generator = new APKGGenerator();
    const parser = new APKGParser();

    // Generate APKG
    const apkgData = await generator.generateAPKG([mockDeck], [mockCards[0]]);
    
    // Parse APKG
    const parsedData = await parser.parseAPKG(apkgData.buffer, 'test.apkg');
    
    expect(parsedData.decks).toHaveLength(1);
    expect(parsedData.cards).toHaveLength(1);
    expect(parsedData.decks[0].name).toBe('test'); // Should use filename
    expect(parsedData.cards[0].front).toContain('capital of France');
  });
});
