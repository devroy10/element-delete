chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        window.postMessage({ type: "PAGESURGEON_TOGGLE" }, "*");
      },
    });
  } catch (error) {
    console.error("Failed to execute script:", error);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("PageSurgeon installed successfully.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CAPTURE_ELEMENT" && sender.tab) {
    captureElement(sender.tab.windowId, request.rect, request.dpr || 1)
      .then((dataUrl) => {
        chrome.downloads.download({
          url: dataUrl,
          filename: request.filename || `pagesurgeon-${Date.now()}.png`,
          saveAs: false,
        });
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error("Capture failed:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

async function captureElement(windowId, rect, dpr) {
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  const blob = await (await fetch(dataUrl)).blob();
  const img = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(rect.width * dpr, rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    rect.left * dpr, rect.top * dpr,
    rect.width * dpr, rect.height * dpr,
    0, 0,
    rect.width * dpr, rect.height * dpr
  );

  const croppedBlob = await canvas.convertToBlob({ type: "image/png" });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(croppedBlob);
  });
}
