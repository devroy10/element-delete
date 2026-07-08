class EditMode {
  constructor() {
    this.editingElement = null;
    this.originalText = null;
    this.handleGlobalClick = this.handleGlobalClick.bind(this);
    this.handleEnter = this.handleEnter.bind(this);
  }

  activate(controller) {
    this.controller = controller;
    controller.updatePanelContent(this.getPanelHTML());
    controller.updateStatus("Select a text element to edit");
  }

  deactivate() {
    this.commitEdit();
    this.editingElement = null;
    this.originalText = null;
  }

  onHover(element) {
    if (this.editingElement) return;
    if (DomUtils.isTextElement(element)) {
      this.controller.showHighlight(element);
    }
  }

  onSelect(element) {
    if (this.editingElement) {
      this.commitEdit();
      return;
    }

    if (!DomUtils.isTextElement(element)) {
      this.controller.updateStatus("Not a text element. Try a paragraph, heading, or span.");
      return;
    }

    this.editingElement = element;
    this.originalText = element.textContent;

    element.contentEditable = "true";
    element.focus();
    element.classList.add("pagesurgeon-editing");

    const range = document.createRange();
    range.selectNodeContents(element);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    element.addEventListener("keydown", this.handleEnter);
    document.addEventListener("click", this.handleGlobalClick);

    this.controller.updateStatus(`Editing <span style="color:var(--accent-primary)">${element.tagName.toLowerCase()}</span>`);
    this.controller.hideHighlight();
    this.controller.selectedElement = null;
    this.updateButtons();
  }

  onAction() {
    this.commitEdit();
  }

  onEscape() {
    this.cancelEdit();
  }

  handleGlobalClick(event) {
    if (this.editingElement && !this.editingElement.contains(event.target)) {
      this.commitEdit();
    }
  }

  handleEnter(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.commitEdit();
    }
  }

  commitEdit() {
    if (!this.editingElement) return;
    this.editingElement.contentEditable = "false";
    this.editingElement.classList.remove("pagesurgeon-editing");
    this.editingElement.removeEventListener("keydown", this.handleEnter);
    document.removeEventListener("click", this.handleGlobalClick);
    window.getSelection().removeAllRanges();
    this.controller.updateStatus("Text updated");
    this.editingElement = null;
    this.originalText = null;
    this.updateButtons();
  }

  cancelEdit() {
    if (!this.editingElement) return;
    this.editingElement.textContent = this.originalText;
    this.editingElement.contentEditable = "false";
    this.editingElement.classList.remove("pagesurgeon-editing");
    this.editingElement.removeEventListener("keydown", this.handleEnter);
    document.removeEventListener("click", this.handleGlobalClick);
    window.getSelection().removeAllRanges();
    this.controller.updateStatus("Edit cancelled");
    this.editingElement = null;
    this.originalText = null;
    this.updateButtons();
  }

  getPanelHTML() {
    return `
      <button class="pagesurgeon-panel__button pagesurgeon-panel__button--action" id="modeActionBtn" disabled>
        💾 Save & Exit
      </button>
      <button class="pagesurgeon-panel__button pagesurgeon-panel__button--cancel" id="modeCancelBtn">
        ❌ Cancel
      </button>
      <div class="pagesurgeon-panel__info">
        Click a text element to edit. Enter to save, Escape to cancel.
      </div>
    `;
  }

  updateButtons() {
    const saveBtn = document.getElementById("modeActionBtn");
    if (saveBtn) saveBtn.disabled = !this.editingElement;
  }
}
