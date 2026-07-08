# Cursor Rules for PageSurgeon Chrome Extension

## Project Overview

A Chrome Extension (MV3) for surgical page editing — delete, edit text, screenshot, and blur any element on any webpage.

## Code Style & Standards

### JavaScript

- Use ES6+ features (const/let, arrow functions, template literals)
- Use camelCase naming
- Use descriptive names
- Implement proper error handling with try-catch
- Use async/await for asynchronous operations

### CSS

- Use CSS custom properties for consistent theming
- Use BEM methodology for class naming with `pagesurgeon-` prefix
- Use flexbox and grid for layouts
- Implement smooth transitions

## Architecture

### Mode Architecture

The extension uses a ModeController + pluggable mode classes:

- `ModeController` (content.js) — shared infrastructure (highlight, events, panel)
- `DeleteMode` — delete/undo
- `EditMode` — inline text editing
- `ScreenshotMode` — element capture via `captureVisibleTab`
- `BlurMode` — blur + chrome.storage persistence

### Messaging

- Popup ↔ Content: `chrome.tabs.sendMessage` (SET_MODE, ACTIVATE, DEACTIVATE, GET_STATUS)
- Background ↔ Content: `window.postMessage` (PAGESURGEON_TOGGLE)
- Content → Background: `chrome.runtime.sendMessage` (CAPTURE_ELEMENT)
