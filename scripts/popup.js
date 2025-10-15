/**
 * Popup functionality for Element Delete extension
 * Handles user interactions and communicates with content script
 */

class PopupManager {
  constructor() {
    this.elements = {
      statusValue: document.getElementById("statusValue"),
      toggleButton: document.getElementById("toggleButton"),
      helpButton: document.getElementById("helpButton"),
    };

    this.isActive = false;
    this.init();
  }

  /**
   * Initialize popup functionality
   */
  init() {
    this.bindEvents();
    this.checkExtensionStatus();
  }

  /**
   * Bind event listeners to UI elements
   */
  bindEvents() {
    this.elements.toggleButton.addEventListener("click", () => {
      this.toggleElementSelection();
    });

    this.elements.helpButton.addEventListener("click", () => {
      this.showHelp();
    });

    // Listen for messages from content script
    window.addEventListener("message", (event) => {
      if (event.data.type === "ELEMENT_DELETE_STATUS_UPDATE") {
        this.updateStatus(event.data.isActive);
      }
    });
  }

  /**
   * Check current extension status
   */
  async checkExtensionStatus() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab) {
        // Send message to content script to get current status
        chrome.tabs.sendMessage(tab.id, { type: "GET_STATUS" }, (response) => {
          if (response && response.isActive !== undefined) {
            this.updateStatus(response.isActive);
          }
        });
      }
    } catch (error) {
      console.error("Failed to check extension status:", error);
    }
  }

  /**
   * Toggle element selection mode
   */
  async toggleElementSelection() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab) {
        // Send message to content script to toggle mode
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_ELEMENT_SELECTION" });

        // Update local state
        this.isActive = !this.isActive;
        this.updateStatus(this.isActive);
      }
    } catch (error) {
      console.error("Failed to toggle element selection:", error);
    }
  }

  /**
   * Update status display
   * @param {boolean} isActive - Whether element selection is active
   */
  updateStatus(isActive) {
    this.isActive = isActive;

    if (isActive) {
      this.elements.statusValue.textContent = "Active";
      this.elements.statusValue.className =
        "popup__status-value popup__status-value--active";
      this.elements.toggleButton.textContent = "Deactivate Element Selection";
      this.elements.toggleButton.className =
        "popup__button popup__button--primary popup__button--danger";
    } else {
      this.elements.statusValue.textContent = "Inactive";
      this.elements.statusValue.className =
        "popup__status-value popup__status-value--inactive";
      this.elements.toggleButton.textContent = "Activate Element Selection";
      this.elements.toggleButton.className =
        "popup__button popup__button--primary";
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    const helpText = `
Element Delete Extension Help

Keyboard Shortcuts:
• Delete key: Delete selected element
• Ctrl+Z (Cmd+Z on Mac): Undo last deletion
• Escape: Exit element selection mode

Usage:
1. Click "Activate Element Selection"
2. Hover over elements to highlight them
3. Click to select an element
4. Use the side panel to delete or undo
5. Click "Deactivate" or press Escape to exit

Note: Deleted elements are restored when you refresh the page.
    `;

    alert(helpText);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
});