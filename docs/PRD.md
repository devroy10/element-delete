# Product Requirements Document: PageSurgeon

## 1. Overview

### 1.1 Product Name

**PageSurgeon** (formerly "Element Delete")

### 1.2 Product Description

A Chrome Extension that surgically manipulates webpage elements — delete, edit text, screenshot, and blur — all through a visual point-and-click interface.

### 1.3 Target Users

- Web developers and designers doing quick DOM tweaks
- Content creators taking clean screenshots or recordings
- Technical writers making tutorials with blurred sensitive data
- QA testers inspecting or cleaning up pages
- Privacy-conscious users blurring personal info on shared screens

### 1.4 Guiding Principles

- **Shared foundation**: All modes use the same hover-to-highlight, click-to-select interaction
- **Deterministic blur**: Blurred elements survive page reloads via URL + CSS-selector storage
- **Native APIs first**: Screenshots use `chrome.tabs.captureVisibleTab` — no extra libraries
- **Mode isolation**: Only one mode active at a time; clean entry and exit

---

## 2. Architecture Change — Multi-Mode Design

### 2.1 Current State

One monolithic mode: selection = delete. The side panel has Delete/Undo/Cancel.

### 2.2 Target State

A **mode-driven architecture** where the user picks a mode, then interacts via the shared select-and-act pattern.

```
Popup                         Content Script                Page
┌──────────┐                 ┌──────────────────┐
│ Mode:    │  ──runtime────> │ ModeController   │──manage──> Highlight overlay
│ [Delete] │    onMessage    │   .activate()    │──manage──> Side panel
│ [Edit]   │                 │   .deactivate()  │──listen──> mousemove/click/keydown
│ [Blur]   │                 │   .handleHover() │
│ [Screenshot]│              │   .handleSelect()│
└──────────┘                 │                  │
                             │ Modes:           │
Service Worker               │  DeleteMode      │
┌──────────┐                 │  EditTextMode    │
│ onInstalled │              │  ScreenshotMode  │
│ action     │──postMessage─>│  BlurMode        │
│ onClicked  │               └──────────────────┘
└──────────┘
```

### 2.3 File Structure (Proposed)

```
pagesurgeon/
├── manifest.json
├── popup.html
├── icons/
├── styles/
│   ├── popup.css
│   └── panel.css
├── scripts/
│   ├── background.js         # Service worker
│   ├── popup.js              # Popup UI logic
│   ├── content.js            # Mode controller + shared infrastructure
│   ├── modes/
│   │   ├── delete-mode.js    # Existing delete/undo logic
│   │   ├── edit-mode.js      # Inline text editing
│   │   ├── screenshot-mode.js# Element screenshot
│   │   └── blur-mode.js      # Blur + storage
│   └── utils/
│       ├── selector-engine.js     # Deterministic CSS selector generation
│       ├── storage.js             # chrome.storage wrapper
│       └── dom-utils.js           # Shared DOM helpers
└── docs/
    └── PRD.md
```

### 2.4 Messaging Map

| From | To | Type | When |
|---|---|---|---|
| Popup | Content | `SET_MODE` | User picks a mode |
| Popup | Content | `DEACTIVATE` | User hits Cancel / Escape |
| Content | Popup | `STATUS_UPDATE` | Mode changed, element selected, action done |
| Background | Content (via postMessage) | `TOGGLE` | Icon clicked |
| Content | Background | `CAPTURE_SCREENSHOT` | Screenshot mode action |
| Background | Content | `SCREENSHOT_RESULT` | Data URL returned |

### 2.5 Permissions (Expanded)

```json
{
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "downloads"
  ],
  "host_permissions": ["<all_urls>"]
}
```

- `storage` — persist blur rules
- `downloads` — save screenshots
- `activeTab` + `scripting` — already present; `captureVisibleTab` is covered by `activeTab`

---

## 3. Feature 1 — Edit Text Mode

### 3.1 User Story

> As a user, I want to click on any text element and edit its content inline, just like I would in a rich text editor.

### 3.2 Interaction Flow

1. User selects **Edit Text** mode in popup
2. Content script activates the shared selection layer (hover highlight, click to select)
3. User hovers over elements — supported text elements get highlighted
4. User clicks a text element → element becomes `contenteditable`
5. Element gets a visible editing indicator (pulsing border, focus ring)
6. User types to modify text
7. User presses **Escape** to cancel editing (revert to original text)
8. User presses **Enter** (for single-line) or clicks away to commit changes
9. Side panel shows status: "Editing <tagname>"

### 3.3 Target Elements

Naturally editable: `p`, `h1`–`h6`, `span`, `a`, `li`, `td`, `th`, `label`, `figcaption`, `blockquote`, `cite`, `strong`, `em`, `b`, `i`, `u`, `small`, `sub`, `sup`

Also allowed: `div`, `section`, `article` — only if they contain **only text** (no block children), detected by `element.children.length === 0`

### 3.4 Technical Spec

```javascript
class EditTextMode {
  // State
  editingElement = null;
  originalText = null;

  onHover(element) { /* highlight if text-capable */ }
  onSelect(element) {
    // Make contenteditable, focus, select all text
    element.contentEditable = "true";
    element.focus();
    // Select all text inside
    const range = document.createRange();
    range.selectNodeContents(element);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  onEscape() { /* restore original text, exit edit mode */ }
  onBlur() { /* commit changes */ }
  onEnter(event) { /* if single-line, prevent newline and blur */ }
  cleanup() { /* restore contentEditable, remove listeners */ }
}
```

### 3.5 Undo / Redo

- Use `document.execCommand("undo")` / `"redo"` inside the contenteditable for in-field undo (Ctrl+Z)
- Full undo stack stored: text changes are tracked per session

### 3.6 Edge Cases

- **Empty elements**: Allow editing, add placeholder text
- **Nested elements** (`<p>Hello <strong>world</strong></p>`): Edit as HTML (advanced) or flatten to text (v1). Start with flattening — replace innerHTML with plain text on edit start.
- **iframe content**: Not supported in v1
- **SVG/foreignObject**: Not supported in v1
- **Max length**: No enforced limit

---

## 4. Feature 2 — Screenshot Mode

### 4.1 User Story

> As a user, I want to select an element on the page and capture a clean screenshot of just that element, saved to my downloads.

### 4.2 Interaction Flow

1. User selects **Screenshot** mode in popup
2. Hover highlights potential elements (same as delete)
3. Click to select an element → it gets a capture overlay (dotted green border)
4. Side panel shows: **"Capture"** button (plus element info: tag, dimensions)
5. User clicks **Capture** → screenshot is taken, cropped to element bounds, downloaded
6. Mode stays active for another capture, or user exits via Escape/Cancel

### 4.3 Technical Approach

Uses the **native Chrome `chrome.tabs.captureVisibleTab`** API + canvas cropping:

```
1. Content script sends { type: "CAPTURE_SCREENSHOT", rect: {x, y, w, h} }
   to the background service worker

2. Background script calls:
     const dataUrl = await chrome.tabs.captureVisibleTab(tabId, { format: "png" });

3. Background script crops the image to the element rect using an OffscreenCanvas:
     - Decode dataUrl into ImageBitmap
     - Draw subset onto OffscreenCanvas
     - Export as cropped blob

4. Background script triggers download:
     chrome.downloads.download({ url: croppedDataUrl, filename: "element.png" });

   Or optionally sends cropped data URL back to content script for preview
```

### 4.4 API Details

- `chrome.tabs.captureVisibleTab(windowId?, options, callback)` — captures the **visible viewport** only (not full page). For full-page screenshots, scrolling would be needed, but for v1, viewport-only is acceptable.
- The element rect comes from `getBoundingClientRect()` (viewport coordinates), so it aligns with the captured image.
- `OffscreenCanvas` is available in service workers in Chrome.

### 4.5 Edge Cases

- **Element larger than viewport**: Capture what's visible, note the limitation in the panel. Future: scroll-and-stitch.
- **Fixed/sticky elements**: May overlap the captured area. Acceptable in v1.
- **Element hidden/offscreen**: Detect via `offsetParent === null` or rect not in viewport. Show warning in panel.
- **Canvas/WebGL content**: Captured as raster (correct). No SVG vector capture in v1.
- **High-DPI / devicePixelRatio**: Account for `devicePixelRatio` when cropping — multiply rect coords.
- **Permission denial**: If user denies `activeTab` permission grant, show graceful error.

---

## 5. Feature 3 — Blur Mode

### 5.1 User Story

> As a tutorial creator, I want to select sensitive elements (email, name, avatar) on a page, blur them, and have them stay blurred every time I visit that page — without any setup.

### 5.2 Interaction Flow

1. User selects **Blur** mode in popup
2. Hover highlights elements (same shared interaction)
3. Click to select an element → it gets a blurred overlay applied ("live preview")
4. Side panel shows element info + **"Apply Blur"** button
5. User clicks **Apply Blur**:
   - A deterministic CSS selector is generated for the element
   - A blur rule `{ url: "example.com/*", selector: "#email", blur: "8px" }` is saved to `chrome.storage.local`
   - The blur is applied immediately (CSS `filter: blur(8px)`)
6. On any subsequent page load matching the URL pattern, the content script:
   - Reads blur rules from storage
   - Queries matching selectors
   - Applies `filter: blur(8px)` + `pointer-events: none`
7. User can manage/remove blur rules via the popup or side panel

### 5.3 Deterministic Selector Generation

The selector must survive DOM changes. Strategy — generate the **most specific stable selector**:

```javascript
function generateSelector(element) {
  // Priority order:
  // 1. id          -> "#header"                          (most stable)
  // 2. unique class -> ".email-12345"                     (risky if dynamic)
  // 3. a11y role    -> "[aria-label='Email']"             (stable)
  // 4. data-testid -> "[data-testid='user-email']"        (stable in test envs)
  // 5. nth-path    -> "body > div:nth(2) > p:nth(3)"     (fragile — last resort)
}
```

For v1, use **CSS selector path** with preference for `id` and `[data-testid]` / `[aria-label]`. Store as `chrome.storage.local`:

```json
{
  "blurRules": [
    {
      "id": "uuid",
      "urlPattern": "github.com/*",
      "selector": ".email-display",
      "blurPx": 8,
      "created": "2026-07-08T..."
    }
  ]
}
```

### 5.4 Reapplication on Page Load

```javascript
// In content.js on DOMContentLoaded:
async function applyBlurRules() {
  const { blurRules } = await chrome.storage.local.get("blurRules");
  const rules = blurRules.filter(r => urlMatches(r.urlPattern, location.href));

  for (const rule of rules) {
    const el = document.querySelector(rule.selector);
    if (el) {
      el.style.filter = `blur(${rule.blurPx}px)`;
      el.style.pointerEvents = "none";
      el.style.userSelect = "none";
    }
  }
}

// Use MutationObserver for dynamic content:
function watchForBlurElements(rules) { ... }
```

### 5.5 URL Pattern Matching

Use a simple glob-style matcher:
- `*` matches anything
- `example.com/*` matches any path on example.com
- `api.example.com/*` matches subdomain
- `*://*/*` matches all pages (global blur)

### 5.6 Blur Rule Management

Popup UI additions:
- **"Manage Blurs"** button → opens a list of saved rules
- Each rule shows: URL pattern, selector, blur intensity
- Options: **Remove**, **Edit intensity**, **Toggle on/off**

Side panel additions:
- Slider or input for blur intensity (4px / 8px / 16px / 32px)
- After applying: "Blur saved" confirmation

### 5.7 Edge Cases

- **Element not found on reload**: The rule exists but `querySelector` returns null. Possible if the selector is too fragile. Log a warning. The rule stays until manually removed.
- **Dynamic content (SPA)**: Use `MutationObserver` to retry matching on DOM changes.
- **Multiple blurs on one page**: Support many; each gets its own `<style>` or inline style.
- **Blur + other modes**: Blur is a permanent modification (survives reload). Other modes are session-only.
- **Undo blur**: Option to remove blur (reverses filter). This removes the rule from storage and clears the style.
- **Blurred element becomes interactive**: Set `pointer-events: none` to prevent interaction with blurred content.

---

## 6. UI Changes

### 6.1 Popup Redesign

```
┌──────────────────────────────┐
│        PageSurgeon           │
│    Surgical page editing     │
├──────────────────────────────┤
│ Status: Inactive             │
│                              │
│ Mode Selection:              │
│  ○  Delete     ← default     │
│  ○  Edit Text                │
│  ○  Screenshot               │
│  ○  Blur                     │
│                              │
│ [ Activate Mode ]            │
│                              │
│ [ Manage Blur Rules ]        │
│         [ Help ]             │
│                              │
│         v0.2.0               │
└──────────────────────────────┘
```

### 6.2 Side Panel Per Mode

**Delete Mode** (existing, unchanged):
```
[🗑️ Delete Element]
[↩️ Undo]
[❌ Cancel]
```

**Edit Text Mode**:
```
Status: Editing <p>
[💾 Save & Exit]
[↩️ Cancel Edit]
[❌ Exit Mode]
```

**Screenshot Mode**:
```
Status: Selected <div> 400x300
[📷 Capture Screenshot]
     → downloads as element-2026-07-08.png
[❌ Cancel]
```

**Blur Mode**:
```
Status: Selected <span> "email"
Blur intensity: [====o====] 8px
[🔵 Apply & Save Blur]
[↩️ Remove Blur]
[❌ Cancel]
```

---

## 7. Implementation Plan

### Phase 1 — Foundation Refactor

| # | Task | Description |
|---|---|---|
| 1.1 | Rename project to PageSurgeon | Update manifest.json name/description, popup.html title, file comments |
| 1.2 | Refactor content.js into mode controller | Extract shared infra (highlight, panel, event binding) into a `ModeController` class |
| 1.3 | Create mode interface | Each mode implements `activate()`, `deactivate()`, `onHover()`, `onSelect()`, `cleanup()` |
| 1.4 | Extract delete logic into delete-mode.js | Move existing delete/undo code into `DeleteMode` class |
| 1.5 | Update popup UI for mode selection | Radio buttons / dropdown for mode selection |
| 1.6 | Update messaging | Add `SET_MODE` message type, update popup ↔ content protocol |

### Phase 2 — Edit Text Mode

| # | Task | Description |
|---|---|---|
| 2.1 | Create edit-mode.js | `EditTextMode` class with contenteditable logic |
| 2.2 | Add keyboard handling | Enter to commit, Escape to cancel, proper focus management |
| 2.3 | Add visual edit indicator | Pulsing border/focus ring on editable element |
| 2.4 | Handle edge cases | Nested text, empty elements, non-text targets |

### Phase 3 — Screenshot Mode

| # | Task | Description |
|---|---|---|
| 3.1 | Create screenshot-mode.js | `ScreenshotMode` class |
| 3.2 | Implement captureVisibleTab + crop | Service worker captures, crops via OffscreenCanvas |
| 3.3 | Add download trigger | `chrome.downloads.download` |
| 3.4 | Add visual capture indicator | Dotted border overlay on selected element |
| 3.5 | Handle DPI | Multiply rect by `devicePixelRatio` |

### Phase 4 — Blur Mode

| # | Task | Description |
|---|---|---|
| 4.1 | Create blur-mode.js | `BlurMode` class |
| 4.2 | Create selector-engine.js | Deterministic CSS selector generation |
| 4.3 | Create storage.js | `chrome.storage.local` wrapper for blur rules |
| 4.4 | Implement rule reapplication | On page load + MutationObserver for dynamic DOM |
| 4.5 | Create URL pattern matcher | Glob-style matching helper |
| 4.6 | Add Manage Blurs UI | Popup page listing saved rules with remove/toggle |
| 4.7 | Handle edge cases | Element not found, SPA dynamic content |

---

## 8. Success Criteria

### 8.1 Functional

- All 4 modes activate/deactivate cleanly without page refresh
- Delete mode works as before (regression): select → delete → undo
- Edit mode allows inline text editing on p, span, h1–h6, li, a
- Screenshot mode captures elements ≤ viewport and saves to downloads
- Blur mode persists across page reloads for matching URL patterns
- Blur rules are manageable (add, remove, toggle)

### 8.2 Performance

- No noticeable lag on hover in any mode (highlight debounced)
- Screenshot capture completes in < 2 seconds
- Blur reapplication completes before page is interactive (< 100ms)
- Storage footprint < 100KB for typical rule sets

### 8.3 UX

- Single click to start interacting in any mode
- Clear mode indicator in side panel and popup
- Escape exits current mode; double Escape exits to inactive
- Keyboard shortcuts documented and consistent across modes
- All existing Element Delete functionality preserved

---

## 9. Future (Post-v2)

- **Full-page screenshot** with scroll-and-stitch
- **Blur rule sharing** export/import as JSON
- **Batch blur** — blur multiple elements in one action
- **Element picker** — direct DevTools-style element selector input
- **Custom CSS injection** beyond blur (hide, highlight, outline)
- **History panel** — full session log of all modifications
