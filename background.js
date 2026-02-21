// background.js
// Opens Roulette Predictor as a persistent detached window.
// Won't close when user clicks the simulator page.
'use strict';

let winId = null;

chrome.action.onClicked.addListener(async () => {
  // If window already open, just focus it
  if (winId !== null) {
    try {
      await chrome.windows.update(winId, { focused: true });
      return;
    } catch (e) {
      winId = null; // was closed externally
    }
  }

  // Open as detached popup window (stays open on blur)
  const win = await chrome.windows.create({
    url:     chrome.runtime.getURL('popup/popup.html'),
    type:    'popup',
    width:   510,
    height:  800,
    top:     40,
    left:    40,
    focused: true,
  });

  winId = win.id;

  chrome.windows.onRemoved.addListener(function handler(id) {
    if (id === winId) {
      winId = null;
      chrome.windows.onRemoved.removeListener(handler);
    }
  });
});
