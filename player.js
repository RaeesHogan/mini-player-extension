/**
 * Mini Player Extension - Player Window Controller
 * Manages the mini player UI and communicates with the source tab
 */

(() => {
  // Configuration constants
  const STATE_SYNC_DELAY = 700;
  const WINDOW_SAVE_DELAY = 300;

  // DOM Elements
  const elements = {
    video: document.getElementById('streamVideo'),
    playBtn: document.getElementById('playBtn'),
    seekBar: document.getElementById('seekBar'),
    timeLabel: document.getElementById('time'),
    muteBtn: document.getElementById('muteBtn'),
    topToggle: document.getElementById('topToggle')
  };

  // Player state
  const state = {
    isPlaying: false,
    isMuted: false,
    isAlwaysOnTop: false,
    stream: null,
    saveTimer: null
  };

  // Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  const tabId = Number(params.get('tabId'));
  const sourceUrl = params.get('sourceUrl') || '';

  /**
   * Format seconds into MM:SS time string
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  /**
   * Update the time display and seek bar position
   */
  function updateTimeDisplay() {
    const current = elements.video.currentTime || 0;
    const duration = elements.video.duration || 0;
    
    elements.timeLabel.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    elements.seekBar.value = duration > 0 ? (current / duration) * 100 : 0;
  }

  /**
   * Send a message to the source tab with retry logic
   * @param {Object} message - Message to send
   * @param {number} retries - Number of retry attempts remaining
   */
  function sendToTab(message, retries = 3) {
    if (!tabId) return;

    chrome.tabs.sendMessage(tabId, message, () => {
      if (chrome.runtime.lastError) {
        if (retries > 0) {
          window.setTimeout(() => sendToTab(message, retries - 1), 400);
          return;
        }
        console.warn('Mini Player: unable to reach tab', chrome.runtime.lastError.message);
      }
    });
  }

  /**
   * Toggle video playback state
   */
  function togglePlayback() {
    if (state.isPlaying) {
      sendToTab({ action: 'pause' });
      state.isPlaying = false;
      elements.playBtn.textContent = '▶';
    } else {
      sendToTab({ action: 'play' });
      state.isPlaying = true;
      elements.playBtn.textContent = '⏸';
    }
  }

  /**
   * Seek to a specific position in the video
   * @param {number} value - Seek bar percentage value (0-100)
   */
  function seekTo(value) {
    const duration = elements.video.duration || 0;
    const time = (value / 100) * duration;
    sendToTab({ action: 'seek', time });
  }

  /**
   * Save window position and size to storage
   */
  function saveWindowState() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      chrome.storage.local.set({
        playerPos: { left: window.screenX, top: window.screenY },
        playerSize: { width: window.outerWidth, height: window.outerHeight }
      });
    }, WINDOW_SAVE_DELAY);
  }

  /**
   * Restore saved window state from storage
   */
  function restoreWindowState() {
    chrome.storage.local.get(['playerPos', 'playerSize', 'playbackPosition', 'videoUrl', 'alwaysOnTop'], (data) => {
      if (data.playerPos) {
        window.moveTo(data.playerPos.left, data.playerPos.top);
      }
      if (data.playerSize) {
        window.resizeTo(data.playerSize.width, data.playerSize.height);
      }
      if (data.alwaysOnTop) {
        state.isAlwaysOnTop = true;
        elements.topToggle.classList.add('active');
      }
      if (sourceUrl && data.videoUrl === sourceUrl && data.playbackPosition) {
        sendToTab({ action: 'seek', time: data.playbackPosition });
      }
    });
  }

  /**
   * Toggle always-on-top mode
   */
  function toggleAlwaysOnTop() {
    state.isAlwaysOnTop = !state.isAlwaysOnTop;
    chrome.storage.local.set({ alwaysOnTop: state.isAlwaysOnTop });
    elements.topToggle.classList.toggle('active', state.isAlwaysOnTop);
    elements.topToggle.textContent = state.isAlwaysOnTop ? '📌' : '⤴';
    
    if (state.isAlwaysOnTop) {
      window.focus();
      console.info('Mini Player: Always on Top enabled. May require window restart for full effect.');
    }
  }

  /**
   * Toggle audio mute state
   */
  function toggleMute() {
    state.isMuted = !state.isMuted;
    const action = state.isMuted ? 'mute' : 'unmute';
    sendToTab({ action });
    elements.muteBtn.textContent = state.isMuted ? '🔇' : '🔊';
  }

  /**
   * Start capturing the tab's video stream
   */
  function startCapture() {
    if (!tabId) return;

    // Note: tabCapture.capture doesn't need targetTabId in options
    // The capture is automatically targeted at the active tab when called from a popup/player context
    chrome.tabCapture.capture({ audio: true, video: true }, (captureStream) => {
      if (!captureStream) {
        console.warn('Mini Player: tab capture failed', chrome.runtime.lastError?.message);
        return;
      }

      state.stream = captureStream;
      elements.video.srcObject = captureStream;
      elements.video.play().catch(() => {
        console.warn('Mini Player: autoplay was blocked by the browser');
      });
    });
  }

  /**
   * Sync player state with the source tab
   * @param {number} retries - Number of retry attempts remaining
   */
  function syncWithTab(retries = 3) {
    if (!tabId) return;
    
    chrome.tabs.sendMessage(tabId, { action: 'getState' }, (response) => {
      if (chrome.runtime.lastError) {
        if (retries > 0) {
          console.debug(`Mini Player: syncing state, retry ${4 - retries}/3...`);
          window.setTimeout(() => syncWithTab(retries - 1), 500);
          return;
        }
        console.warn('Mini Player: unable to sync with tab', chrome.runtime.lastError.message);
        return;
      }
      
      if (!response?.ok) return;

      state.isPlaying = !response.paused;
      elements.playBtn.textContent = state.isPlaying ? '⏸' : '▶';
      state.isMuted = response.muted;
      elements.muteBtn.textContent = state.isMuted ? '🔇' : '🔊';
    });
  }

  // Event Listeners
  elements.playBtn.addEventListener('click', togglePlayback);
  elements.seekBar.addEventListener('input', (event) => seekTo(Number(event.target.value)));
  elements.muteBtn.addEventListener('click', toggleMute);
  elements.topToggle.addEventListener('click', toggleAlwaysOnTop);
  
  // Window state management
  window.addEventListener('resize', saveWindowState);
  window.addEventListener('move', saveWindowState);
  window.addEventListener('beforeunload', saveWindowState);
  
  // Video state updates
  elements.video.addEventListener('timeupdate', updateTimeDisplay);
  elements.video.addEventListener('loadedmetadata', updateTimeDisplay);

  // Initialize player
  restoreWindowState();
  startCapture();
  
  // Initial state sync after a short delay (with retry logic built-in)
  window.setTimeout(() => syncWithTab(3), STATE_SYNC_DELAY);
})();
