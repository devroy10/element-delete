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
      if (isFullyInViewport(el)) {
        await this._captureViewport(el, dpr);
      } else {
        await this._captureScrolling(el, dpr);
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

  async _captureViewport(el, dpr) {
    const rect = el.getBoundingClientRect();
    const result = await chrome.runtime.sendMessage({
      type: "CAPTURE_ELEMENT",
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      dpr: dpr,
      filename: `pagesurgeon-${Date.now()}.png`,
    });
    if (result && result.success) {
      this.controller.updateStatus("Screenshot saved! ✓");
    } else {
      this.controller.updateStatus("Capture failed. Try again.");
    }
  }

  async _captureScrolling(el, dpr) {
    const container = findScrollContainer(el);
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();

    const elemLeft = eRect.left - cRect.left + container.scrollLeft;
    const elemTop = eRect.top - cRect.top + container.scrollTop;
    const elemW = eRect.width;
    const elemH = eRect.height;
    const vw = container.clientWidth;
    const vh = container.clientHeight;

    const scroller = new ScrollCapture({
      container,
      viewW: vw,
      viewH: vh,
      contentW: elemLeft + elemW,
      contentH: elemTop + elemH,
    });

    const stitcher = new Stitcher(elemW * dpr, elemH * dpr);
    const restorePage = preparePageForCapture(el, container);

    let tile;
    while ((tile = scroller.next())) {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 80)));

      const result = await chrome.runtime.sendMessage({ type: "CAPTURE_TILE", dpr });
      if (!result || !result.dataUrl) continue;

      const blob = await (await fetch(result.dataUrl)).blob();
      const img = await createImageBitmap(blob);

      const vpLeft = tile.x;
      const vpTop = tile.y;
      const vpRight = tile.x + vw;
      const vpBottom = tile.y + vh;

      const interLeft = Math.max(elemLeft, vpLeft);
      const interTop = Math.max(elemTop, vpTop);
      const interRight = Math.min(elemLeft + elemW, vpRight);
      const interBottom = Math.min(elemTop + elemH, vpBottom);

      if (interLeft < interRight && interTop < interBottom) {
        const srcX = (interLeft - vpLeft) * dpr;
        const srcY = (interTop - vpTop) * dpr;
        const srcW = (interRight - interLeft) * dpr;
        const srcH = (interBottom - interTop) * dpr;
        const destX = (interLeft - elemLeft) * dpr;
        const destY = (interTop - elemTop) * dpr;

        stitcher.blit(img, srcX, srcY, srcW, srcH, destX, destY);
      }
    }

    scroller.restore();
    restorePage();
    const blob = await stitcher.finalize();
    const dataUrl = await blobToDataUrl(blob);

    await chrome.runtime.sendMessage({
      type: "DOWNLOAD_BLOB",
      url: dataUrl,
      filename: `pagesurgeon-${Date.now()}.png`,
    });

    this.controller.updateStatus("Screenshot saved! ✓");
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
        Select an element, then click Capture. Captures full element even if scrolled off-screen.
      </div>
    `;
  }

  updateButtons() {
    const btn = document.getElementById("modeActionBtn");
    if (btn) btn.disabled = !this.controller.selectedElement;
  }
}
