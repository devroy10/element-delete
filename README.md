# Element Delete Chrome Extension

A production-ready Chrome Extension that allows users to visually delete elements from any webpage, mimicking the "delete element" functionality in Chrome DevTools with a clean, intuitive interface.

[![Watch the demo](https://youtu.be/GLz7P7WU8Ys)

## Features

- **Element Selection Mode**: Toggle on/off via browser action button
- **Visual Element Highlighting**: Semi-transparent bounding box on hover
- **Element Deletion**: Remove selected elements from DOM
- **Undo Functionality**: Restore last deleted element (1 level)
- **Session Management**: Multiple deletions per session until page refresh
- **Clean Side Panel**: Fixed-position control panel with intuitive buttons
- **Keyboard Shortcuts**: Quick access to Delete, Undo, and Exit functions

## Installation

### For Development

1. Clone this repository:

   ```bash
   git clone <repository-url>
   cd element-delete
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the `element-delete` folder

5. The extension icon should appear in your Chrome toolbar

### For Users

1. Download the extension from the Chrome Web Store (when published)
2. Click "Add to Chrome" to install
3. The extension will be available in your toolbar

## Usage

1. **Activate**: Click the Element Delete extension icon in your Chrome toolbar
2. **Select Elements**: Hover over any element on the webpage to see a highlight
3. **Lock Selection**: Click on an element to lock the selection
4. **Delete**: Use the Delete button in the side panel to remove the element
5. **Undo**: Use the Undo button to restore the last deleted element
6. **Exit**: Use the Cancel button or click the extension icon again to exit

### Keyboard Shortcuts

- `Delete` key: Delete selected element
- `Ctrl+Z` (or `Cmd+Z` on Mac): Undo last deletion
- `Escape`: Exit element selection mode

## Project Structure

```
element-delete/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker for background tasks
├── content.js            # Main content script with all functionality
├── panel.css             # Styles for side panel and visual indicators
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── PRD.md                # Product Requirements Document
├── .cursorrules          # Development guidelines and rules
└── README.md             # This file
```

## Technical Details

### Architecture

- **Manifest V3**: Latest Chrome Extension standard
- **Content Script**: Injected into every webpage for functionality
- **Background Service Worker**: Handles extension lifecycle
- **Shadow DOM**: Isolates extension styles from webpage
- **Event-Driven**: Modular component communication

### Key Components

- **ElementSelector**: Handles element detection, highlighting, and selection
- **SidePanel**: Manages the control panel UI and user interactions
- **ElementManager**: Handles DOM manipulation, deletion, and undo operations
- **EventManager**: Coordinates messaging between components
- **StateManager**: Tracks extension state and user selections

### Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Chromium-based browsers (Edge, Brave, etc.)
- Tested on Windows, macOS, and Linux

## Development

### Prerequisites

- Chrome browser (version 88+)
- Basic knowledge of JavaScript, HTML, and CSS
- Understanding of Chrome Extension development

### Development Workflow

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Element Delete extension
4. Test your changes on any webpage

### Code Style

- Follow the guidelines in `.cursorrules`
- Use ES6+ JavaScript features
- Implement proper error handling
- Add JSDoc comments for all public functions
- Follow BEM methodology for CSS

### Testing

- Test on various website types (simple to complex)
- Verify functionality in different Chrome versions
- Test edge cases (empty pages, iframes, etc.)
- Ensure no conflicts with existing webpage functionality

## Troubleshooting

### Common Issues

**Extension not working on certain websites**

- Some websites may block content scripts
- Check the browser console for error messages
- Ensure the website allows JavaScript execution

**Visual glitches or conflicts**

- The extension uses shadow DOM to prevent style conflicts
- If issues persist, try refreshing the page
- Check for conflicting browser extensions

**Performance issues**

- The extension is optimized for smooth performance
- If lag occurs, try refreshing the page
- Ensure no other heavy extensions are running

### Debug Mode

1. Right-click the extension icon
2. Select "Inspect popup" to debug the popup
3. Use Chrome DevTools to debug content script
4. Check the background service worker in the extensions page

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding standards in `.cursorrules`
4. Test thoroughly before submitting
5. Create a pull request with detailed description

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or contributions:

- Create an issue in the repository
- Check the troubleshooting section above
- Review the `./docs/PRD.md` for detailed requirements

## Roadmap

### Phase 2

- [ ] Redo edit functionality
- [ ] Element history persistence
- [ ] More keyboard shortcuts

### Phase 3

- Batch element operations
- Export/import deletion configurations
- Advanced element selection tools
