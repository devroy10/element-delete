function hideOverlays(targetElement) {
  const hidden = [];

  function shouldSkip(el) {
    return (
      el === targetElement ||
      el.contains(targetElement) ||
      targetElement.contains(el) ||
      el.closest(".pagesurgeon-panel") ||
      el.offsetWidth === 0
    );
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (shouldSkip(el)) continue;

    const pos = window.getComputedStyle(el).position;
    if (pos === "fixed") {
      const prev = el.style.display;
      el.style.display = "none";
      hidden.push({ el, restore: () => { el.style.display = prev; } });
    } else if (pos === "sticky") {
      const prevVis = el.style.visibility;
      const prevPos = el.style.position;
      el.style.visibility = "hidden";
      el.style.position = "static";
      hidden.push({ el, restore: () => {
        el.style.visibility = prevVis;
        el.style.position = prevPos;
      } });
    }
  }

  return () => { for (const h of hidden) h.restore(); };
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
