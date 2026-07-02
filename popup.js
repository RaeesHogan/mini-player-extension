document.getElementById('open').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
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
        console.error(chrome.runtime.lastError.message);
      }
      window.close();
    }
  );
});
