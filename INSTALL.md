# Installation Guide for PageSurgeon

## Prerequisites

- Google Chrome browser (version 88 or higher)
- Basic knowledge of Chrome extensions

## Installation Steps

### Step 1: Download the Extension

1. Clone or download this repository to your local machine
2. Ensure all files are present in the `pagesurgeon` folder

### Step 2: Enable Developer Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle the "Developer mode" switch in the top-right corner

### Step 3: Load the Extension

1. Click the "Load unpacked" button
2. Navigate to the `pagesurgeon` folder
3. Select the folder and click "Select Folder"

### Step 4: Verify Installation

1. Look for "PageSurgeon" in your extensions list
2. The icon should appear in your Chrome toolbar

## Testing

1. Open any webpage
2. Click the PageSurgeon icon
3. Select a mode and click Activate
4. Test the different modes:
   - **Delete**: Hover, click, press Delete key or use panel button
   - **Edit Text**: Click a paragraph or heading to edit
   - **Screenshot**: Select an element, click Capture
   - **Blur**: Select an element, click Apply; blur persists on reload

## Troubleshooting

### Extension Not Loading

- Ensure all files are present in the folder
- Check that Chrome version is 88 or higher
- Try refreshing the extensions page

### Extension Not Working on Websites

- Some websites may block content scripts
- Try refreshing the page
- Ensure the website allows JavaScript execution

## Updating

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the PageSurgeon extension

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "PageSurgeon" in the list
3. Click "Remove"

## File Structure

```
pagesurgeon/
├── manifest.json
├── popup.html
├── icons/
├── styles/
│   ├── popup.css
│   └── panel.css
├── scripts/
│   ├── background.js
│   ├── content.js
│   ├── popup.js
│   ├── utils/
│   │   └── dom-utils.js
│   └── modes/
│       ├── delete-mode.js
│       ├── edit-mode.js
│       ├── screenshot-mode.js
│       └── blur-mode.js
├── docs/
│   └── PRD.md
├── INSTALL.md
└── README.md
```
