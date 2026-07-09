# PageSurgeon

A Chrome Extension for surgical page editing — delete, edit, screenshot, and blur any element on any webpage.

## Features

- **🗑️ Delete Mode** — Visually remove elements from the DOM with undo support
- **✏️ Edit Text Mode** — Click any text element to edit its content inline
- **📷 Screenshot Mode** — Capture a clean PNG of any selected element
- **🔵 Blur Mode** — Blur sensitive elements; persists across page reloads

## Installation

### For Development

```bash
git clone <repository-url>
cd pagesurgeon
```

2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `pagesurgeon` folder

### For Users

Published on Chrome Web Store (coming soon).

## Usage

1. Click the PageSurgeon icon in your toolbar → opens the popup
2. Select a mode: Delete, Edit Text, Screenshot, or Blur
3. Click "Activate" to enter the mode
4. Hover over elements to highlight, click to act
5. Use the side panel for actions

### Keyboard Shortcuts

| Key | Mode | Action |
|---|---|---|
| `Escape` | All | Cancel / exit current action |
| `Delete` | Delete | Remove selected element |
| `Ctrl+Z` | Delete | Undo last deletion |
| `Enter` | Edit Text | Save edited text |

## Project Structure

```
pagesurgeon/
├── manifest.json
├── popup.html
├── icons/
├── styles/
│   ├── popup.css
│   └── panel.css
├── scripts/
│   ├── background.js       # Service worker
│   ├── content.js          # Mode controller
│   ├── popup.js            # Popup UI
│   ├── utils/
│   │   └── dom-utils.js    # Shared helpers
│   └── modes/
│       ├── delete-mode.js
│       ├── edit-mode.js
│       ├── screenshot-mode.js
│       └── blur-mode.js
└── docs/
    └── PRD.md
```

## Technical Details

- **Manifest V3**: Latest Chrome Extension standard
- **Native APIs**: `chrome.tabs.captureVisibleTab` for screenshots, `chrome.storage.local` for blur persistence, `chrome.downloads` for file saving
- **Mode Architecture**: Shared hover/select infrastructure with pluggable mode classes
- **No Dependencies**: Zero external libraries — all native browser APIs

## Roadmap

### Completed

- [x] **Scroll-and-stitch full-element screenshots** — Capture elements larger than the viewport by scrolling and stitching tiles
- [x] **Batch blur** — Select multiple elements and apply blur to all at once
- [x] **Multi-select blur workflow** — Click elements to preview blur, batch save with one click
- [x] **Edit Text mode** — Inline contenteditable editing with Enter/Escape/click-away
- [x] **Screenshot mode** — Viewport and scroll-capture element screenshots
- [x] **Blur mode** — Persistent blur across page reloads via chrome.storage + MutationObserver
- [x] **Delete mode** — Element deletion with undo stack
- [x] **Scroll-capture overlay suppression** — Fixed/sticky handled per-tile to prevent rendering issues in stitched screenshots

### Planned

- [ ] **Manage Blurs UI** — Popup page listing saved blur rules with remove/toggle
- [ ] **Blur intensity slider** — Adjustable blur strength (4px / 8px / 16px / 32px)
- [ ] **Undo blur** — Per-rule removal and reversal
- [ ] **Blur rule sharing** — Export/import rules as JSON
- [ ] **Element picker** — DevTools-style CSS selector input for direct element targeting
- [ ] **Custom CSS injection** — Beyond blur: hide, highlight, outline elements
- [ ] **History panel** — Full session log of all modifications (delete, edit, blur)
- [ ] **Blur rule toggle** — Enable/disable individual rules without removing them
