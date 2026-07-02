(() => {
  let lastSavedTime = 0;
  let saveInterval = null;
  let activeVideo = null;

  function getVideo() {
    if (activeVideo && document.contains(activeVideo)) {
      return activeVideo;
    }

    const videos = Array.from(document.querySelectorAll('video'));
    activeVideo = videos.find((video) => video.readyState >= 2 || video.duration > 0) || videos[0] || null;
    return activeVideo;
  }

  function savePlaybackPosition() {
    const video = getVideo();
    if (!video) {
      return;
    }

    try {
      const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      chrome.storage.local.set({
        playbackPosition: currentTime,
        videoUrl: window.location.href
      });
      lastSavedTime = currentTime;
    } catch (error) {
      console.warn('Mini Player: unable to save playback position', error);
    }
  }

  function attachVideoListeners() {
    const video = getVideo();
    if (!video || video.__miniPlayerBound) {
      return;
    }

    video.__miniPlayerBound = true;
    video.addEventListener('play', savePlaybackPosition);
    video.addEventListener('pause', savePlaybackPosition);
    video.addEventListener('seeked', savePlaybackPosition);
    video.addEventListener('loadedmetadata', savePlaybackPosition);
  }

  saveInterval = window.setInterval(() => {
    const video = getVideo();
    if (!video) {
      return;
    }

    if (Math.abs(video.currentTime - lastSavedTime) > 0.5) {
      savePlaybackPosition();
    }
  }, 1000);

  const observer = new MutationObserver(() => {
    attachVideoListeners();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  attachVideoListeners();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
          return true;

        case 'pause':
          video.pause();
          savePlaybackPosition();
          sendResponse({ ok: true });
          return true;

        case 'seek':
          if (Number.isFinite(message.time)) {
            video.currentTime = message.time;
            savePlaybackPosition();
            sendResponse({ ok: true });
          } else {
            sendResponse({ ok: false, error: 'Invalid time value' });
          }
          return true;

        case 'mute':
          video.muted = true;
          sendResponse({ ok: true });
          return true;

        case 'unmute':
          video.muted = false;
          sendResponse({ ok: true });
          return true;

        case 'getState':
          sendResponse({
            ok: true,
            paused: video.paused,
            currentTime: video.currentTime,
            duration: video.duration,
            muted: video.muted
          });
          return true;

        default:
          sendResponse({ ok: false, reason: 'Unknown action' });
          return true;
      }
    } catch (error) {
      sendResponse({ ok: false, error: error.message || 'Unexpected error' });
      return true;
    }
  });

  window.addEventListener('beforeunload', () => {
    if (saveInterval) {
      clearInterval(saveInterval);
    }
    savePlaybackPosition();
  });
})();
