# Blonki - Web-based Anki Client

A modern, responsive web application for spaced repetition learning, built with Svelte 5 and TypeScript.

## Features

### ✅ Completed
- **Responsive Design**: Centered column layout that works on both desktop and mobile
- **Tab Navigation**: Learn, Edit, Stats, Settings, and Extras tabs
- **Deck Management**: Create, view, and manage flashcard decks
- **Card Review System**: Front/back card display with correct/incorrect tracking
- **Card Editing**: Create and edit flashcards with front/back content
- **Statistics Dashboard**: View learning progress and review history
- **Settings Configuration**: 
  - Storage type selection (LocalStorage/Filesystem API)
  - Spaced Repetition Algorithm configuration (SM-2, SM-17, Custom)
  - UI preferences (theme, cards per session)
- **Keyboard Navigation**: ESC key for back navigation
- **TypeScript Support**: Full type safety throughout the application

### 🚧 In Progress
- **APKG Import/Export**: Support for Anki package files
- **File Import**: Import from URL and local files
- **Data Persistence**: Complete storage layer implementation

### 📋 Planned
- **Plugin System**: Extras tab for additional functionality
- **Advanced Analytics**: More detailed statistics and charts
- **Theme Support**: Light/dark mode implementation
- **Mobile Optimization**: Enhanced mobile experience

## Technical Stack

- **Frontend**: Svelte 5 with TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **State Management**: Svelte stores
- **File Handling**: anki-apkg-export library

## Project Structure

```
src/
├── components/          # Reusable UI components
├── stores/             # Svelte stores for state management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   ├── storage.ts      # Storage adapters
│   ├── srs.ts          # Spaced repetition algorithms
│   └── anki.ts         # Anki file handling
├── views/              # Main application views
│   ├── LearnView.svelte
│   ├── EditView.svelte
│   ├── StatsView.svelte
│   ├── SettingsView.svelte
│   └── ExtrasView.svelte
└── App.svelte          # Main application component
```

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

## Usage

1. **Learning**: Navigate to the Learn tab to select a deck and start reviewing cards
2. **Editing**: Use the Edit tab to create new cards or modify existing ones
3. **Statistics**: View your learning progress in the Stats tab
4. **Settings**: Configure your preferences in the Settings tab

## Development Notes

- The application uses a modular architecture with clear separation of concerns
- All data is currently stored in browser localStorage (Filesystem API support planned)
- The spaced repetition system supports multiple algorithms with configurable parameters
- The UI is built with accessibility in mind, including proper ARIA labels and keyboard navigation

## Future Enhancements

- Complete APKG file support for importing/exporting Anki decks
- Advanced analytics with charts and graphs
- Plugin system for extending functionality
- Offline support with service workers
- Multi-language support
- Collaborative features for sharing decks