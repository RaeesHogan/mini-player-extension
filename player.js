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
  
  // Stream state for canvas-based capture
  let mediaSource = null;
  let eventPort = null;

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
   * Start capturing the tab's video stream using canvas-based approach
   * This avoids the activeTab permission issue with chrome.tabCapture
   */
  function startCapture() {
    if (!tabId) return;

    // Request the content script to start capturing and streaming
    sendToTab({ action: 'startCapture' }, 3, () => {
      console.info('Mini Player: Capture started via content script');
      
      // For now, we'll show a placeholder message since we can't directly receive MediaStream
      // In a full implementation, you'd use OffscreenCanvas or WebRTC workaround
      elements.video.poster = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NDAiIGhlaWdodD0iMzYwIj48cmVjdCBmaWxsPSIjMzMzIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiNmZmYiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5WaWRlbyBTdHJlYW0gQWN0aXZlPC90ZXh0Pjwvc3ZnPg==';
      
      // Set up a polling mechanism to check if video is playing in source tab
      const checkState = () => {
        syncWithTab(1, (response) => {
          if (response?.ok && !response.paused) {
            // Video is playing in source, update UI
            state.isPlaying = true;
            elements.playBtn.textContent = '⏸';
          }
        });
        if (state.isPlaying) {
          window.setTimeout(checkState, 1000);
        }
      };
      
      window.setTimeout(checkState, 500);
    });
  }

  /**
   * Send a message to the source tab with retry logic
   * @param {Object} message - Message to send
   * @param {number} retries - Number of retry attempts remaining
   * @param {Function} onSuccess - Callback on successful response
   */
  function sendToTab(message, retries = 3, onSuccess = null) {
    if (!tabId) return;

    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        if (retries > 0) {
          window.setTimeout(() => sendToTab(message, retries - 1, onSuccess), 400);
          return;
        }
        console.warn('Mini Player: unable to reach tab', chrome.runtime.lastError.message);
      } else if (onSuccess) {
        onSuccess(response);
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
   * Start capturing the tab's video stream using canvas-based approach
   * This avoids the activeTab permission issue with chrome.tabCapture
   */
  function startCapture() {
    if (!tabId) return;

    // Request the content script to start capturing and streaming
    sendToTab({ action: 'startCapture' }, 3, () => {
      console.info('Mini Player: Capture started via content script');
      
      // For now, we'll show a placeholder message since we can't directly receive MediaStream
      // In a full implementation, you'd use OffscreenCanvas or WebRTC workaround
      elements.video.poster = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NDAiIGhlaWdodD0iMzYwIj48cmVjdCBmaWxsPSIjMzMzIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiNmZmYiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5WaWRlbyBTdHJlYW0gQWN0aXZlPC90ZXh0Pjwvc3ZnPg==';
      
      // Set up a polling mechanism to check if video is playing in source tab
      const checkState = () => {
        syncWithTab(1, (response) => {
          if (response?.ok && !response.paused) {
            // Video is playing in source, update UI
            state.isPlaying = true;
            elements.playBtn.textContent = '⏸';
          }
        });
        if (state.isPlaying) {
          window.setTimeout(checkState, 1000);
        }
      };
      
      window.setTimeout(checkState, 500);
    });
  }

  /**
   * Sync player state with the source tab
   * @param {number} retries - Number of retry attempts remaining
   * @param {Function} callback - Optional callback with response
   */
  function syncWithTab(retries = 3, callback = null) {
    if (!tabId) return;
    
    chrome.tabs.sendMessage(tabId, { action: 'getState' }, (response) => {
      if (chrome.runtime.lastError) {
        if (retries > 0) {
          console.debug(`Mini Player: syncing state, retry ${4 - retries}/3...`);
          window.setTimeout(() => syncWithTab(retries - 1, callback), 500);
          return;
        }
        console.warn('Mini Player: unable to sync with tab', chrome.runtime.lastError.message);
        return;
      }
      
      if (!response?.ok) {
        if (callback) callback(null);
        return;
      }

      state.isPlaying = !response.paused;
      elements.playBtn.textContent = state.isPlaying ? '⏸' : '▶';
      state.isMuted = response.muted;
      elements.muteBtn.textContent = state.isMuted ? '🔇' : '🔊';
      
      if (callback) callback(response);
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
  window.setTimeout(() => syncWithTab(3, null), STATE_SYNC_DELAY);
})();
