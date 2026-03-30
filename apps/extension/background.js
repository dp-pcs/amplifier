// background.js - Service worker for handling cookie fetching and API requests

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncCookie') {
    handleCookieSync().then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleCookieSync() {
  try {
    // Get the connect.sid cookie from Substack
    const cookie = await chrome.cookies.get({
      url: 'https://substack.com',
      name: 'connect.sid'
    });

    if (!cookie) {
      return {
        success: false,
        error: 'No Substack cookie found. Please log in to Substack first.'
      };
    }

    // Get dev mode setting to determine target URL
    const { devMode } = await chrome.storage.local.get(['devMode']);
    const baseUrl = devMode
      ? 'http://localhost:3000'
      : 'https://amplify.elelem.expert';

    // Get session token (if user has logged into Amplifier web app)
    const { amplifierSession } = await chrome.storage.local.get(['amplifierSession']);

    // Send cookie to Amplifier API
    const response = await fetch(`${baseUrl}/api/settings/cookie`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include session token if available
        ...(amplifierSession && { 'Cookie': `next-auth.session-token=${amplifierSession}` })
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({
        cookie: cookie.value
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Server error: ${response.status}`
      };
    }

    const data = await response.json();

    if (data.ok) {
      return { success: true };
    } else {
      return {
        success: false,
        error: data.error || 'Unknown error occurred'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Optional: Listen for Amplifier login to capture session token
// This would require additional setup in the web app to communicate with the extension
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.name === 'next-auth.session-token' &&
      changeInfo.cookie.domain.includes('amplify.elelem.expert')) {
    if (!changeInfo.removed) {
      chrome.storage.local.set({ amplifierSession: changeInfo.cookie.value });
    } else {
      chrome.storage.local.remove('amplifierSession');
    }
  }
});
