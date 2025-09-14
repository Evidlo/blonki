import { get } from 'svelte/store';
import { settingsStore } from '../stores/settingsStore';
import type { Settings } from '../types';

class ThemeService {
  private currentTheme: Settings['theme'] = 'auto';

  constructor() {
    // Subscribe to settings changes
    settingsStore.subscribe(settings => {
      this.currentTheme = settings.theme;
      this.applyTheme(settings.theme);
    });

    // Initialize theme on load
    this.initializeTheme();
  }

  private initializeTheme() {
    const settings = get(settingsStore);
    this.currentTheme = settings.theme;
    this.applyTheme(settings.theme);
  }

  private applyTheme(theme: Settings['theme']) {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    if (theme === 'auto') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
  }

  async setTheme(theme: Settings['theme']) {
    try {
      const currentSettings = get(settingsStore);
      const updatedSettings = { ...currentSettings, theme };
      
      // Update settings store (this will trigger the subscription)
      settingsStore.set(updatedSettings);
      
      // The theme will be applied via the subscription
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  }

  getCurrentTheme(): Settings['theme'] {
    return this.currentTheme;
  }

  // Listen for system theme changes when using auto mode
  private setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (this.currentTheme === 'auto') {
        this.applyTheme('auto');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    // Return cleanup function
    return () => mediaQuery.removeEventListener('change', handleChange);
  }
}

// Create singleton instance
export const themeService = new ThemeService();
