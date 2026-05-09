// Nivaa Stays — admin auth helper (UX gate, not real security).
// Uses Google Identity Services to identify the signed-in user. The email
// stored in localStorage is decoded from the JWT *without* server-side
// verification — we use it purely to decide which UI to show. Anyone who
// understands the URL structure can still bypass discount controls etc.
// Real protection happens at the WhatsApp confirmation step, not here.

const CLIENT_ID    = '724746898117-fsjk06nsnobcv56endectc5gljnsri83.apps.googleusercontent.com';
const ADMIN_EMAIL  = 'nivaastays@gmail.com';
const STORAGE_KEY  = 'nivaa_admin_token';

function decodeJwtPayload(token) {
  try {
    const raw = String(token).split('.')[1] || '';
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    // base64url drops padding; restore it for atob
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const bytes = atob(padded);
    // Decode as UTF-8 (ASCII fast-path falls back if TextDecoder absent)
    if (typeof TextDecoder !== 'undefined') {
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      return JSON.parse(new TextDecoder('utf-8').decode(arr));
    }
    return JSON.parse(bytes);
  } catch (e) {
    console.warn('[NivaaAuth] JWT decode failed:', e);
    return null;
  }
}

function getToken() {
  try { return localStorage.getItem(STORAGE_KEY) || ''; }
  catch (_) { return ''; }
}

function getClaims() {
  const token = getToken();
  if (!token) return null;
  const claims = decodeJwtPayload(token);
  if (!claims) return null;
  if (claims.exp && claims.exp * 1000 < Date.now()) {
    // Token expired — clean up so the next page-load shows login again
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    return null;
  }
  return claims;
}

function getEmail() {
  const claims = getClaims();
  return claims ? (claims.email || '') : '';
}

function getName() {
  const claims = getClaims();
  return claims ? (claims.name || claims.given_name || claims.email || '') : '';
}

function isAdmin() {
  return getEmail() === ADMIN_EMAIL;
}

function logout() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  if (window.google && google.accounts && google.accounts.id) {
    try { google.accounts.id.disableAutoSelect(); } catch (_) {}
  }
  window.dispatchEvent(new CustomEvent('nivaa-auth-change', { detail: { email: '', isAdmin: false } }));
}

function handleCredentialResponse(response) {
  console.log('[NivaaAuth] credential received');
  if (!response || !response.credential) {
    console.warn('[NivaaAuth] no credential in response');
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, response.credential);
  } catch (e) {
    console.warn('[NivaaAuth] localStorage write failed (private mode?):', e);
  }
  const claims = decodeJwtPayload(response.credential);
  const email = (claims && claims.email) || '';
  console.log('[NivaaAuth] signed in as', email, '· isAdmin:', email === ADMIN_EMAIL);
  window.dispatchEvent(new CustomEvent('nivaa-auth-change', {
    detail: { email, isAdmin: email === ADMIN_EMAIL, claims }
  }));
}

function whenGoogleReady(cb) {
  if (window.google && google.accounts && google.accounts.id) { cb(); return; }
  let tries = 0;
  const iv = setInterval(() => {
    if (window.google && google.accounts && google.accounts.id) {
      clearInterval(iv); cb();
    } else if (++tries > 50) {
      clearInterval(iv);  // give up after ~10s
    }
  }, 200);
}

function renderSignInButton(containerId, options) {
  whenGoogleReady(() => {
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: true,             // silently re-issue a token if Google session is alive
      cancel_on_tap_outside: false   // keep One Tap visible until the user acts
    });
    const container = document.getElementById(containerId);
    if (container) {
      google.accounts.id.renderButton(container, Object.assign({
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular'
      }, options || {}));
    }
    // Auto-prompt One Tap on load. When the user previously signed in and
    // Google's session is still alive, this resolves silently with a fresh
    // ID token (no popup). Otherwise the One Tap card appears top-right.
    try { google.accounts.id.prompt(); } catch (_) {}
  });
}

window.NivaaAuth = {
  isAdmin, getEmail, getName, logout, renderSignInButton, ADMIN_EMAIL
};
