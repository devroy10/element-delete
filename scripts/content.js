class ModeController {
  constructor() {
    this.modes = {
      delete: new DeleteMode(),
      edit: new EditMode(),
      screenshot: new ScreenshotMode(),
      blur: new BlurMode(),
    };

    this.currentMode = null;
    this.currentModeName = "delete";
    this.isActive = false;
    this.hoveredElement = null;
    this.selectedElement = null;
    this.highlightBox = null;
    this.sidePanel = null;
    this.isInitialized = false;

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleElementClick = this.handleElementClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.init();
  }

  init() {
    if (this.isInitialized) return;
    try {
      this.createSidePanel();
      this.bindEvents();
      this.applyPersistentBlurs();
      this.isInitialized = true;
    } catch (error) {
      console.error("PageSurgeon init failed:", error);
    }
  }

  async applyPersistentBlurs() {
    try {
      const { blurRules = [] } = await chrome.storage.local.get("blurRules");
      const rules = blurRules.filter((r) =>
        location.hostname.endsWith(r.urlPattern.replace("/*", ""))
      );

      for (const rule of rules) {
        const el = document.querySelector(rule.selector);
        if (el) {
          el.style.filter = `blur(${rule.blurPx}px)`;
          el.style.pointerEvents = "none";
          el.style.userSelect = "none";
        }
      }

      if (rules.length > 0) {
        const observer = new MutationObserver(() => {
          for (const rule of rules) {
            const el = document.querySelector(rule.selector);
            if (el && !el.style.filter) {
              el.style.filter = `blur(${rule.blurPx}px)`;
              el.style.pointerEvents = "none";
              el.style.userSelect = "none";
            }
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    } catch (error) {
      console.error("Failed to apply persistent blurs:", error);
    }
  }

  createSidePanel() {
    this.sidePanel = document.createElement("div");
    this.sidePanel.className = "pagesurgeon-panel";
    this.sidePanel.innerHTML = `
      <div class="pagesurgeon-panel__header">
        <h3 class="pagesurgeon-panel__title">PageSurgeon</h3>
      </div>
      <div class="pagesurgeon-panel__body">
        <div class="pagesurgeon-panel__status">
          <span class="pagesurgeon-panel__status-text" id="panelStatus">Ready</span>
        </div>
        <div class="pagesurgeon-panel__actions" id="panelActions"></div>
      </div>
    `;
    document.body.appendChild(this.sidePanel);
  }

  bindEvents() {
    window.addEventListener("message", (event) => {
      if (event.data.type === "PAGESURGEON_TOGGLE") {
        this.isActive ? this.deactivate() : this.activate();
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.type) {
        case "SET_MODE":
          this.setMode(request.mode);
          sendResponse({ success: true });
          break;
        case "ACTIVATE":
          this.activate();
          sendResponse({ success: true });
          break;
        case "DEACTIVATE":
          this.deactivate();
          sendResponse({ success: true });
          break;
        case "GET_STATUS":
          sendResponse({
            isActive: this.isActive,
            mode: this.currentModeName,
          });
          break;
      }
      return true;
    });
  }

  setMode(modeName) {
    if (this.currentMode && this.isActive) {
      this.currentMode.deactivate();
    }
    this.currentModeName = modeName;
    this.currentMode = this.modes[modeName];
    this.clearSelection();
    if (this.isActive) {
      this.currentMode.activate(this);
    }
  }

  activate() {
    if (this.isActive) return;
    this.isActive = true;
    this.currentMode = this.modes[this.currentModeName];
    this.sidePanel.classList.add("pagesurgeon-panel--visible");
    this.enableElementSelection();
    this.currentMode.activate(this);
  }

  deactivate() {
    if (!this.isActive) return;
    this.isActive = false;
    this.sidePanel.classList.remove("pagesurgeon-panel--visible");
    this.disableElementSelection();
    this.clearSelection();
    if (this.currentMode) {
      this.currentMode.deactivate();
    }
  }

  enableElementSelection() {
    document.body.classList.add("pagesurgeon-cursor");
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("click", this.handleElementClick, true);
    document.addEventListener("keydown", this.handleKeyDown);
  }

  disableElementSelection() {
    document.body.classList.remove("pagesurgeon-cursor");
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("click", this.handleElementClick, true);
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  handleMouseMove(event) {
    if (!this.isActive) return;
    if (this.selectedElement) return;
    const target = event.target;
    if (!target || DomUtils.isExtensionElement(target) || target === this.hoveredElement) return;
    this.hoveredElement = target;
    if (this.currentMode) {
      this.currentMode.onHover(target);
    }
  }

  handleElementClick(event) {
    if (!this.isActive) return;
    if (DomUtils.isExtensionElement(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.currentMode && this.hoveredElement) {
      this.currentMode.onSelect(this.hoveredElement);
    }
  }

  handleKeyDown(event) {
    if (!this.isActive) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (this.currentMode) {
        this.currentMode.onEscape();
      }
    } else if (event.key === "Delete" && this.currentModeName === "delete") {
      event.preventDefault();
      this.currentMode.onAction();
    } else if ((event.ctrlKey || event.metaKey) && event.key === "z" && this.currentModeName === "delete") {
      event.preventDefault();
      this.currentMode.onUndo();
    } else if (event.key === "Enter" && this.currentModeName === "edit") {
      this.currentMode.onAction();
    }
  }

  showHighlight(element) {
    if (!this.highlightBox) {
      this.highlightBox = document.createElement("div");
      this.highlightBox.className = "pagesurgeon-highlight";
      document.body.appendChild(this.highlightBox);
    }
    const rect = element.getBoundingClientRect();
    this.highlightBox.style.left = `${rect.left + window.scrollX}px`;
    this.highlightBox.style.top = `${rect.top + window.scrollY}px`;
    this.highlightBox.style.width = `${rect.width}px`;
    this.highlightBox.style.height = `${rect.height}px`;
    if (element !== this.selectedElement) {
      this.highlightBox.classList.remove("pagesurgeon-highlight--selected");
    }
  }

  hideHighlight() {
    if (this.highlightBox) {
      this.highlightBox.style.display = "none";
    }
  }

  highlightAsSelected() {
    if (this.highlightBox) {
      this.highlightBox.classList.add("pagesurgeon-highlight--selected");
    }
  }

  clearSelection() {
    this.selectedElement = null;
    this.hoveredElement = null;
    if (this.highlightBox) {
      this.highlightBox.remove();
      this.highlightBox = null;
    }
  }

  updatePanelContent(html) {
    const actions = document.getElementById("panelActions");
    if (actions) {
      actions.innerHTML = html;
    }
    const cancelBtn = document.getElementById("modeCancelBtn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.deactivate());
    }
    const actionBtn = document.getElementById("modeActionBtn");
    if (actionBtn && this.currentModeName !== "edit") {
      actionBtn.addEventListener("click", () => this.currentMode.onAction());
    }
    const undoBtn = document.getElementById("modeUndoBtn");
    if (undoBtn) {
      undoBtn.addEventListener("click", () => this.currentMode.onUndo());
    }
  }

  updateStatus(text) {
    const statusEl = document.getElementById("panelStatus");
    if (statusEl) {
      statusEl.innerHTML = text;
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new ModeController());
} else {
  new ModeController();
}
