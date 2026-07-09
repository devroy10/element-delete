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

  if (request.type === "CAPTURE_TILE" && sender.tab) {
    captureTile(sender.tab.windowId, request.dpr || 1)
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch((err) => {
        console.error("Tile capture failed:", err);
        sendResponse({ error: err.message });
      });
    return true;
  }

  if (request.type === "DOWNLOAD_BLOB") {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename || `pagesurgeon-${Date.now()}.png`,
      saveAs: false,
    });
    sendResponse({ success: true });
  }
});

async function captureElement(windowId, rect, dpr) {
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  const blob = await (await fetch(dataUrl)).blob();
  const img = await createImageBitmap(blob);

  const sx = Math.round(rect.left * dpr);
  const sy = Math.round(rect.top * dpr);
  const sw = Math.round(rect.width * dpr);
  const sh = Math.round(rect.height * dpr);

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const croppedBlob = await canvas.convertToBlob({ type: "image/png" });
  return blobToDataUrl(croppedBlob);
}

async function captureTile(windowId, dpr) {
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  const blob = await (await fetch(dataUrl)).blob();
  const img = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);

  const croppedBlob = await canvas.convertToBlob({ type: "image/png" });
  return blobToDataUrl(croppedBlob);
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
