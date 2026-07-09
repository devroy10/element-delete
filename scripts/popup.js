class PopupManager {
  constructor() {
    this.elements = {
      statusValue: document.getElementById("statusValue"),
      activateButton: document.getElementById("activateButton"),
      helpButton: document.getElementById("helpButton"),
      helpSteps: document.getElementById("helpSteps"),
      modeInputs: document.querySelectorAll('input[name="mode"]'),
    };

    this.isActive = false;
    this.currentMode = "delete";
    this.init();
  }

  async sendMessage(tabId, message) {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch {
      return null;
    }
  }

  init() {
    this.bindEvents();
    this.checkExtensionStatus();
  }

  bindEvents() {
    this.elements.activateButton.addEventListener("click", () => {
      this.toggleMode();
    });

    this.elements.helpButton.addEventListener("click", () => {
      this.showHelp();
    });

    this.elements.modeInputs.forEach((input) => {
      input.addEventListener("change", (e) => {
        this.currentMode = e.target.value;
        this.updateActivateButtonLabel();
        this.updateHelpSteps();
        if (this.isActive) {
          this.sendSetMode(this.currentMode);
        }
      });
    });
  }

  async checkExtensionStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        const response = await this.sendMessage(tab.id, { type: "GET_STATUS" });
        if (response) {
          this.isActive = response.isActive;
          this.currentMode = response.mode || "delete";
          this.syncUI();
        }
      }
    } catch {
      // content script not available
    }
  }

  async toggleMode() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    if (this.isActive) {
      await this.sendMessage(tab.id, { type: "DEACTIVATE" });
      this.isActive = false;
    } else {
      await this.sendMessage(tab.id, {
        type: "SET_MODE",
        mode: this.currentMode,
      });
      await this.sendMessage(tab.id, { type: "ACTIVATE" });
      this.isActive = true;
    }
    this.syncUI();
  }

  async sendSetMode(mode) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await this.sendMessage(tab.id, { type: "SET_MODE", mode });
    }
  }

  syncUI() {
    if (this.isActive) {
      this.elements.statusValue.textContent = `Active (${this.currentMode})`;
      this.elements.statusValue.className =
        "popup__status-value popup__status-value--active";
      this.elements.activateButton.textContent = "Deactivate";
    } else {
      this.elements.statusValue.textContent = "Inactive";
      this.elements.statusValue.className =
        "popup__status-value popup__status-value--inactive";
      this.updateActivateButtonLabel();
    }
    this.syncModeRadio();
    this.updateHelpSteps();
  }

  syncModeRadio() {
    this.elements.modeInputs.forEach((input) => {
      input.checked = input.value === this.currentMode;
    });
  }

  updateActivateButtonLabel() {
    if (!this.isActive) {
      const labels = {
        delete: "Activate Delete",
        edit: "Activate Edit Text",
        screenshot: "Activate Screenshot",
        blur: "Activate Blur",
      };
      this.elements.activateButton.textContent =
        labels[this.currentMode] || "Activate";
    }
  }

  updateHelpSteps() {
    const steps = {
      delete: [
        'Click "Activate Delete" to start',
        "Hover over elements to highlight them",
        "Click to select an element",
        "Press Delete or click 🗑️ Delete Element",
        "Press Ctrl+Z or click ↩️ Undo to restore",
      ],
      edit: [
        'Click "Activate Edit Text" to start',
        "Hover over text elements (p, h1, span, etc.)",
        "Click a text element to make it editable",
        "Type to edit the text",
        "Press Enter or click away to save",
      ],
      screenshot: [
        'Click "Activate Screenshot" to start',
        "Hover over elements to highlight them",
        "Click to select an element",
        'Click 📷 Capture Screenshot',
        "Image saved to your Downloads folder",
      ],
      blur: [
        'Click "Activate Blur" to start',
        "Hover over elements to highlight them",
        "Click to select an element",
        'Click 🔵 Apply & Save Blur',
        "The blur persists across page reloads",
      ],
    };

    const list = this.elements.helpSteps;
    list.innerHTML = steps[this.currentMode]
      .map((s) => `<li>${s}</li>`)
      .join("");
  }

  showHelp() {
    const helpDiv = document.createElement("div");
    helpDiv.className = "popup__help-overlay";
    helpDiv.innerHTML = `
      <div class="popup__help-content">
        <h2>PageSurgeon Help</h2>
        <div class="popup__help-section">
          <strong>Modes</strong>
          <p>🗑️ Delete — Remove elements from the page</p>
          <p>✏️ Edit Text — Edit text content inline</p>
          <p>📷 Screenshot — Capture element screenshots</p>
          <p>🔵 Blur — Blur elements persistently</p>
        </div>
        <div class="popup__help-section">
          <strong>Keyboard Shortcuts</strong>
          <p>• Escape: Exit current mode</p>
          <p>• Delete: Delete selected element (Delete mode)</p>
          <p>• Ctrl+Z: Undo deletion (Delete mode)</p>
          <p>• Enter: Save text (Edit Text mode)</p>
        </div>
        <div class="popup__help-section">
          <strong>Blur Mode</strong>
          <p>Blurs are saved to browser storage. They re-apply when you visit the page again.</p>
        </div>
        <button class="popup__button popup__button--primary" id="helpCloseBtn">Got it</button>
      </div>
    `;
    document.body.appendChild(helpDiv);
    document.getElementById("helpCloseBtn").addEventListener("click", () => {
      helpDiv.remove();
    });
    helpDiv.addEventListener("click", (e) => {
      if (e.target === helpDiv) helpDiv.remove();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
});
