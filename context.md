# Blonki - Web-based Anki Client Development Context

## Project Overview

Blonki is a web-based Anki client SPA built with Svelte 5 and TypeScript. The application provides a modern, responsive interface for spaced repetition learning with full support for importing/exporting Anki decks (.apkg files) and comprehensive data management.

## Current Architecture

### Core Application Structure
- **Five main tabs**: Learn, Edit, Stats, Settings, Extras
- **Responsive design**: Centered column layout optimized for desktop and mobile
- **Navigation**: Tab-based with persistent back button and ESC key support
- **Data storage**: Dual storage system (localStorage + Filesystem API)
- **Theme system**: Light/dark mode with automatic detection

### State Management Architecture

#### Svelte Stores
- **`appStore`**: Application state, current view, navigation history
- **`settingsStore`**: User preferences, SRS algorithm settings, theme
- **`deckStore`**: Deck collection management
- **`cardStore`**: Card data, current card, study session state
- **`studySessionStore`**: Persistent study session (card index, show back, deck ID)

#### Storage Abstraction Layer
- **`StorageAdapter` interface**: Unified storage operations
- **`LocalStorageAdapter`**: Browser localStorage implementation
- **`FilesystemStorageAdapter`**: File system API implementation
- **`StorageService`**: Centralized service managing all storage operations

### Service Layer

#### Core Services
- **`storageService`**: Data persistence, CRUD operations, import/export
- **`importService`**: File and URL-based data import (JSON, APKG)
- **`exportService`**: Data export functionality
- **`themeService`**: Theme management and persistence
- **`keyboardService`**: Keyboard shortcut handling

#### APKG Processing
- **`APKGParser`**: SQLite-based Anki deck parsing using sql.js
- **ZIP handling**: JSZip for APKG file extraction
- **Compression**: fzstd for Zstandard decompression (.anki21b files)
- **SQLite parsing**: sql.js with WASM for database queries

## Implementation Status

### ✅ Completed Features

#### Core Application
- [x] Svelte 5 + TypeScript project setup
- [x] Tailwind CSS v4 integration with PostCSS
- [x] Vite build system with WASM support
- [x] Responsive design with mobile optimization
- [x] Dark/light theme system with persistence

#### Data Management
- [x] Complete storage abstraction layer
- [x] LocalStorage and Filesystem API adapters
- [x] Data import/export functionality
- [x] APKG file parsing and import
- [x] JSON data import/export
- [x] Backup and restore functionality
- [x] Data migration from localStorage

#### User Interface
- [x] Tab-based navigation with history
- [x] Back button functionality (ESC key support)
- [x] Persistent study session state
- [x] Keyboard navigation for tables
- [x] Responsive card review interface
- [x] Progress indicators and session management

#### Learn Tab
- [x] Deck selection with table navigation
- [x] Card review interface with front/back display
- [x] Study session persistence across tab switches
- [x] Progress tracking and completion handling
- [x] Import from URL and file upload
- [x] Deck export functionality
- [x] Deck deletion with card cleanup

#### Edit Tab
- [x] Deck selection for editing
- [x] Card editing interface
- [x] Card creation and modification
- [x] Card deletion functionality
- [x] Export functionality
- [x] Real-time data persistence

#### Settings Tab
- [x] Storage type selection (localStorage/Filesystem API)
- [x] SRS algorithm configuration
- [x] Theme selection and persistence
- [x] File management (create new, open existing)
- [x] Data management (backup, restore, migrate, clear)
- [x] Default values loading

#### Stats Tab
- [x] Summary metrics display
- [x] Review history visualization
- [x] Card performance grid
- [x] Responsive chart layouts

### 🚧 Current Issues

#### APKG Parsing
- [ ] Field parsing robustness (comma vs pipe delimiters)
- [ ] Debug logging for field data format analysis
- [ ] Improved field cleaning and HTML handling

#### Data Persistence
- [ ] Study session state restoration on page reload
- [ ] Settings default values loading optimization

### 📋 Planned Features

#### Advanced Functionality
- [ ] Complete SRS algorithm implementation
- [ ] Advanced analytics and reporting
- [ ] Plugin system for Extras tab
- [ ] Offline support with service workers
- [ ] Multi-language support

#### Performance & Polish
- [ ] Large deck optimization
- [ ] Advanced error handling
- [ ] Unit and integration testing
- [ ] Accessibility improvements

## Technical Architecture

### Project Structure
```
src/
├── components/          # Reusable UI components
│   └── TableNavigation.svelte
├── services/           # Business logic services
│   ├── storageService.ts
│   ├── importService.ts
│   ├── exportService.ts
│   ├── themeService.ts
│   ├── keyboardService.ts
│   └── apkgParser.ts
├── stores/             # Svelte stores for state management
│   ├── appStore.ts
│   ├── settingsStore.ts
│   ├── deckStore.ts
│   └── cardStore.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   └── storage.ts
├── views/              # Main application views
│   ├── LearnView.svelte
│   ├── EditView.svelte
│   ├── StatsView.svelte
│   ├── SettingsView.svelte
│   └── ExtrasView.svelte
└── App.svelte          # Main application component
```

### Key Technologies
- **Frontend**: Svelte 5 with TypeScript
- **Styling**: Tailwind CSS v4 with PostCSS
- **Build Tool**: Vite with WASM support
- **State Management**: Svelte stores with persistent state
- **File Handling**: JSZip, fzstd, sql.js
- **Storage**: localStorage + Filesystem API

### Dependencies
```json
{
  "sql.js": "^1.8.0",      // SQLite parsing for APKG files
  "jszip": "^3.10.1",      // ZIP file handling
  "fzstd": "^0.3.2"        // Zstandard decompression
}
```

## Data Flow

### Study Session Persistence
1. User starts study session → `studySessionStore` updated
2. Card progress tracked in store (not local variables)
3. Tab switch → state preserved in store
4. Return to Learn tab → session restored from store
5. Study completion → store reset

### Import/Export Flow
1. File selection → `importService.importFile()`
2. APKG parsing → `APKGParser.parseAPKG()`
3. SQLite extraction → `sql.js` with WASM
4. Data processing → Field parsing and cleaning
5. Store updates → `storageService.importData()`
6. UI refresh → Store subscriptions trigger updates

### Storage Abstraction
1. Service calls → `storageService` methods
2. Adapter selection → localStorage vs Filesystem API
3. Data persistence → Adapter-specific implementation
4. Store synchronization → Automatic store updates

## Development Notes

### Resolved Challenges
- **WASM Loading**: Configured Vite for proper sql.js WASM support
- **Tailwind CSS v4**: Resolved PostCSS configuration issues
- **State Persistence**: Implemented store-based study session management
- **APKG Parsing**: SQLite-based parsing with proper field extraction
- **File System API**: Complete implementation with error handling

### Current Focus
- **Field Parsing**: Improving robustness of APKG field extraction
- **Debug Logging**: Comprehensive logging for parsing analysis
- **Error Handling**: Better user feedback for import failures

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Modern browser with Filesystem API support (optional)

### Installation
```bash
npm install
npm run dev
```

### Development Server
Runs on `http://localhost:5173/` (or next available port) with hot module replacement.

---

*This document provides comprehensive context for the current state of the Blonki project, including architecture, implementation status, and technical details for future development sessions.*