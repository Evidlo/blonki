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

    // Tab switching (1-5)
    if (event.key >= '1' && event.key <= '5') {
      const tabIndex = parseInt(event.key) - 1;
      const tabs: AppState['currentView'][] = ['learn', 'stats', 'settings', 'extras', 'info'];
      
      if (tabIndex < tabs.length) {
        this.switchToTab(tabs[tabIndex]);
        return true;
      }
    }

    // Escape key for going back
    if (event.key === 'Escape') {
      this.goBack();
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

    return false;
  }

  private switchToTab(tab: AppState['currentView']) {
    const currentState = get(appStore);
    if (tab !== currentState.currentView) {
      const newHistory = [...currentState.viewHistory, currentState.currentView];
      appStore.update(state => ({
        ...state,
        currentView: tab,
        viewHistory: newHistory
      }));
    }
  }

  private goBack() {
    const currentState = get(appStore);
    if (currentState.viewHistory.length > 0) {
      const previousView = currentState.viewHistory.pop();
      if (previousView) {
        appStore.update(state => ({
          ...state,
          currentView: previousView as AppState['currentView'],
          viewHistory: [...state.viewHistory]
        }));
      }
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
}

// Create singleton instance
export const keyboardService = new KeyboardService();
