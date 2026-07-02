(() => {
  const params = new URLSearchParams(window.location.search);
  const tabId = Number(params.get('tabId'));
  const sourceUrl = params.get('sourceUrl') || '';

  const video = document.getElementById('streamVideo');
  const playBtn = document.getElementById('playBtn');
  const seekBar = document.getElementById('seekBar');
  const timeLabel = document.getElementById('time');
  const muteBtn = document.getElementById('muteBtn');
  const topToggle = document.getElementById('topToggle');

  let isPlaying = false;
  let isMuted = false;
  let isAlwaysOnTop = false;
  let stream = null;
  let lastSavedPos = null;
  let lastSavedSize = null;
  let saveTimer = null;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function updateTimeDisplay() {
    const current = video.currentTime || 0;
    const duration = video.duration || 0;
    timeLabel.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    seekBar.value = duration > 0 ? (current / duration) * 100 : 0;
  }

  function togglePlayback() {
    if (isPlaying) {
      chrome.tabs.sendMessage(tabId, { action: 'pause' }, () => {
        if (chrome.runtime.lastError) {
          console.warn(chrome.runtime.lastError.message);
        }
      });
      isPlaying = false;
      playBtn.textContent = '▶';
    } else {
      chrome.tabs.sendMessage(tabId, { action: 'play' }, () => {
        if (chrome.runtime.lastError) {
          console.warn(chrome.runtime.lastError.message);
        }
      });
      isPlaying = true;
      playBtn.textContent = '⏸';
    }
  }

  function seekTo(value) {
    const duration = video.duration || 0;
    const time = (value / 100) * duration;
    chrome.tabs.sendMessage(tabId, { action: 'seek', time }, () => {
      if (chrome.runtime.lastError) {
        console.warn(chrome.runtime.lastError.message);
      }
    });
  }

  function saveWindowState() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      chrome.storage.local.set({
        playerPos: { left: window.screenX, top: window.screenY },
        playerSize: { width: window.outerWidth, height: window.outerHeight }
      });
    }, 300);
  }

  function restoreWindowState() {
    chrome.storage.local.get(['playerPos', 'playerSize', 'playbackPosition', 'videoUrl', 'alwaysOnTop'], (data) => {
      if (data.playerPos) {
        window.moveTo(data.playerPos.left, data.playerPos.top);
      }
      if (data.playerSize) {
        window.resizeTo(data.playerSize.width, data.playerSize.height);
      }
      if (data.alwaysOnTop) {
        isAlwaysOnTop = true;
        topToggle.classList.add('active');
      }
      if (sourceUrl && data.videoUrl === sourceUrl) {
        chrome.tabs.sendMessage(tabId, { action: 'seek', time: data.playbackPosition || 0 });
      }
    });
  }

  function toggleAlwaysOnTop() {
    isAlwaysOnTop = !isAlwaysOnTop;
    chrome.storage.local.set({ alwaysOnTop: isAlwaysOnTop });
    topToggle.classList.toggle('active', isAlwaysOnTop);
    topToggle.textContent = isAlwaysOnTop ? '📌' : '⤴';
    if (isAlwaysOnTop) {
      window.focus();
      // Chrome MV3 does not expose a direct Always on Top API, so this acts as a visual toggle.
      console.info('Always on Top ถูกเลือกไว้. ใน Chrome รุ่นนี้ อาจต้องรีสตาร์ทหน้าต่างเพื่อให้ผลลัพธ์ชัดเจน');
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    const action = isMuted ? 'mute' : 'unmute';
    chrome.tabs.sendMessage(tabId, { action }, () => {
      if (chrome.runtime.lastError) {
        console.warn(chrome.runtime.lastError.message);
      }
    });
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
  }

  async function startCapture() {
    if (!tabId) {
      return;
    }

    chrome.tabCapture.capture({ tabId, audio: true, video: true }, (captureStream) => {
      if (!captureStream) {
        alert('ไม่สามารถจับภาพแท็บได้ กรุณาให้สิทธิ์ tab capture');
        return;
      }

      stream = captureStream;
      video.srcObject = stream;
      video.play().catch(() => {
        // Some sites block autoplay; the user can press play manually.
      });
    });
  }

  playBtn.addEventListener('click', togglePlayback);
  seekBar.addEventListener('input', (event) => seekTo(Number(event.target.value)));
  muteBtn.addEventListener('click', toggleMute);
  topToggle.addEventListener('click', toggleAlwaysOnTop);
  window.addEventListener('resize', saveWindowState);
  window.addEventListener('move', saveWindowState);
  window.addEventListener('beforeunload', saveWindowState);
  video.addEventListener('timeupdate', updateTimeDisplay);
  video.addEventListener('loadedmetadata', updateTimeDisplay);

  chrome.tabs.sendMessage(tabId, { action: 'getState' }, (response) => {
    if (!response?.ok) {
      return;
    }
    isPlaying = !response.paused;
    playBtn.textContent = isPlaying ? '⏸' : '▶';
    isMuted = response.muted;
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
  });

  restoreWindowState();
  startCapture();
})();
