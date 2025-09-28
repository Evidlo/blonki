import { sm2, SuperMemoQuality, SuperMemoItemDefaults } from '@dtjv/sm-2';
import type { SuperMemoItem } from '@dtjv/sm-2';
import type { Card } from '../types';

// Adapter to convert between our Card type and SM-2 library format
export class SM2Adapter {
  /**
   * Convert our Card type to SM-2 SuperMemoItem format
   */
  static cardToSuperMemoItem(card: Card): SuperMemoItem {
    return {
      rep: card.repetitions,
      repInterval: card.interval,
      easyFactor: card.easeFactor
    };
  }

  /**
   * Convert SM-2 SuperMemoItem back to our Card format
   */
  static superMemoItemToCard(smItem: SuperMemoItem, originalCard: Card): Partial<Card> {
    const now = new Date();
    console.log('SM2Adapter - superMemoItemToCard - smItem:', smItem, 'repInterval:', smItem.repInterval);
    
    // The SM-2 library returns repInterval in days, so we multiply by milliseconds per day
    const newDueDate = new Date(now.getTime() + smItem.repInterval * 24 * 60 * 60 * 1000);
    console.log('SM2Adapter - newDueDate:', newDueDate, 'isValid:', !isNaN(newDueDate.getTime()));
    
    return {
      repetitions: smItem.rep,
      interval: smItem.repInterval,
      easeFactor: smItem.easyFactor,
      dueDate: newDueDate,
      lastReviewed: now
    };
  }

  /**
   * Convert quality grade (1-4) to SuperMemoQuality
   */
  static qualityToSuperMemo(quality: 1 | 2 | 3 | 4): SuperMemoQuality {
    switch (quality) {
      case 1: return SuperMemoQuality.FAIL_WITH_TOTAL_BLACKOUT;
      case 2: return SuperMemoQuality.FAIL_BUT_FAMILIAR;
      case 3: return SuperMemoQuality.PASS_WITH_DIFFICULTY;
      case 4: return SuperMemoQuality.PASS_WITH_PERFECT_RECALL;
      default: return SuperMemoQuality.PASS_WITH_DIFFICULTY;
    }
  }

  /**
   * Convert response type to SuperMemoQuality (legacy support)
   */
  static responseToQuality(response: 'correct' | 'incorrect'): SuperMemoQuality {
    return response === 'correct' 
      ? SuperMemoQuality.PASS_WITH_PERFECT_RECALL 
      : SuperMemoQuality.FAIL_WITH_TOTAL_BLACKOUT;
  }

  /**
   * Calculate new SRS values using SM-2 algorithm with quality grade
   */
  static calculateNewSRSValuesWithQuality(card: Card, quality: 1 | 2 | 3 | 4): Partial<Card> {
    console.log('SM2Adapter - calculateNewSRSValuesWithQuality - card:', card, 'quality:', quality);
    
    // Convert our card to SM-2 format
    const smItem = this.cardToSuperMemoItem(card);
    console.log('SM2Adapter - smItem:', smItem);
    
    // Add default values for any missing fields
    const smItemWithDefaults = {
      ...SuperMemoItemDefaults,
      ...smItem
    };
    console.log('SM2Adapter - smItemWithDefaults:', smItemWithDefaults);
    
    // Convert quality to SuperMemo quality grade
    const superMemoQuality = this.qualityToSuperMemo(quality);
    console.log('SM2Adapter - superMemoQuality:', superMemoQuality);
    
    // Calculate new values using SM-2
    const newSmItem = sm2(smItemWithDefaults, superMemoQuality);
    console.log('SM2Adapter - newSmItem:', newSmItem);
    
    // Convert back to our Card format
    const result = this.superMemoItemToCard(newSmItem, card);
    console.log('SM2Adapter - result:', result);
    return result;
  }

  /**
   * Calculate new SRS values using SM-2 algorithm (legacy support)
   */
  static calculateNewSRSValues(card: Card, response: 'correct' | 'incorrect'): Partial<Card> {
    // Convert our card to SM-2 format
    const smItem = this.cardToSuperMemoItem(card);
    
    // Add default values for any missing fields
    const smItemWithDefaults = {
      ...SuperMemoItemDefaults,
      ...smItem
    };
    
    // Convert response to quality grade
    const quality = this.responseToQuality(response);
    
    // Calculate new values using SM-2
    const newSmItem = sm2(smItemWithDefaults, quality);
    
    // Convert back to our Card format
    return this.superMemoItemToCard(newSmItem, card);
  }

  /**
   * Get card status for New/Learn/Due counts
   */
  static getCardStatus(card: Card): 'new' | 'learning' | 'due' | 'reviewed' {
    const now = new Date();
    const isDue = card.dueDate <= now;
    const isNew = card.repetitions === 0;
    const isLearning = card.repetitions > 0 && card.repetitions < 3;
    
    if (isNew) return 'new';
    if (isLearning) return 'learning';
    if (isDue) return 'due';
    return 'reviewed';
  }

  /**
   * Count cards by status in a deck
   */
  static countCardsByStatus(cards: Card[]): { new: number; learning: number; due: number } {
    const counts = { new: 0, learning: 0, due: 0 };
    
    for (const card of cards) {
      const status = this.getCardStatus(card);
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    }
    
    return counts;
  }

  /**
   * Get cards that are due for review (due + learning + new)
   */
  static getDueCards(cards: Card[]): Card[] {
    return cards.filter(card => {
      const status = this.getCardStatus(card);
      return status === 'due' || status === 'learning' || status === 'new';
    });
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get study cards for a session (due cards, shuffled, limited)
   */
  static getStudyCards(cards: Card[], limit: number = 50): Card[] {
    const dueCards = this.getDueCards(cards);
    const shuffled = this.shuffleArray(dueCards);
    return shuffled.slice(0, limit);
  }
}
