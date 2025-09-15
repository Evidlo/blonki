# Blonki - Web-based Anki Client Development Context

## Project Overview

Blonki is a web-based Anki client SPA built with Svelte 5 and TypeScript. The application provides a modern, responsive interface for spaced repetition learning with full support for importing/exporting Anki decks (.apkg files) and comprehensive data management.

## Current Architecture

### Core Application Structure
- **Five main tabs**: Learn, Edit, Stats, Settings, Extras
- **Responsive design**: Centered column layout optimized for desktop and mobile
- **Navigation**: Tab-based with persistent back button and ESC key support
- **Data storage**: Dual storage system (localStorage + File System Access API)
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
- **`FileSystemAccessAdapter`**: File System Access API implementation for transparent file operations
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
- [x] Storage type selection (localStorage/File System Access API)
- [x] SRS algorithm configuration
- [x] Theme selection and persistence
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

## File System Access API Design Guidelines

### Core Design Principles

#### 1. Transparent File Operations
- **Intent**: When "File System Access" storage type is selected, individual `.apkg` files are linked to specific paths on the user's disk
- **Behavior**: Any edits made to a deck are automatically saved back to its linked `.apkg` file
- **User Experience**: Seamless file-based workflow without explicit save operations

#### 2. Permission Management
- **Deferred Permissions**: File System Access API permission dialogs are deferred until the user performs a save operation after an edit
- **No Premature Prompts**: Opening a deck should not trigger permission dialogs
- **User Control**: Permissions only requested when user actually modifies data

#### 3. File Linking and State Management
- **Deck Linking**: Each deck can be linked to a `FileSystemFileHandle` for persistent storage
- **Location Display**: "Location" column shows full file path for linked decks, "Browser Storage" for unlinked decks
- **Error Handling**: File permission errors display as `[File Permission Error]` in Location column
- **Unlinking**: Deleting a deck unlinks it from the file before deletion to avoid permission dialogs

#### 4. Storage Adapter Pattern
- **`FileSystemAccessAdapter`**: Implements `StorageAdapter` interface for file-based operations
- **Hybrid Storage**: Uses `localStorage` as fallback and for unlinked decks
- **Change Tracking**: `hasUnsavedChanges` Map tracks which decks have been modified
- **Selective Saving**: Only saves to linked files when changes are detected

### Implementation Details

#### File Operations
```typescript
// Core file operations in FileSystemAccessAdapter
- linkDeckToFile(deckId: string, fileHandle: FileSystemFileHandle): void
- unlinkDeckFromFile(deckId: string): void
- getDeckFilePath(deckId: string): string
- isDeckLinkedToFile(deckId: string): boolean
- saveDeckToFile(deckId: string, deck: Deck, cards: Card[]): Promise<void>
- loadDeckFromFile(fileHandle: FileSystemFileHandle): Promise<{decks: Deck[], cards: Card[]}>
```

#### Data Flow
1. **File Opening**: User selects "Open from File" → File System Access API → Parse APKG → Link deck to file
2. **Editing**: User modifies card → `hasUnsavedChanges` flag set → Save to localStorage + linked file
3. **Deletion**: User deletes deck → Unlink from file → Delete from localStorage
4. **Permission Handling**: File write operations trigger permission dialogs only when needed

#### UI/UX Guidelines
- **Location Column**: Replaces "Description" column in all deck views
- **File Path Display**: Shows full path for linked decks, "Browser Storage" for unlinked
- **Error States**: Clear indication of file permission errors
- **Tab Independence**: Each tab resets `selectedDeck` state on mount to prevent cross-tab interference

#### Supported File Formats
- **Primary**: `.apkg` files (Anki package format)
- **Future**: Potential support for other formats
- **Validation**: ZIP file signature validation and file extension checking
- **Error Handling**: Comprehensive validation with user-friendly error messages

### Technical Architecture

#### Storage Service Integration
- **Centralized Management**: `StorageService` coordinates between `LocalStorageAdapter` and `FileSystemAccessAdapter`
- **Conditional Initialization**: `FileSystemAccessAdapter` only created when File System Access storage type is selected
- **Fallback Strategy**: Always maintains `localStorage` as backup storage
- **State Synchronization**: Svelte stores updated through centralized service calls

#### APKG Processing
- **Parser Integration**: `APKGParser` used for both File System Access and traditional import
- **File Validation**: ZIP signature validation, file size checks, extension verification
- **Error Recovery**: Graceful fallback to JSON parsing if APKG parsing fails
- **Deck Naming**: Uses filename (without extension) when parsed deck name is generic

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

#### Future Data Model Evolution
- [ ] **Multiple Card Formats Support**: Eventually support Anki's full data model (Notes, Cards, Templates, Fields)
- [ ] **Current Approach**: Maintain simplified card structure (front/back) as common denominator
- [ ] **Design Rationale**: Focus on core features while keeping data model simple and extensible
- [ ] **Migration Path**: When ready, can evolve to full Anki data model without breaking existing functionality
- [ ] **APKG Compatibility**: Generate proper APKG files that work with Anki while using simplified internal structure

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
- **Storage**: localStorage + File System Access API

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
2. Adapter selection → localStorage vs File System Access API
3. Data persistence → Adapter-specific implementation
4. Store synchronization → Automatic store updates

## Development Notes

### Resolved Challenges
- **WASM Loading**: Configured Vite for proper sql.js WASM support
- **Tailwind CSS v4**: Resolved PostCSS configuration issues
- **State Persistence**: Implemented store-based study session management
- **APKG Parsing**: SQLite-based parsing with proper field extraction
- **File System Access API**: Complete implementation with transparent file operations
- **Permission Management**: Deferred permission dialogs until actual file modifications
- **Tab State Isolation**: Fixed cross-tab state sharing issues
- **Event Handling**: Resolved button event bubbling issues

### Current Focus
- **Field Parsing**: Improving robustness of APKG field extraction
- **Debug Logging**: Comprehensive logging for parsing analysis
- **Error Handling**: Better user feedback for import failures

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Modern browser with File System Access API support (optional, for file-based storage)

### Installation
```bash
npm install
npm run dev
```

### Development Server
Runs on `http://localhost:5173/` (or next available port) with hot module replacement.

---

*This document provides comprehensive context for the current state of the Blonki project, including architecture, implementation status, and technical details for future development sessions.*