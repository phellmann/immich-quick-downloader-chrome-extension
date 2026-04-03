// background.js

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "downloadPhoto",
      forceOriginal: command === "download-original"
    });
  });
});

// Used by browser-mode downloads (chrome.downloads respects Chrome's own folder/dialog settings)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "triggerDownload") {
    chrome.downloads.download({
      url: msg.url,
      filename: msg.filename || undefined,
      saveAs: false,
    }, (downloadId) => {
      sendResponse({ ok: !chrome.runtime.lastError, downloadId });
    });
    return true;
  }
});
