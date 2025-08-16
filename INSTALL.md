# Installation Guide for Element Delete Chrome Extension

## Prerequisites

- Google Chrome browser (version 88 or higher)
- Basic knowledge of Chrome extensions

## Installation Steps

### Step 1: Download the Extension

1. Clone or download this repository to your local machine
2. Ensure all files are present in the `element-delete` folder

### Step 2: Enable Developer Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle the "Developer mode" switch in the top-right corner
3. This will reveal additional options for loading extensions

### Step 3: Load the Extension

1. Click the "Load unpacked" button
2. Navigate to the `element-delete` folder you downloaded
3. Select the folder and click "Select Folder"
4. The extension should now appear in your extensions list

### Step 4: Verify Installation

1. Look for "Element Delete" in your extensions list
2. The extension icon should appear in your Chrome toolbar
3. If the icon is not visible, click the puzzle piece icon in the toolbar to find it

## Testing the Extension

### Basic Test

1. Open the `test.html` file in Chrome (or any webpage)
2. Click the Element Delete extension icon in your toolbar
3. The side panel should appear on the right side of the page
4. Hover over elements to see highlighting
5. Click on an element to select it
6. Use the Delete button to remove elements
7. Use the Undo button to restore deleted elements

### Advanced Testing

- Test on various websites (news sites, blogs, etc.)
- Try deleting different types of elements (divs, paragraphs, buttons)
- Test keyboard shortcuts (Delete, Ctrl+Z, Escape)
- Verify that deleted elements stay removed until page refresh

## Troubleshooting

### Extension Not Loading

- Ensure all files are present in the folder
- Check that Chrome version is 88 or higher
- Try refreshing the extensions page
- Check the browser console for error messages

### Extension Not Working on Websites

- Some websites may block content scripts
- Try refreshing the page
- Check if the website allows JavaScript execution
- Ensure no other extensions are conflicting

### Visual Issues

- The extension uses high z-index values to appear above content
- If elements appear behind content, try refreshing the page
- Check for conflicting CSS on the webpage

## Updating the Extension

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Element Delete extension
4. Test your changes

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "Element Delete" in the list
3. Click "Remove" to uninstall
4. Confirm the removal

## File Structure

```
element-delete/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js            # Main functionality
├── panel.css             # Side panel styles
├── popup.html            # Extension popup
├── popup.css             # Popup styles
├── popup.js              # Popup functionality
├── icons/                # Extension icons
│   └── icon.svg          # SVG icon
├── test.html             # Test page
├── PRD.md                # Product requirements
├── .cursorrules          # Development guidelines
├── README.md             # Project documentation
└── INSTALL.md            # This file
```

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify all files are present and properly formatted
3. Test on different websites to isolate issues
4. Check the troubleshooting section above
5. Review the PRD.md for detailed requirements

## Next Steps

Once the extension is working:

1. Test on various website types
2. Try different element selection scenarios
3. Experiment with keyboard shortcuts
4. Provide feedback for improvements
5. Consider contributing to the project
