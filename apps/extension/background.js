// background.js - Amplifier Substack Cookie Sync

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncCookie') {
    handleCookieSync().then(sendResponse);
    return true;
  }
});

async function getCookiesForDomain(domain) {
  const domains = [`.${domain}`, domain, `.www.${domain}`];
  const allCookies = [];
  for (const d of domains) {
    try {
      const cookies = await chrome.cookies.getAll({ domain: d });
      allCookies.push(...cookies);
    } catch (e) {}
  }
  // Deduplicate
  return allCookies.filter((c, i, self) =>
    i === self.findIndex(x => x.name === c.name && x.domain === c.domain)
  );
}

async function handleCookieSync() {
  try {
    // Get ALL substack cookies — getAll() returns httpOnly cookies too
    const cookies = await getCookiesForDomain('substack.com');

    if (!cookies.length) {
      return { success: false, error: 'No Substack cookies found. Please log in to Substack first.' };
    }

    // Find substack.sid (the session cookie)
    const sidCookie = cookies.find(c => c.name === 'substack.sid');
    if (!sidCookie) {
      return { success: false, error: 'Substack session cookie not found. Please log in to Substack first.' };
    }

    const { devMode } = await chrome.storage.local.get(['devMode']);
    const baseUrl = devMode ? 'http://localhost:3000' : 'https://amplify.elelem.expert';

    const response = await fetch(`${baseUrl}/api/settings/cookie`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cookie: sidCookie.value })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.error || `Server error: ${response.status}` };
    }

    const data = await response.json();
    return data.ok ? { success: true } : { success: false, error: data.error || 'Unknown error' };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Track Amplifier session token
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
