function preparePageForCapture(targetElement, container) {
  const restoreFns = [];

  function saveAndSet(el, prop, value) {
    const prev = el.style[prop];
    el.style.setProperty(prop, value, "important");
    return () => { el.style[prop] = prev; };
  }

  const scrollbarStyle = document.createElement("style");
  scrollbarStyle.textContent = [
    `#${container.id || ""}::-webkit-scrollbar, html::-webkit-scrollbar { display: none !important; }`,
    `*, *::before, *::after { transition: none !important; animation: none !important; }`,
  ].join(" ");
  document.head.appendChild(scrollbarStyle);
  restoreFns.push(() => scrollbarStyle.remove());

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (
      el === targetElement ||
      el.contains(targetElement) ||
      el.closest(".pagesurgeon-panel") ||
      el.offsetWidth === 0
    ) continue;

    const pos = window.getComputedStyle(el).position;
    if (pos === "fixed") {
      restoreFns.push(saveAndSet(el, "opacity", "0"));
      restoreFns.push(saveAndSet(el, "animation", "unset"));
      restoreFns.push(saveAndSet(el, "transitionDuration", "0s"));
    } else if (pos === "sticky" || pos === "-webkit-sticky") {
      restoreFns.push(saveAndSet(el, "position", "static"));
    }
  }

  let el = container.parentElement;
  while (el && el !== document.documentElement.parentElement) {
    const style = window.getComputedStyle(el);
    const overflow = style.overflow + style.overflowY;

    if (overflow.includes("auto") || overflow.includes("scroll") || overflow.includes("hidden") || overflow.includes("clip")) {
      restoreFns.push(saveAndSet(el, "overflow", "visible"));
      restoreFns.push(saveAndSet(el, "overflowX", "visible"));
      restoreFns.push(saveAndSet(el, "overflowY", "visible"));
    }

    if (style.maxHeight !== "none") {
      restoreFns.push(saveAndSet(el, "maxHeight", "none"));
    }

    const height = parseFloat(style.height);
    if (style.height !== "auto" && !isNaN(height)) {
      el.style.minHeight = style.height;
      restoreFns.push(saveAndSet(el, "height", "auto"));
    }

    const parentDisplay = el.parentElement ? window.getComputedStyle(el.parentElement).display : "";
    if (parentDisplay.includes("flex")) {
      restoreFns.push(saveAndSet(el, "flexShrink", "0"));
      if (style.flexBasis !== "auto") restoreFns.push(saveAndSet(el, "flexBasis", "auto"));
      if (style.alignSelf === "stretch") restoreFns.push(saveAndSet(el, "alignSelf", "flex-start"));
    }
    if (parentDisplay.includes("grid") && style.alignSelf === "stretch") {
      restoreFns.push(saveAndSet(el, "alignSelf", "start"));
    }

    if (style.backgroundAttachment === "fixed") {
      restoreFns.push(saveAndSet(el, "backgroundAttachment", "scroll"));
    }

    const pos = style.position;
    if (pos === "absolute") {
      restoreFns.push(saveAndSet(el, "position", "relative"));
    } else if (pos === "fixed") {
      restoreFns.push(saveAndSet(el, "position", "absolute"));
    }

    el = el.parentElement;
  }

  const html = document.documentElement;
  const htmlTag = html.tagName.toLowerCase();
  restoreFns.push(saveAndSet(html, "height", "auto"));
  restoreFns.push(saveAndSet(html, "minHeight", "100%"));
  restoreFns.push(saveAndSet(html, "scrollBehavior", "unset"));

  const body = document.body;
  restoreFns.push(saveAndSet(body, "height", "auto"));
  restoreFns.push(saveAndSet(body, "minHeight", "100%"));

  if (container !== document.documentElement) {
    restoreFns.push(saveAndSet(container, "overflow", "visible"));
    restoreFns.push(saveAndSet(container, "scrollBehavior", "unset"));
  }

  return () => { for (const fn of restoreFns) fn(); };
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
