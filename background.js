// Service worker: เปิดหน้าต่าง Mini Player และรับคำสั่งจาก popup/player
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    alwaysOnTop: false,
    playbackPosition: 0,
    videoUrl: '',
    playerPos: null,
    playerSize: null
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'openPlayer') {
    const width = message.width || 900;
    const height = message.height || 600;
    const tabId = message.tabId;
    const sourceUrl = encodeURIComponent(message.url || '');

    chrome.windows.create(
      {
        type: 'popup',
        url: chrome.runtime.getURL(`player.html?tabId=${tabId}&sourceUrl=${sourceUrl}`),
        width,
        height,
        focused: true
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        }
      }
    );

    sendResponse({ ok: true });
    return true;
  }

  sendResponse({ ok: false, reason: 'Unknown action' });
  return true;
});
