/**
 * Element Delete Chrome Extension - Content Script
 * Main functionality for element selection, highlighting, and deletion
 */

class ElementDeleteExtension {
  constructor() {
    this.isActive = false;
    this.hoveredElement = null;
    this.selectedElement = null;
    this.highlightBox = null;
    this.sidePanel = null;
    this.deletedElements = [];
    this.isInitialized = false;

    // Bind 'this' for event handlers once to ensure proper listener removal
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleElementClick = this.handleElementClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.init();
  }

  /**
   * Initialize the extension by creating UI and binding events.
   */
  init() {
    if (this.isInitialized) return;

    try {
      this.createSidePanel();
      this.bindEvents();
      this.isInitialized = true;
      console.log("Element Delete extension initialized.");
    } catch (error) {
      console.error("Failed to initialize Element Delete extension:", error);
    }
  }

  /**
   * Create the side panel UI and append it to the document.
   */
  createSidePanel() {
    this.sidePanel = document.createElement("div");
    this.sidePanel.className = "element-delete-panel";
    this.sidePanel.innerHTML = `
      <div class="element-delete-panel__header">
        <h3 class="element-delete-panel__title">Element Delete</h3>
      </div>
      <div class="element-delete-panel__body">
        <div class="element-delete-panel__status">
          <span class="element-delete-panel__status-text">Ready to select elements</span>
        </div>
        <div class="element-delete-panel__actions">
          <button class="element-delete-panel__button element-delete-panel__button--delete" id="deleteBtn" disabled>
            🗑️ Delete Element
          </button>
          <button class="element-delete-panel__button element-delete-panel__button--undo" id="undoBtn" disabled>
            ↩️ Undo
          </button>
          <button class="element-delete-panel__button element-delete-panel__button--cancel" id="cancelBtn">
            ❌ Cancel
          </button>
        </div>
        <div class="element-delete-panel__info">
          Hover to highlight, click to select.
        </div>
      </div>
    `;
    document.body.appendChild(this.sidePanel);

    this.sidePanel
      .querySelector("#deleteBtn")
      .addEventListener("click", () => this.deleteSelectedElement());
    this.sidePanel
      .querySelector("#undoBtn")
      .addEventListener("click", () => this.undoLastDeletion());
    this.sidePanel
      .querySelector("#cancelBtn")
      .addEventListener("click", () => this.deactivate());
  }

  /**
   * Bind events for communication.
   */
  bindEvents() {
    window.addEventListener("message", (event) => {
      if (event.data.type === "ELEMENT_DELETE_TOGGLE") {
        this.toggle();
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "TOGGLE_ELEMENT_SELECTION") {
        this.toggle();
        sendResponse({ success: true });
      } else if (request.type === "GET_STATUS") {
        sendResponse({ isActive: this.isActive });
      }
      return true; // Indicates an async response
    });
  }

  /**
   * Handle keyboard shortcuts for delete, undo, and escape.
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    if (!this.isActive) return;

    if (event.key === "Delete" && this.selectedElement) {
      event.preventDefault();
      this.deleteSelectedElement();
    } else if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === "z" || event.key === "Z")
    ) {
      event.preventDefault();
      this.undoLastDeletion();
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.deactivate();
    }
  }

  /**
   * Toggle the extension's active state.
   */
  toggle() {
    this.isActive ? this.deactivate() : this.activate();
  }

  /**
   * Activate element selection mode.
   */
  activate() {
    if (this.isActive) return;
    this.isActive = true;
    this.sidePanel.classList.add("element-delete-panel--visible");
    this.enableElementSelection();
    this.updateStatus("Select an element to delete");
    console.log("Element selection mode activated.");
  }

  /**
   * Deactivate element selection mode.
   */
  deactivate() {
    if (!this.isActive) return;
    this.isActive = false;
    this.sidePanel.classList.remove("element-delete-panel--visible");
    this.disableElementSelection();
    this.clearSelection();
    console.log("Element selection mode deactivated.");
  }

  /**
   * Add document-level event listeners for selection.
   */
  enableElementSelection() {
    document.body.classList.add("element-delete-cursor");
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("click", this.handleElementClick, true); // Use capture phase
    document.addEventListener("keydown", this.handleKeyDown);
  }

  /**
   * Remove document-level event listeners.
   */
  disableElementSelection() {
    document.body.classList.remove("element-delete-cursor");
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("click", this.handleElementClick, true);
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  /**
   * Check if an element is part of the extension's UI.
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isExtensionElement(element) {
    return (
      element &&
      (!!element.closest(".element-delete-panel") ||
        element.classList.contains("element-delete-highlight"))
    );
  }

  /**
   * Handle mouse movement to highlight elements.
   * @param {MouseEvent} event
   */
  handleMouseMove(event) {
    if (!this.isActive) return;

    const targetElement = event.target;

    if (
      !targetElement ||
      this.isExtensionElement(targetElement) ||
      targetElement === this.hoveredElement
    ) {
      return;
    }

    this.hoveredElement = targetElement;
    this.highlightElement(targetElement);
  }

  /**
   * Handle clicks to select an element.
   * @param {MouseEvent} event
   */
  handleElementClick(event) {
    if (!this.isActive) return;

    if (this.isExtensionElement(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (this.hoveredElement) {
      this.selectElement(this.hoveredElement);
    }
  }

  /**
   * Draw a highlight box around the given element.
   * @param {HTMLElement} element
   */
  highlightElement(element) {
    if (!this.highlightBox) {
      this.highlightBox = document.createElement("div");
      this.highlightBox.className = "element-delete-highlight";
      document.body.appendChild(this.highlightBox);
    }

    const rect = element.getBoundingClientRect();
    this.highlightBox.style.left = `${rect.left + window.scrollX}px`;
    this.highlightBox.style.top = `${rect.top + window.scrollY}px`;
    this.highlightBox.style.width = `${rect.width}px`;
    this.highlightBox.style.height = `${rect.height}px`;

    // Ensure it's not styled as selected unless it is
    if (element !== this.selectedElement) {
      this.highlightBox.classList.remove("element-delete-highlight--selected");
    }
  }

  /**
   * Select an element for deletion.
   * @param {HTMLElement} element
   */
  selectElement(element) {
    this.selectedElement = element;
    if (this.highlightBox) {
      this.highlightBox.classList.add("element-delete-highlight--selected");
    }
    this.updateStatus(`Selected: &lt;${element.tagName.toLowerCase()}&gt;`);
    this.updateButtonStates();
    console.log("Element selected:", element);
  }

  /**
   * Clear the current selection.
   */
  clearSelection() {
    this.selectedElement = null;
    this.hoveredElement = null;
    if (this.highlightBox) {
      this.highlightBox.remove();
      this.highlightBox = null;
    }
    this.updateStatus("Select an element to delete");
    this.updateButtonStates();
  }

  /**
   * Delete the currently selected element.
   */
  deleteSelectedElement() {
    if (!this.selectedElement) return;

    const deletedInfo = {
      element: this.selectedElement,
      parent: this.selectedElement.parentNode,
      nextSibling: this.selectedElement.nextSibling,
    };

    this.selectedElement.remove();
    this.deletedElements.push(deletedInfo);
    console.log("Element deleted:", deletedInfo.element);

    this.clearSelection();
    this.updateStatus("Element deleted");
  }

  /**
   * Restore the last deleted element.
   */
  undoLastDeletion() {
    if (this.deletedElements.length === 0) return;

    const lastDeleted = this.deletedElements.pop();
    if (lastDeleted.nextSibling) {
      lastDeleted.parent.insertBefore(
        lastDeleted.element,
        lastDeleted.nextSibling
      );
    } else {
      lastDeleted.parent.appendChild(lastDeleted.element);
    }
    console.log("Element restored:", lastDeleted.element);
    this.updateStatus("Element restored");
    this.updateButtonStates();
  }

  /**
   * Update the status text in the side panel.
   * @param {string} text
   */
  updateStatus(text) {
    const statusElement = this.sidePanel.querySelector(
      ".element-delete-panel__status-text"
    );
    if (statusElement) {
      statusElement.innerHTML = text;
    }
  }

  /**
   * Enable/disable side panel buttons based on state.
   */
  updateButtonStates() {
    const deleteBtn = this.sidePanel.querySelector("#deleteBtn");
    const undoBtn = this.sidePanel.querySelector("#undoBtn");

    if (deleteBtn) {
      deleteBtn.disabled = !this.selectedElement;
    }
    if (undoBtn) {
      undoBtn.disabled = this.deletedElements.length === 0;
    }
  }
}

// Initialize the extension
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => new ElementDeleteExtension()
  );
} else {
  new ElementDeleteExtension();
}
