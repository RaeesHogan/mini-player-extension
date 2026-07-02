# Mini Player Extension

A Chrome extension that provides a separate mini player window for videos playing in any browser tab. Perfect for picture-in-picture style video viewing while browsing other tabs.

## Features

- **Separate Player Window**: Opens video content in a detachable popup window
- **Playback Position Memory**: Automatically saves and restores your playback position
- **Video Controls**: Play/pause, seek, and mute/unmute functionality
- **Always on Top**: Optional always-on-top mode (visual indicator)
- **Window State Persistence**: Remembers window position and size

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select this extension's directory
5. The extension icon will appear in your toolbar

## Usage

1. Navigate to any webpage with a video
2. Click the Mini Player extension icon
3. Click "Open Separate Window" to launch the mini player
4. Use the controls to manage playback:
   - ▶/⏸: Play/Pause
   - Seek bar: Jump to any position
   - 🔊/🔇: Mute/Unmute
   - ⤴/📌: Toggle always-on-top mode

## Files Structure

```
├── manifest.json      # Extension configuration
├── background.js      # Service worker for window management
├── content.js         # Content script for video detection
├── player.html        # Mini player UI
├── player.js          # Player controller logic
├── player.css         # Player styles
├── popup.html         # Extension popup UI
├── popup.js           # Popup controller
└── README.md          # This file
```

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension format)
- **Minimum Chrome Version**: 114
- **Permissions Required**:
  - `activeTab`: Access to current tab
  - `tabCapture`: Capture tab video/audio stream
  - `storage`: Save playback position and preferences
  - `tabs`: Query tab information

## Architecture

The extension consists of three main components:

1. **Background Service Worker** (`background.js`)
   - Handles window creation
   - Manages message routing between components

2. **Content Script** (`content.js`)
   - Injected into all webpages
   - Detects video elements
   - Monitors and controls video playback

3. **Player Window** (`player.html`, `player.js`, `player.css`)
   - Displays captured video stream
   - Provides user interface controls
   - Communicates with content script via messaging

## Development

To modify the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Mini Player card
4. Test the changes

## Troubleshooting

- **No video detected**: Ensure the page has a `<video>` element loaded
- **Player won't open**: Check that the extension has necessary permissions
- **Position not saved**: Verify Chrome storage is enabled
- **Autoplay blocked**: Browser may require user interaction before autoplay

## License

MIT License
