import type { Card, SRSAlgorithm, Settings } from '../types';

// SM-2 Algorithm implementation
export class SM2Algorithm implements SRSAlgorithm {
  name = 'SM-2';

  calculateNextReview(
    card: Card,
    response: 'correct' | 'incorrect',
    responseTime: number
  ): Partial<Card> {
    const now = new Date();
    
    if (response === 'incorrect') {
      // Reset the card
      return {
        interval: 1,
        repetitions: 0,
        easeFactor: Math.max(1.3, card.easeFactor - 0.2),
        dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day from now
        lastReviewed: now
      };
    }

    // Correct response
    const newRepetitions = card.repetitions + 1;
    let newInterval: number;
    let newEaseFactor = card.easeFactor;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(card.interval * card.easeFactor);
    }

    // Update ease factor based on response time
    const idealResponseTime = 10000; // 10 seconds
    const timeFactor = Math.min(responseTime / idealResponseTime, 2);
    newEaseFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - timeFactor) * (0.08 + (5 - timeFactor) * 0.02)));

    const newDueDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

    return {
      interval: newInterval,
      repetitions: newRepetitions,
      easeFactor: newEaseFactor,
      dueDate: newDueDate,
      lastReviewed: now
    };
  }
}

// SM-17 Algorithm implementation (simplified)
export class SM17Algorithm implements SRSAlgorithm {
  name = 'SM-17';

  calculateNextReview(
    card: Card,
    response: 'correct' | 'incorrect',
    responseTime: number
  ): Partial<Card> {
    const now = new Date();
    
    if (response === 'incorrect') {
      // Reset the card
      return {
        interval: 1,
        repetitions: 0,
        easeFactor: Math.max(1.3, card.easeFactor - 0.2),
        dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 1 day from now
        lastReviewed: now
      };
    }

    // Correct response - simplified SM-17
    const newRepetitions = card.repetitions + 1;
    let newInterval: number;
    let newEaseFactor = card.easeFactor;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      // SM-17 uses a more complex formula, but we'll use a simplified version
      newInterval = Math.round(card.interval * card.easeFactor);
    }

    // Update ease factor with SM-17-like adjustments
    const timeFactor = Math.min(responseTime / 10000, 2);
    const difficulty = Math.max(0, 5 - timeFactor);
    newEaseFactor = Math.max(1.3, card.easeFactor + (0.1 - difficulty * (0.08 + difficulty * 0.02)));

    const newDueDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

    return {
      interval: newInterval,
      repetitions: newRepetitions,
      easeFactor: newEaseFactor,
      dueDate: newDueDate,
      lastReviewed: now
    };
  }
}

// Custom Algorithm implementation (configurable)
export class CustomAlgorithm implements SRSAlgorithm {
  name = 'Custom';
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  calculateNextReview(
    card: Card,
    response: 'correct' | 'incorrect',
    responseTime: number
  ): Partial<Card> {
    const now = new Date();
    
    if (response === 'incorrect') {
      return {
        interval: this.settings.sm2MinInterval,
        repetitions: 0,
        easeFactor: Math.max(1.3, card.easeFactor - 0.2),
        dueDate: new Date(now.getTime() + this.settings.sm2MinInterval * 24 * 60 * 60 * 1000),
        lastReviewed: now
      };
    }

    const newRepetitions = card.repetitions + 1;
    let newInterval: number;
    let newEaseFactor = card.easeFactor;

    if (newRepetitions === 1) {
      newInterval = this.settings.sm2InitialInterval;
    } else if (newRepetitions === 2) {
      newInterval = this.settings.sm2EasyInterval;
    } else {
      newInterval = Math.round(card.interval * card.easeFactor);
      newInterval = Math.max(this.settings.sm2MinInterval, Math.min(newInterval, this.settings.sm2MaxInterval));
    }

    // Update ease factor
    const timeFactor = Math.min(responseTime / 10000, 2);
    newEaseFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - timeFactor) * (0.08 + (5 - timeFactor) * 0.02)));

    const newDueDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

    return {
      interval: newInterval,
      repetitions: newRepetitions,
      easeFactor: newEaseFactor,
      dueDate: newDueDate,
      lastReviewed: now
    };
  }
}

// Algorithm factory
export function createSRSAlgorithm(algorithm: string, settings?: Settings): SRSAlgorithm {
  switch (algorithm) {
    case 'sm2':
      return new SM2Algorithm();
    case 'sm17':
      return new SM17Algorithm();
    case 'custom':
      if (!settings) throw new Error('Settings required for custom algorithm');
      return new CustomAlgorithm(settings);
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`);
  }
}
