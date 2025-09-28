import { get } from 'svelte/store';
import { appStore } from '../stores/appStore';
import { selectedDeckStore } from '../stores/deckStore';
import { currentCardStore } from '../stores/cardStore';
import type { AppState } from '../types';

export interface KeyboardHandler {
  handleKeydown(event: KeyboardEvent): boolean; // Returns true if handled
}

class KeyboardService {
  private handlers: KeyboardHandler[] = [];
  private currentView: AppState['currentView'] = 'learn';
  private selectedDeck: string | null = null;
  private currentCard: any = null;

  constructor() {
    // Subscribe to store changes
    appStore.subscribe(state => {
      this.currentView = state.currentView;
    });
    
    selectedDeckStore.subscribe(deck => {
      this.selectedDeck = deck;
    });
    
    currentCardStore.subscribe(card => {
      this.currentCard = card;
    });
  }

  registerHandler(handler: KeyboardHandler) {
    this.handlers.push(handler);
  }

  unregisterHandler(handler: KeyboardHandler) {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  handleKeydown(event: KeyboardEvent): boolean {
    // Let registered handlers handle the event first
    for (const handler of this.handlers) {
      if (handler.handleKeydown(event)) {
        return true;
      }
    }

    // Global keyboard shortcuts
    return this.handleGlobalShortcuts(event);
  }

  private handleGlobalShortcuts(event: KeyboardEvent): boolean {
    // Prevent shortcuts when typing in input fields
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return false;
    }

    // Tab switching (6-9, 0) - remapped to avoid conflict with quality buttons
    if (event.key === '6' || event.key === '7' || event.key === '8' || event.key === '9' || event.key === '0') {
      const tabIndex = event.key === '0' ? 4 : parseInt(event.key) - 6;
      const tabs: AppState['currentView'][] = ['learn', 'stats', 'settings', 'extras', 'info'];
      
      console.log(`Keyboard shortcut: ${event.key} -> tab ${tabIndex} -> ${tabs[tabIndex]}`);
      
      if (tabIndex < tabs.length) {
        this.switchToTab(tabs[tabIndex]);
        return true;
      }
    }

    // Escape key for simple back navigation
    if (event.key === 'Escape') {
      console.log('Keyboard shortcut: ESC -> simple back navigation');
      this.handleSimpleBackNavigation();
      return true;
    }

    // Space for showing answer or marking correct (only in learn view with a card)
    if (event.key === ' ' && this.currentView === 'learn' && this.currentCard) {
      this.handleCorrectAnswer();
      return true;
    }

    // F for showing answer or marking incorrect (only in learn view with a card)
    if (event.key.toLowerCase() === 'f' && this.currentView === 'learn' && this.currentCard) {
      this.handleIncorrectAnswer();
      return true;
    }

    // Quality buttons (1-4) for SRS responses (only in learn view with a card)
    if (event.key >= '1' && event.key <= '4' && this.currentView === 'learn' && this.currentCard) {
      const quality = parseInt(event.key) as 1 | 2 | 3 | 4;
      this.handleQualityResponse(quality);
      return true;
    }

    return false;
  }

  private switchToTab(tab: AppState['currentView']) {
    const currentState = get(appStore);
    console.log(`switchToTab: ${currentState.currentView} -> ${tab}`);
    if (tab !== currentState.currentView) {
      const newHistory = [...currentState.viewHistory, currentState.currentView];
      appStore.update(state => ({
        ...state,
        currentView: tab,
        viewHistory: newHistory
      }));
      console.log(`Tab switched to: ${tab}`);
    }
  }


  private handleCorrectAnswer() {
    // This will be handled by the LearnView component
    // We'll dispatch a custom event that the component can listen to
    window.dispatchEvent(new CustomEvent('keyboard-correct'));
  }

  private handleIncorrectAnswer() {
    // This will be handled by the LearnView component
    // We'll dispatch a custom event that the component can listen to
    window.dispatchEvent(new CustomEvent('keyboard-incorrect'));
  }

  private handleQualityResponse(quality: 1 | 2 | 3 | 4) {
    // This will be handled by the LearnView component
    // We'll dispatch a custom event that the component can listen to
    window.dispatchEvent(new CustomEvent('keyboard-quality', { detail: { quality } }));
  }

  private handleSimpleBackNavigation() {
    // Simple back navigation logic:
    // - Study view → Deck main view
    // - Edit view → Edit main view  
    // - Main views → Do nothing
    
    if (this.currentView === 'learn') {
      // If in study mode, exit to deck selection
      if (this.selectedDeck) {
        window.dispatchEvent(new CustomEvent('keyboard-escape'));
      }
    } else if (this.currentView === 'edit') {
      // If in edit mode, exit to edit main view
      window.dispatchEvent(new CustomEvent('keyboard-escape'));
    }
    // For main views (stats, settings, extras, info), do nothing
  }
}

// Create singleton instance
export const keyboardService = new KeyboardService();
