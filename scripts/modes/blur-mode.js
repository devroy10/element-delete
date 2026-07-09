class BlurMode {
  constructor() {
    this._previewQueue = [];
  }

  activate(controller) {
    this.controller = controller;
    this._previewQueue = [];
    controller.updatePanelContent(this.getPanelHTML());
    controller.updateStatus("Select elements to blur");
  }

  deactivate() {
    this.clearAllPreviews();
    this.controller = null;
  }

  onHover(element) {
    this.controller.showHighlight(element);
  }

  onSelect(element) {
    if (this._previewQueue.includes(element)) {
      this.controller.selectedElement = element;
      this.controller.highlightAsSelected();
      return;
    }

    this._previewQueue.push(element);
    element.style.filter = "blur(8px)";
    element.style.transition = "filter 0.3s ease";

    this.controller.selectedElement = element;
    this.controller.highlightAsSelected();
    this.controller.updateStatus(
      `${this._previewQueue.length} element${this._previewQueue.length > 1 ? "s" : ""} blurred`
    );
    this.updateButtons();
  }

  onAction() {
    this.saveBlurs();
  }

  onEscape() {
    this.clearAllPreviews();
    this.controller.clearSelection();
    this.updateButtons();
  }

  clearAllPreviews() {
    for (const el of this._previewQueue) {
      el.style.filter = "";
      el.style.transition = "";
    }
    this._previewQueue = [];
  }

  async saveBlurs() {
    if (!this._previewQueue.length) return;

    const { blurRules = [] } = await chrome.storage.local.get("blurRules");

    for (const el of this._previewQueue) {
      const selector = this.generateSelector(el);
      blurRules.push({
        id: crypto.randomUUID(),
        urlPattern: location.hostname + "/*",
        selector: selector,
        blurPx: 8,
        createdAt: new Date().toISOString(),
      });

      el.style.filter = "blur(8px)";
      el.style.pointerEvents = "none";
      el.style.userSelect = "none";
      el.style.transition = "";
    }

    await chrome.storage.local.set({ blurRules });

    this.controller.updateStatus(
      `Saved ${this._previewQueue.length} blur${this._previewQueue.length > 1 ? "s" : ""} for ${location.hostname} ✓`
    );
    this._previewQueue = [];
    this.controller.clearSelection();
    this.updateButtons();
  }

  generateSelector(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    if (element.getAttribute("data-testid")) {
      return `[data-testid="${CSS.escape(element.getAttribute("data-testid"))}"]`;
    }
    if (element.getAttribute("aria-label")) {
      return `[aria-label="${CSS.escape(element.getAttribute("aria-label"))}"]`;
    }

    const path = [];
    let el = element;
    while (el && el !== document.body && el !== document.documentElement) {
      let selector = el.tagName.toLowerCase();
      if (el.id) {
        path.unshift(`#${CSS.escape(el.id)}`);
        break;
      }
      const parent = el.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (s) => s.tagName === el.tagName
        );
        if (siblings.length > 1) {
          selector += `:nth-of-type(${siblings.indexOf(el) + 1})`;
        }
      }
      path.unshift(selector);
      el = parent;
    }
    return path.join(" > ");
  }

  getPanelHTML() {
    return `
      <button class="pagesurgeon-panel__button pagesurgeon-panel__button--action" id="modeActionBtn" disabled>
        🔵 Apply & Save Blurs
      </button>
      <button class="pagesurgeon-panel__button pagesurgeon-panel__button--cancel" id="modeCancelBtn">
        ❌ Cancel
      </button>
      <div class="pagesurgeon-panel__info">
        Click elements to blur them, then Apply & Save all at once.
      </div>
    `;
  }

  updateButtons() {
    const btn = document.getElementById("modeActionBtn");
    if (!btn) return;
    const count = this._previewQueue.length;
    btn.disabled = count === 0;
    btn.textContent = count > 0
      ? `🔵 Apply & Save Blurs (${count})`
      : "🔵 Apply & Save Blurs";
  }
}
