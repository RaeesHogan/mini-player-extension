/**
 * Mini Player Extension - Background Service Worker
 * Handles window creation and message routing between extension components
 */

const DEFAULT_WINDOW_WIDTH = 900;
const DEFAULT_WINDOW_HEIGHT = 600;

/**
 * Initialize default storage values when extension is installed
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    alwaysOnTop: false,
    playbackPosition: 0,
    videoUrl: '',
    playerPos: null,
    playerSize: null
  });
});

/**
 * Create a new mini player window for the specified tab
 * @param {Object} params - Window creation parameters
 * @param {number} params.tabId - ID of the source tab
 * @param {string} params.url - URL of the source tab
 * @param {number} params.width - Window width
 * @param {number} params.height - Window height
 */
function createPlayerWindow({ tabId, url, width, height }) {
  const playerWidth = width || DEFAULT_WINDOW_WIDTH;
  const playerHeight = height || DEFAULT_WINDOW_HEIGHT;
  const encodedUrl = encodeURIComponent(url || '');

  chrome.windows.create(
    {
      type: 'popup',
      url: chrome.runtime.getURL(`player.html?tabId=${tabId}&sourceUrl=${encodedUrl}`),
      width: playerWidth,
      height: playerHeight,
      focused: true
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error('Mini Player: Failed to create window:', chrome.runtime.lastError.message);
      }
    }
  );
}

/**
 * Handle incoming messages from popup and player windows
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'openPlayer') {
    createPlayerWindow({
      tabId: message.tabId,
      url: message.url,
      width: message.width,
      height: message.height
    });

    sendResponse({ ok: true });
    return true;
  }

  sendResponse({ ok: false, reason: 'Unknown action' });
  return true;
});
