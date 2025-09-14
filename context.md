# Blonki - Web-based Anki Client Development Context

## Project Overview

Blonki is a web-based Anki client SPA (Single Page Application) built with Svelte 5 and TypeScript. The application provides a modern, responsive interface for spaced repetition learning with support for importing/exporting Anki decks.

## Design Requirements & Discussion

### Core Application Structure
- **Five main tabs**: Learn, Edit, Stats, Settings, Extras
- **Responsive design**: Centered column layout that works on both desktop and mobile
- **Navigation**: Tab-based with back button/ESC key support for sub-views
- **Data storage**: Configurable between browser localStorage and Filesystem API

### User Flow Specifications

#### Learn Tab
- **1st view**: Table showing available decks with selection capability
- **Import functionality**: "Import from URL" and "Open from File" buttons above the table
- **2nd view**: Card review interface with front/back display and correct/incorrect tracking

#### Edit Tab
- **1st view**: Table showing available decks for editing
- **2nd view**: Card editing interface with front/back content modification and save functionality

#### Stats Tab
- **1st view**: Grid of cards with individual review plots
- **Analytics**: Reviews line plot showing number of reviews over the last month
- **Performance metrics**: Card-level statistics and learning progress

#### Settings Tab
- **Configuration options**: List of settings with input fields
- **SRS Algorithm**: Dropdown selection for spaced repetition algorithms
- **Storage preferences**: Choice between localStorage and Filesystem API
- **UI customization**: Theme, cards per session, and other preferences

#### Extras Tab
- **Plugin system**: Empty view intended for future plugin functionality

### Technical Requirements

#### Data Storage
- **Primary**: Browser localStorage for immediate functionality
- **Secondary**: Filesystem API support with browser compatibility detection
- **File formats**: Support for .apkg files with future expansion to other formats

#### Spaced Repetition System
- **Algorithms**: Support for basic Anki algorithm with configurability
- **Settings integration**: Algorithm selection via dropdown in Settings tab
- **Customization**: Configurable parameters for different SRS algorithms

#### UI/UX Requirements
- **Layout**: Centered column design using Flexbox for responsiveness
- **Mobile optimization**: Proper viewport handling and responsive tables
- **Accessibility**: Keyboard navigation, ARIA labels, and screen reader support
- **Navigation**: ESC key and back button support for sub-view navigation

## Implementation Status

### ✅ Completed Features

#### Project Foundation
- [x] Svelte 5 + TypeScript project setup
- [x] Tailwind CSS integration (v4 with PostCSS)
- [x] Vite build system configuration
- [x] Project structure with organized folders (components, stores, utils, types, views)

#### Core Architecture
- [x] TypeScript type definitions for cards, decks, settings, and app state
- [x] Svelte stores for state management (app, settings, decks, cards)
- [x] Storage abstraction layer with localStorage implementation
- [x] SRS algorithm framework with SM-2, SM-17, and custom implementations

#### User Interface
- [x] Responsive main layout with centered column design
- [x] Tab-based navigation system (Learn, Edit, Stats, Settings, Extras)
- [x] Mobile-responsive design with proper viewport handling
- [x] Back navigation with ESC key support
- [x] Accessible form controls with proper ARIA labels

#### Learn Tab Implementation
- [x] Deck selection table with sample data
- [x] Import buttons ("Import from URL" and "Open from File")
- [x] Card review interface with front/back display
- [x] Correct/incorrect response tracking
- [x] Progress indicators and session management

#### Edit Tab Implementation
- [x] Deck selection for editing
- [x] Card editing interface with front/back text areas
- [x] Create new card functionality
- [x] Save/cancel operations for card modifications

#### Stats Tab Implementation
- [x] Summary cards with key metrics (total reviews, accuracy, cards due)
- [x] Review history visualization with sample data
- [x] Card performance grid showing individual card statistics
- [x] Responsive chart layouts for mobile and desktop

#### Settings Tab Implementation
- [x] Storage type selection (localStorage/Filesystem API)
- [x] SRS algorithm dropdown (SM-2, SM-17, Custom)
- [x] Algorithm parameter configuration
- [x] UI preferences (theme, cards per session)
- [x] Settings persistence and validation

#### Data Layer
- [x] LocalStorage adapter implementation
- [x] Filesystem API adapter framework (placeholder)
- [x] SRS algorithm implementations (SM-2, SM-17, Custom)
- [x] Anki file handling utilities with anki-apkg-export integration

### 🚧 In Progress / Partially Implemented

#### File Import/Export
- [ ] Complete .apkg file parsing and import functionality
- [ ] URL-based deck import implementation
- [ ] File upload handling for various formats (.apkg, .json)
- [ ] Export functionality for decks and collections

#### Data Persistence
- [ ] Complete storage layer integration with Svelte stores
- [ ] Real data loading/saving instead of sample data
- [ ] Filesystem API implementation for supported browsers
- [ ] Data migration and backup functionality

#### Others
- [ ] Theme system implementation (light/dark modes)

#### Keyboard shortcuts
- [ ] up and down / jk for navigating tables
- [ ] highlight for currently selected table row
- [ ] escape for going back to higher level view
- [ ] space for marking correct
- [ ] f for marking incorrect


### 📋 Planned / Not Yet Implemented

#### Advanced Features
- [ ] Complete plugin system for Extras tab
- [ ] Advanced analytics and reporting
- [ ] Offline support with service workers
- [ ] Multi-language support
- [ ] Collaborative features for deck sharing

#### Performance & Polish
- [ ] Large deck optimization
- [ ] Advanced error handling and user feedback
- [ ] Unit and integration testing
- [ ] Performance monitoring and optimization
- [ ] Accessibility audit and improvements

## Technical Architecture

### Project Structure
```
src/
├── components/          # Reusable UI components
├── stores/             # Svelte stores for state management
│   ├── appStore.ts     # Application state and navigation
│   ├── settingsStore.ts # User preferences and configuration
│   ├── deckStore.ts    # Deck management
│   └── cardStore.ts    # Card data and current card state
├── types/              # TypeScript type definitions
│   └── index.ts        # Core data types and interfaces
├── utils/              # Utility functions
│   ├── storage.ts      # Storage adapters and persistence
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

### Key Technologies
- **Frontend**: Svelte 5 with TypeScript
- **Styling**: Tailwind CSS v4 with PostCSS
- **Build Tool**: Vite
- **State Management**: Svelte stores
- **File Handling**: anki-apkg-export library
- **Storage**: localStorage (primary), Filesystem API (planned)

## Development Notes

### Configuration Challenges Resolved
- **Tailwind CSS v4 Setup**: Initially had PostCSS configuration issues that were resolved by using the correct `@tailwindcss/postcss` plugin
- **Mobile Responsiveness**: Implemented proper viewport handling and responsive table containers
- **ES Module Compatibility**: Fixed `require()` vs `import` syntax issues in configuration files

### Current Status
The application is fully functional with a complete UI implementation and working navigation. All core features are implemented with sample data, providing a solid foundation for data persistence and advanced functionality.

### Next Development Priorities
1. Complete data persistence integration
2. Implement real .apkg file import/export
3. Add comprehensive error handling
4. Implement theme system
5. Add unit testing framework

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation
```bash
npm install
npm run dev
```

### Development Server
The application runs on `http://localhost:5173/` (or next available port) with hot module replacement for development.

---

*This document serves as a comprehensive record of the design decisions, implementation progress, and technical architecture for the Blonki web-based Anki client project.*
