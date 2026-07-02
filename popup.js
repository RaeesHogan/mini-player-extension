/**
 * Mini Player Extension - Popup Controller
 * Handles opening the mini player window from the extension popup
 */

/**
 * Open the mini player window for the current active tab
 */
async function openMiniPlayer() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.warn('Mini Player: No active tab found');
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: 'openPlayer',
        tabId: tab.id,
        url: tab.url || '',
        title: tab.title || 'Mini Player'
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Mini Player: Failed to open player:', chrome.runtime.lastError.message);
        }
        window.close();
      }
    );
  } catch (error) {
    console.error('Mini Player: Error opening player:', error);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const openButton = document.getElementById('open');
  if (openButton) {
    openButton.addEventListener('click', openMiniPlayer);
  }
});

// Fallback for immediate execution if DOM is already loaded
if (document.readyState !== 'loading') {
  const openButton = document.getElementById('open');
  if (openButton) {
    openButton.addEventListener('click', openMiniPlayer);
  }
}
