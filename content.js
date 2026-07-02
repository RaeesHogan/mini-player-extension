/**
 * Mini Player Extension - Content Script
 * Monitors video elements and manages playback state synchronization
 */

(() => {
  // State management
  const state = {
    lastSavedTime: 0,
    saveInterval: null,
    activeVideo: null
  };

  /**
   * Get the currently active video element on the page
   * @returns {HTMLVideoElement|null} The active video element or null
   */
  function getVideo() {
    if (state.activeVideo && document.contains(state.activeVideo)) {
      return state.activeVideo;
    }

    const videos = Array.from(document.querySelectorAll('video'));
    state.activeVideo = videos.find(
      (video) => video.readyState >= 2 || video.duration > 0
    ) || videos[0] || null;
    
    return state.activeVideo;
  }

  /**
   * Save current playback position to Chrome storage
   */
  function savePlaybackPosition() {
    const video = getVideo();
    if (!video) return;

    try {
      const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      chrome.storage.local.set({
        playbackPosition: currentTime,
        videoUrl: window.location.href
      });
      state.lastSavedTime = currentTime;
    } catch (error) {
      console.warn('Mini Player: unable to save playback position', error);
    }
  }

  /**
   * Attach event listeners to video element for automatic state saving
   * @param {HTMLVideoElement} video - The video element to bind to
   */
  function attachVideoListeners(video) {
    if (!video || video.__miniPlayerBound) return;

    video.__miniPlayerBound = true;
    video.addEventListener('play', savePlaybackPosition);
    video.addEventListener('pause', savePlaybackPosition);
    video.addEventListener('seeked', savePlaybackPosition);
    video.addEventListener('loadedmetadata', savePlaybackPosition);
  }

  /**
   * Handle incoming messages from player window
   * @param {Object} message - The message received
   * @param {Function} sendResponse - Chrome's sendResponse callback
   * @returns {boolean} True to indicate async response
   */
  function handleMessage(message, sender, sendResponse) {
    try {
      const video = getVideo();
      
      if (!video) {
        sendResponse({ ok: false, reason: 'No video element found' });
        return true;
      }

      switch (message?.action) {
        case 'play':
          video.play()
            .then(() => sendResponse({ ok: true }))
            .catch(() => sendResponse({ ok: false, error: 'Unable to start playback' }));
          break;

        case 'pause':
          video.pause();
          savePlaybackPosition();
          sendResponse({ ok: true });
          break;

        case 'seek':
          if (Number.isFinite(message.time)) {
            video.currentTime = message.time;
            savePlaybackPosition();
            sendResponse({ ok: true });
          } else {
            sendResponse({ ok: false, error: 'Invalid time value' });
          }
          break;

        case 'mute':
          video.muted = true;
          sendResponse({ ok: true });
          break;

        case 'unmute':
          video.muted = false;
          sendResponse({ ok: true });
          break;

        case 'getState':
          sendResponse({
            ok: true,
            paused: video.paused,
            currentTime: video.currentTime,
            duration: video.duration,
            muted: video.muted
          });
          break;

        default:
          sendResponse({ ok: false, reason: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ ok: false, error: error.message || 'Unexpected error' });
    }
    
    return true;
  }

  // Initialize periodic position saving
  state.saveInterval = window.setInterval(() => {
    const video = getVideo();
    if (!video) return;

    if (Math.abs(video.currentTime - state.lastSavedTime) > 0.5) {
      savePlaybackPosition();
    }
  }, 1000);

  // Set up MutationObserver to detect new video elements
  const observer = new MutationObserver(() => {
    const video = getVideo();
    if (video) {
      attachVideoListeners(video);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Initial binding attempt
  const initialVideo = getVideo();
  if (initialVideo) {
    attachVideoListeners(initialVideo);
  }

  // Message listener
  chrome.runtime.onMessage.addListener(handleMessage);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (state.saveInterval) {
      clearInterval(state.saveInterval);
    }
    savePlaybackPosition();
  });
})();
