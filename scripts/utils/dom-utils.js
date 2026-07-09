class DomUtils {
  static isExtensionElement(element) {
    return (
      element &&
      (!!element.closest(".pagesurgeon-panel") ||
        element.classList.contains("pagesurgeon-highlight"))
    );
  }

  static getElementDescription(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const cls = element.className && typeof element.className === "string"
      ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
      : "";
    const text = element.textContent
      ? element.textContent.trim().slice(0, 30)
      : "";
    return `<${tag}${id}${cls}>${text ? ` "${text}"` : ""}`;
  }

  static isTextElement(element) {
    const textTags = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "a",
      "li", "td", "th", "label", "figcaption", "blockquote", "cite",
      "strong", "em", "b", "i", "u", "small", "sub", "sup", "button"];
    if (textTags.includes(element.tagName.toLowerCase())) return true;
    if (["div", "section", "article"].includes(element.tagName.toLowerCase())) {
      return element.children.length === 0;
    }
    return false;
  }
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
