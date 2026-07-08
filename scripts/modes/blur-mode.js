class BlurMode {
  activate(controller) {
    this.controller = controller;
    controller.updatePanelContent(this.getPanelHTML());
    controller.updateStatus("Select an element to blur");
  }

  deactivate() {
    this.controller = null;
  }

  onHover(element) {
    this.controller.showHighlight(element);
  }

  onSelect(element) {
    this.controller.selectedElement = element;
    this.controller.highlightAsSelected();
    this.controller.updateStatus(`Selected: <span style="color:var(--accent-primary)">${element.tagName.toLowerCase()}</span>`);
    this.previewBlur(element);
    this.updateButtons();
  }

  onAction() {
    this.saveBlur();
  }

  onEscape() {
    this.removePreviewBlur();
    this.controller.clearSelection();
    this.updateButtons();
  }

  previewBlur(element) {
    this._previewEl = element;
    element.style.filter = "blur(8px)";
    element.style.transition = "filter 0.3s ease";
  }

  removePreviewBlur() {
    if (this._previewEl) {
      this._previewEl.style.filter = "";
      this._previewEl.style.transition = "";
      this._previewEl = null;
    }
  }

  async saveBlur() {
    const el = this.controller.selectedElement;
    if (!el) return;

    const selector = this.generateSelector(el);
    const rule = {
      id: crypto.randomUUID(),
      urlPattern: location.hostname + "/*",
      selector: selector,
      blurPx: 8,
      createdAt: new Date().toISOString(),
    };

    const { blurRules = [] } = await chrome.storage.local.get("blurRules");
    blurRules.push(rule);
    await chrome.storage.local.set({ blurRules });

    el.style.filter = "blur(8px)";
    el.style.pointerEvents = "none";
    el.style.userSelect = "none";
    el.style.transition = "";

    this.controller.updateStatus(`Blur saved for ${location.hostname} ✓`);
    this.controller.clearSelection();
    this._previewEl = null;
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
        🔵 Apply & Save Blur
      </button>
      <button class="pagesurgeon-panel__button pagesurgeon-panel__button--cancel" id="modeCancelBtn">
        ❌ Cancel
      </button>
      <div class="pagesurgeon-panel__info">
        Select an element, blur it, and save. It stays blurred on reload.
      </div>
    `;
  }

  updateButtons() {
    const btn = document.getElementById("modeActionBtn");
    if (btn) btn.disabled = !this.controller.selectedElement;
  }
}
