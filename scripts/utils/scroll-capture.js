const StyleController = (() => {
  const POSITIONED = new Set(["absolute", "fixed", "relative", "sticky"]);

  let stack = [];
  let fixedStack = [];

  function saveAndSet(el, props) {
    if (!el || !el.style) return () => {};
    const prevCss = el.style.cssText;
    let css = prevCss ? prevCss + "; " : "";
    for (const [prop, val] of Object.entries(props)) {
      css += `${prop}: ${val} !important; `;
    }
    el.style.cssText = css;
    return () => { el.style.cssText = prevCss; };
  }

  function push(restoreFn) {
    stack.push({ action: "func", undo: restoreFn });
  }

  function pushFixed(restoreFn) {
    fixedStack.push({ action: "func", undo: restoreFn });
  }

  function pop(stack) {
    const entry = stack.pop();
    if (entry) {
      if (entry.action === "func") entry.undo();
      else if (entry.action === "new_elt") entry.elt.remove();
      else if (entry.action === "css") entry.elt.style.cssText = entry.before;
      else if (entry.action === "removed_attr") entry.elt.setAttribute(entry.attr, entry.value);
    }
  }

  const controller = {
    init(targetElement, container) {
      stack = [];
      fixedStack = [];

      this.addStyleSheet(`*, *::before, *::after {
        transition: none !important;
        transition-delay: 0s !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
      }`);

      const html = document.documentElement;
      this.add(html, { scrollBehavior: "unset", height: "auto", minHeight: "100%" });

      const body = document.body;
      if (body) {
        this.add(body, { height: "auto", minHeight: "100%" });
        const bodyStyle = window.getComputedStyle(body);
        if (bodyStyle.overflowY === "scroll") {
          this.add(body, { overflowY: "visible" });
        }
      }

      this.hideScrollbars(html);
      this.fixHangingAbsolutes(body);
      this.fixFixedPseudos(body);
      this.fixParallax();
      this.fixSiteSpecific();
      this.unlockAncestors(container);

      if (container !== html) {
        this.add(container, { overflow: "visible", scrollBehavior: "unset" });
      }
    },

    initFixed() {
      const body = document.body;
      if (!body) return;
      const style = window.getComputedStyle(body);
      if (style.position === "absolute") return;

      const updates = { position: "relative" };
      if (style.display === "inline") updates.display = "block";

      if (style.maxWidth === "none" && this.pxToInt(style.minWidth) === 0 && this.pxToInt(style.marginLeft) === 0) {
        updates.minWidth = "100vw";
      }
      if (style.maxHeight === "none" && this.pxToInt(style.minHeight) === 0) {
        updates.minHeight = "100vh";
      }

      const marginTop = this.pxToInt(style.marginTop);
      if (marginTop !== 0) {
        updates.paddingTop = `${this.pxToInt(style.paddingTop) + marginTop}px`;
        updates.marginTop = "0px";
      }
      const marginBottom = this.pxToInt(style.marginBottom);
      if (marginBottom !== 0) {
        updates.paddingBottom = `${this.pxToInt(style.paddingBottom) + marginBottom}px`;
        updates.marginBottom = "0px";
      }

      if (Object.keys(updates).length > 1) {
        const hasBorder = ["paddingTop","paddingBottom","borderTopWidth","borderBottomWidth"]
          .some(p => style[p] && style[p] !== "0px");
        const paddingChange = "paddingTop" in updates || "paddingBottom" in updates;
        if (hasBorder && paddingChange && style.boxSizing === "content-box") {
          updates.boxSizing = "border-box";
        }
      }

      this.add(body, updates);
    },

    updateFixed(container, viewW, viewH, scrollX, scrollY, isTopOfElt, hideElts) {
      const addFixed = (el, props) => {
        const restore = saveAndSet(el, props);
        fixedStack.push({ action: "func", undo: restore });
      };

      const candidates = this.findFixedAndSticky(container);
      const { fixed, sticky, fixedBg, innerAbsolutes, fixedHeaders } = candidates;

      fixedHeaders.forEach(el => {
        addFixed(el, { visibility: "hidden", overflow: "hidden" });
      });

      fixed.forEach(el => {
        const style = window.getComputedStyle(el);
        const left = this.pxToFloat(style.left);
        const right = this.pxToFloat(style.right);
        const top = this.pxToFloat(style.top);
        const bottom = this.pxToFloat(style.bottom);
        const width = this.pxToFloat(style.width);
        const height = this.pxToFloat(style.height);
        const scrollH = el.scrollHeight;
        const overflowY = style.overflowY;

        const cmap = el.computedStyleMap ? el.computedStyleMap() : null;
        const specified = {};
        ["left","right","top","bottom","width","height"].forEach(p => {
          specified[p] = cmap && cmap.get(p) && cmap.get(p).value !== "auto";
        });

        addFixed(el, { position: "absolute", transition: "none" });

        const offsetParent = el.offsetParent;
        if (!offsetParent) return;

        const parRect = this.getOffsetRect(offsetParent);
        const windowW = viewW;
        const windowH = viewH;

        const relLeft = left - parRect.left;
        const relRight = right - (windowW - (parRect.left + parRect.width));
        const relTop = top - parRect.top;
        const relBottom = bottom - (windowH - (parRect.top + parRect.height));

        const props = {};
        let hasChanges = false;

        if (!isNaN(relLeft) && relLeft <= 0) {
          hasChanges = true;
          props.left = `${relLeft}px`;
        } else if (specified.right && !isNaN(relRight)) {
          hasChanges = true;
          props.right = `${relRight}px`;
        }

        if (!isNaN(relTop) && relTop <= 0) {
          hasChanges = true;
          let h = height;
          if (overflowY === "scroll" || overflowY === "auto") {
            h = Math.max(h, scrollH);
          }
          props.height = `${h}px`;
          if (specified.top || specified.bottom) {
            if (specified.top) props.top = `${relTop}px`;
            if (specified.bottom) props.bottom = `${relBottom}px`;
          } else {
            if (bottom === 0 && offsetParent.getBoundingClientRect().height !== 0) {
              props.bottom = "0px";
            } else {
              props.top = `${relTop}px`;
              props.bottom = "auto";
            }
          }
        } else if (specified.bottom && !isNaN(relBottom)) {
          hasChanges = true;
          if (bottom === 0 && offsetParent.getBoundingClientRect().height !== 0) {
            props.bottom = "0px";
          } else {
            props.bottom = `${relBottom}px`;
          }
        }

        if ((props.left && !props.right) || (props.right && !props.left)) {
          if (specified.width) props.width = `${width}px`;
        }

        if (hasChanges) {
          if (props.width) props.maxWidth = props.width;
          if (props.height) props.maxHeight = props.height;
          addFixed(el, props);
        }
      });

      const stickyIds = [];
      sticky.forEach(el => {
        addFixed(el, {
          position: "relative",
          top: "auto", left: "auto", right: "auto", bottom: "auto"
        });
        if (!el.id) el.id = `__ps_${++stickyIdCounter}`;
        stickyIds.push(el.id);
      });

      if (stickyIds.length) {
        const sel = stickyIds.map(id => `#${CSS.escape(id)}`).join(",");
        this.addStyleSheet(`${sel} {
          position: relative !important;
          left: auto !important; right: auto !important;
          top: auto !important; bottom: auto !important;
        }`);
      }

      innerAbsolutes.forEach(el => {
        if (el.offsetWidth * el.offsetHeight < 5000) {
          addFixed(el, { display: "none" });
        }
      });

      fixedBg.forEach(el => {
        const style = window.getComputedStyle(el);
        const updates = { backgroundAttachment: "scroll" };
        if (this.isTransparent(style.backgroundColor) && style.backgroundRepeat === "no-repeat") {
          updates.backgroundRepeat = "repeat";
        }
        addFixed(el, updates);
      });

      if (hideElts && hideElts.length) {
        hideElts.forEach(el => {
          addFixed(el, { visibility: "hidden" });
        });
      }

      return fixed.length + sticky.length;
    },

    popFixed() {
      while (fixedStack.length) pop(fixedStack);
    },

    popAll() {
      while (stack.length) pop(stack);
      while (fixedStack.length) pop(fixedStack);
    },

    hideScrollbars(html) {
      const style = document.createElement("style");
      style.textContent = [
        `html::-webkit-scrollbar, body::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }`,
        `html, body { scrollbar-width: none !important; }`,
      ].join(" ");
      document.head.appendChild(style);
      stack.push({ action: "new_elt", elt: style });
    },

    fixHangingAbsolutes(body) {
      if (!body) return;
      const bodyStyle = window.getComputedStyle(body);
      if (POSITIONED.has(bodyStyle.position)) return;

      const bodyRect = body.getBoundingClientRect();
      const bodyLeft = bodyRect.left + window.scrollX;
      const bodyTop = bodyRect.top + window.scrollY;
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT, null);
      const hanging = [];
      while (walker.nextNode()) {
        const el = walker.currentNode;
        const style = window.getComputedStyle(el);
        if (style.position === "absolute") {
          const tag = el.tagName.toLowerCase();
          if ((tag === "iframe" || tag === "img") &&
              this.pxToInt(style.width) <= 5 && this.pxToInt(style.height) <= 5) continue;
          hanging.push({ el, style });
        } else if (POSITIONED.has(style.position)) {
          walker.currentNode = el;
        }
      }

      hanging.forEach(({ el, style }) => {
        const left = this.pxToFloat(style.left);
        const top = this.pxToFloat(style.top) + this.pxToFloat(bodyStyle.marginTop);
        this.add(el, {
          left: `${left - bodyLeft}px`,
          top: `${top - bodyTop}px`,
          right: "auto", bottom: "auto"
        });
      });
    },

    fixFixedPseudos(body) {
      if (!body) return;
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT, null);
      while (walker.nextNode()) {
        const el = walker.currentNode;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0.75 * window.innerWidth && rect.height > 0.75 * window.innerHeight) {
          let hasFixed = false;
          ["::before", "::after"].forEach(pseudo => {
            const pseudoStyle = window.getComputedStyle(el, pseudo);
            if (pseudoStyle.position === "fixed") {
              hasFixed = true;
              if (!el.id) el.id = `__ps_fp_${++pseudoIdCounter}`;
              const sel = `#${CSS.escape(el.id)}${pseudo}`;
              this.addStyleSheet(`${sel} { position: absolute !important; }`);
            }
          });
          if (!hasFixed) {
            walker.currentNode = el;
          }
        }
      }
    },

    fixParallax() {
      const parallaxSelectors = [
        'div[data-effect="BackgroundParallax"]',
        'div[data-effect="BackgroundParallaxZoom"]',
      ];
      if (parallaxSelectors.some(s => document.querySelector(s))) {
        this.addStyleSheet(`
          div[data-effect="BackgroundParallax"],
          div[data-effect="BackgroundParallaxZoom"] {
            position: absolute !important;
            left: auto !important; top: auto !important;
          }
          .bgImage[data-type="image"] {
            transform: translate3d(0, 0, 0) !important;
          }
        `);
      }

      const sqParallax = ".enable-load-effects .Parallax-host .Parallax-item figure";
      if (document.querySelector(sqParallax)) {
        this.addStyleSheet(`${sqParallax} { opacity: 1 !important; transition: all 0 ease-in-out; }`);
      }
    },

    fixSiteSpecific() {
      const host = window.location.host;
      if (host === "quora.com" || host.endsWith(".quora.com")) {
        this.addStyleSheet(`.Answer.ActionBar.sticky { position: static !important }`);
      }
    },

    unlockAncestors(container) {
      let el = container.parentElement;
      while (el && el !== document.documentElement.parentElement) {
        const style = window.getComputedStyle(el);
        const overflow = style.overflow + style.overflowY;

        if (overflow.includes("auto") || overflow.includes("scroll") ||
            overflow.includes("hidden") || overflow.includes("clip")) {
          this.add(el, { overflow: "visible", overflowX: "visible", overflowY: "visible" });
        }
        if (style.maxHeight !== "none") this.add(el, { maxHeight: "none" });
        if (style.maxWidth !== "none") this.add(el, { maxWidth: "none" });

        const h = parseFloat(style.height);
        if (style.height !== "auto" && !isNaN(h)) {
          el.style.minHeight = style.height;
          this.add(el, { height: "auto" });
        }

        const parentDisplay = el.parentElement ? window.getComputedStyle(el.parentElement).display : "";
        if (parentDisplay.includes("flex")) {
          this.add(el, { flexShrink: "0" });
          if (style.flexBasis !== "auto") this.add(el, { flexBasis: "auto" });
          if (style.alignSelf === "stretch") this.add(el, { alignSelf: "flex-start" });
        }
        if (parentDisplay.includes("grid") && style.alignSelf === "stretch") {
          this.add(el, { alignSelf: "start" });
        }

        if (style.backgroundAttachment === "fixed") {
          this.add(el, { backgroundAttachment: "scroll" });
        }

        if (style.position === "absolute") {
          this.add(el, { position: "relative" });
        } else if (style.position === "fixed") {
          this.add(el, { position: "absolute" });
        }

        el = el.parentElement;
      }
    },

    findFixedAndSticky(root) {
      const fixed = [], sticky = [], fixedBg = [], innerAbsolutes = [], fixedHeaders = [];
      const result = { fixed, sticky, fixedBg, innerAbsolutes, fixedHeaders };

      const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_ELEMENT, {
        acceptNode: node => node === root ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT
      });

      while (walker.nextNode()) {
        const el = walker.currentNode;
        const style = window.getComputedStyle(el);
        switch (style.position) {
          case "sticky":
            sticky.push(el);
            break;
          case "fixed": {
            const rect = el.getBoundingClientRect();
            const headerThreshold = 20;
            if (rect.top < headerThreshold && rect.height < window.innerHeight - rect.top - headerThreshold) {
              if (!this.hasOverflowHiddenParent(el)) fixedHeaders.push(el);
            } else if (rect.top + rect.height <= 0 || rect.left + rect.width <= 0 ||
                       rect.top >= window.innerHeight || rect.left >= window.innerWidth) {
              // offscreen, skip
            } else if (rect.height > window.innerHeight && rect.width >= 2 * window.innerWidth / 3) {
              // too tall, skip
            } else {
              if (!this.hasOverflowHiddenParent(el)) fixed.push(el);
            }
            break;
          }
          case "absolute":
            if (root) {
              const parent = el.offsetParent;
              if (parent && parent !== root && parent.contains(root)) {
                innerAbsolutes.push(el);
              }
            }
            break;
        }

        if (style.backgroundAttachment === "fixed") {
          fixedBg.push(el);
        }
      }

      return result;
    },

    hasOverflowHiddenParent(el) {
      let p = el.parentNode;
      while (p && p !== document.documentElement && p !== document.body) {
        if (window.getComputedStyle(p).overflow === "hidden") return true;
        p = p.parentNode;
      }
      return false;
    },

    getOffsetRect(el) {
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      }
      return { left: 0, top: 0, width: 0, height: 0 };
    },

    add(el, props) {
      if (!el || !el.style) return;
      const restore = saveAndSet(el, props);
      stack.push({ action: "func", undo: restore });
    },

    addStyleSheet(css) {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
      stack.push({ action: "new_elt", elt: style });
    },

    isTransparent(color) {
      return !color || color === "transparent" || color === "rgba(0,0,0,0)" ||
             color === "#0000" || color === "#00000000" || color === "";
    },

    pxToInt(val) { return parseInt(val, 10) || 0; },
    pxToFloat(val) { return parseFloat(val) || 0; },
  };

  return controller;
})();

let stickyIdCounter = 0;
let pseudoIdCounter = 0;

function preparePageForCapture(targetElement, container) {
  StyleController.init(targetElement, container);
  StyleController.initFixed();
  return () => StyleController.popAll();
}

function updateFixedForTile(container, viewW, viewH, scrollX, scrollY, isTopOfElt) {
  return StyleController.updateFixed(container, viewW, viewH, scrollX, scrollY, isTopOfElt);
}

function restoreFixedForTile() {
  StyleController.popFixed();
}

function findScrollContainer(element) {
  if (!element) return document.documentElement;
  let el = element.parentElement;
  while (el) {
    const style = window.getComputedStyle(el);
    const o = style.overflow + style.overflowY;
    if (o.includes("auto") || o.includes("scroll")) {
      if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) {
        return el;
      }
    }
    el = el.parentElement;
  }
  return document.documentElement;
}

function isFullyInViewport(element) {
  const r = element.getBoundingClientRect();
  return (
    r.left >= 0 &&
    r.top >= 0 &&
    r.right <= window.innerWidth &&
    r.bottom <= window.innerHeight
  );
}

class ScrollCapture {
  constructor({ container, viewW, viewH, contentW, contentH, overlap = 40 }) {
    this.container = container;
    this.viewW = viewW;
    this.viewH = viewH;
    this.overlap = overlap;
    this.contentW = contentW;
    this.contentH = contentH;
    this.stepX = viewW - overlap;
    this.stepY = viewH - overlap;
    this.cols = Math.max(1, Math.ceil(contentW / this.stepX));
    this.rows = Math.max(1, Math.ceil(contentH / this.stepY));
    this.col = 0;
    this.row = 0;
    this.originalX = container.scrollLeft;
    this.originalY = container.scrollTop;
  }

  next() {
    if (this.row >= this.rows) return null;
    const x = Math.min(this.col * this.stepX, this.contentW - this.viewW);
    const y = Math.min(this.row * this.stepY, this.contentH - this.viewH);
    this.container.scrollLeft = x;
    this.container.scrollTop = y;
    const col = this.col;
    const row = this.row;
    this.col++;
    if (this.col >= this.cols) {
      this.col = 0;
      this.row++;
    }
    return { x: Math.max(0, x), y: Math.max(0, y), col, row };
  }

  restore() {
    this.container.scrollLeft = this.originalX;
    this.container.scrollTop = this.originalY;
  }
}
