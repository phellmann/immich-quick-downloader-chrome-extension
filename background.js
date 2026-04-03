// background.js

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    if (command === "download-photo") {
      chrome.tabs.sendMessage(tabs[0].id, { action: "downloadPhoto", forceOriginal: false });
    } else if (command === "download-original") {
      chrome.tabs.sendMessage(tabs[0].id, { action: "downloadPhoto", forceOriginal: true });
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "triggerDownload") {
    const opts = {
      url: msg.url,
      filename: msg.filename,
      saveAs: false,
    };
    // conflictAction: uniquify = auto-number, overwrite = replace
    if (msg.conflictAction) opts.conflictAction = msg.conflictAction;

    chrome.downloads.download(opts, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true, downloadId });
      }
    });
    return true;
  }
});
