class ScreenshotMode {
  activate(controller) {
    this.controller = controller;
    controller.updatePanelContent(this.getPanelHTML());
    controller.updateStatus("Select an element to screenshot");
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
    const rect = element.getBoundingClientRect();
    this.controller.updateStatus(
      `Selected: <span style="color:var(--accent-primary)">${element.tagName.toLowerCase()}</span> ${Math.round(rect.width)}×${Math.round(rect.height)}`
    );
    this.updateButtons();
  }

  onAction() {
    this.captureScreenshot();
  }

  onEscape() {
    this.controller.clearSelection();
    this.updateButtons();
  }

  async captureScreenshot() {
    const el = this.controller.selectedElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.controller.updateStatus("Capturing...");

    const panel = this.controller.sidePanel;
    const highlight = this.controller.highlightBox;
    const panelNext = panel ? panel.nextSibling : null;
    const highlightNext = highlight ? highlight.nextSibling : null;
    if (panel) panel.remove();
    if (highlight) highlight.remove();

    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

    try {
      const result = await chrome.runtime.sendMessage({
        type: "CAPTURE_ELEMENT",
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        dpr: dpr,
        filename: `pagesurgeon-${Date.now()}.png`,
      });

      if (result && result.success) {
        this.controller.updateStatus("Screenshot saved! ✓");
      } else {
        this.controller.updateStatus("Capture failed. Try again.");
      }
    } catch (error) {
      console.error("Screenshot failed:", error);
      this.controller.updateStatus("Capture failed. Check console.");
    }

    if (panel) {
      if (panelNext && panelNext.parentNode) {
        panelNext.parentNode.insertBefore(panel, panelNext);
      } else {
        document.body.appendChild(panel);
      }
    }
    if (highlight) document.body.appendChild(highlight);

    this.controller.clearSelection();
    this.updateButtons();
  }

  getPanelHTML() {
    return `
      <button class="pagesurgeon-panel__button pagesurgeon-panel__button--action" id="modeActionBtn" disabled>
        📷 Capture Screenshot
      </button>
      <button class="pagesurgeon-panel__button pagesurgeon-panel__button--cancel" id="modeCancelBtn">
        ❌ Cancel
      </button>
      <div class="pagesurgeon-panel__info">
        Select an element, then click Capture. Saved to Downloads.
      </div>
    `;
  }

  updateButtons() {
    const btn = document.getElementById("modeActionBtn");
    if (btn) btn.disabled = !this.controller.selectedElement;
  }
}
