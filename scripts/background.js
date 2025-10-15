/**
 * Background service worker for Element Delete extension
 * Handles extension lifecycle and messaging between components
 */

// Handle extension icon click to toggle element selection mode
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Send message to content script to toggle element selection mode
        window.postMessage({ type: "ELEMENT_DELETE_TOGGLE" }, "*");
      },
    });
  } catch (error) {
    console.error("Failed to execute script:", error);
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Element Delete extension installed successfully.");
});
