class DeleteMode {
  constructor() {
    this.deletedElements = [];
  }

  activate(controller) {
    this.controller = controller;
    controller.updatePanelContent(this.getPanelHTML());
    controller.updateStatus("Select an element to delete");
  }

  deactivate() {
    this.deletedElements = [];
  }

  onHover(element) {
    this.controller.showHighlight(element);
  }

  onSelect(element) {
    this.controller.selectedElement = element;
    this.controller.highlightAsSelected();
    this.controller.updateStatus(`Selected: <span style="color:var(--accent-danger)">${element.tagName.toLowerCase()}</span>`);
    this.updateButtons();
  }

  onAction() {
    this.deleteSelected();
  }

  onUndo() {
    this.undoLast();
  }

  onEscape() {
    this.controller.clearSelection();
    this.updateButtons();
  }

  deleteSelected() {
    const el = this.controller.selectedElement;
    if (!el) return;

    this.deletedElements.push({
      element: el,
      parent: el.parentNode,
      nextSibling: el.nextSibling,
    });

    el.remove();
    this.controller.clearSelection();
    this.controller.updateStatus("Element deleted");
    this.updateButtons();
  }

  undoLast() {
    if (this.deletedElements.length === 0) return;
    const last = this.deletedElements.pop();
    if (last.nextSibling) {
      last.parent.insertBefore(last.element, last.nextSibling);
    } else {
      last.parent.appendChild(last.element);
    }
    this.controller.updateStatus("Element restored");
    this.updateButtons();
  }

  getPanelHTML() {
    return `
      <button class="pagesurgeon-panel__button pagesurgeon-panel__button--delete" id="modeActionBtn" disabled>
        🗑️ Delete Element
      </button>
      <button class="pagesurgeon-panel__button pagesurgeon-panel__button--undo" id="modeUndoBtn" disabled>
        ↩️ Undo
      </button>
      <button class="pagesurgeon-panel__button pagesurgeon-panel__button--cancel" id="modeCancelBtn">
        ❌ Cancel
      </button>
      <div class="pagesurgeon-panel__info">
        Hover to highlight, click to select. Delete key to remove.
      </div>
    `;
  }

  updateButtons() {
    const deleteBtn = document.getElementById("modeActionBtn");
    const undoBtn = document.getElementById("modeUndoBtn");
    if (deleteBtn) deleteBtn.disabled = !this.controller.selectedElement;
    if (undoBtn) undoBtn.disabled = this.deletedElements.length === 0;
  }
}
