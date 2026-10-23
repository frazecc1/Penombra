// docs/js/game/net.js — rete: device, API, profilo, cache carte
import { getAccessToken, signOut, showAuthScreen } from '../auth.js';
import { API } from '../config.js';
import { lsGet, lsSet, lsRemove } from './storage.js';
import { TOKEN_TTL_MS, CARD_TTL } from './constants.js';

const cache = new Map();
export function getCardCache() { return cache; }
export function clearCardCache() {
  cache.clear();
  cardLoaded.clear();
}

/** ID stabile di questo browser (per sessione unica cross-device). */
export function getDeviceId() {
  const KEY = 'penombra:device-id';
  try {
    let id = lsGet(KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      lsSet(KEY, id);
    }
    return id;
  } catch (_) {
    return `dev-tmp-${Date.now()}`;
  }
}

/** Etichetta leggibile del device (non è un MAC: i browser non lo espongono). */
export function getDeviceLabel() {
  try {
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPod/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Mobile/i.test(ua)) return 'Cellulare';
    if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'PC Windows';
    if (/Linux/i.test(ua)) return 'PC Linux';
    return 'Computer';
  } catch (_) {
    return 'Dispositivo';
  }
}

/** Cache token: evita getSession() su ogni fetch (lento su cold start). */
let _tokenCache = { token: null, at: 0 };
export async function getAccessTokenCached(force = false) {
  if (!force && _tokenCache.token && Date.now() - _tokenCache.at < TOKEN_TTL_MS) {
    return _tokenCache.token;
  }
  const token = await getAccessToken();
  _tokenCache = { token, at: Date.now() };
  return token;
}

export async function api(path,options={}) {
  const token = await getAccessTokenCached(!!options.forceToken);
  if (!token) throw new Error('Sessione scaduta, accedi di nuovo.');
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(),45000);
  try {
    const res = await fetch(`${API}${path}`,{
      method:options.method ?? 'GET',
      headers:{
        Authorization:`Bearer ${token}`,
        'X-Device-Id': getDeviceId(),
        ...(options.body !== undefined ? {'Content-Type':'application/json'} : {}),
      },
      body:options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal:abort.signal,cache:'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (json.code === 'session_replaced' || (res.status === 401 && /altro dispositivo|session_replaced|sostituita/i.test(String(json.error || '')))) {
        _tokenCache = { token: null, at: 0 };
        try { await signOut(); } catch (_) { /* ignore */ }
        try { showAuthScreen({ forceLoginForm: false }); } catch (_) { /* ignore */ }
        throw new Error('Hai effettuato l’accesso da un altro dispositivo. Qui devi accedere di nuovo.');
      }
      throw new Error(json.error ?? `HTTP ${res.status}`);
    }
    return json;
  } catch(e) {
    if (e?.name === 'AbortError') throw new Error('Render non risponde entro 45 secondi. Aggiorna prima di riprovare: la richiesta potrebbe essere stata salvata.');
    throw e;
  } finally { clearTimeout(timer); }
}

/** Sincronizza profilo server → localStorage (progressi + ultima partita). */
/** Ultimo profilo server (per probePrior senza seconda GET). */
let _profileCache = null;
export function clearProfileCache() { _profileCache = null; }
export function getProfileCache() { return _profileCache; }
export async function pullProfileFromServer() {
  try {
    const profile = await api('/me/profile');
    _profileCache = profile;
    if (profile.last_match_id) {
      try { lsSet('penombra:last-match', String(profile.last_match_id)); } catch (_) { /* ignore */ }
    } else {
      try { lsRemove('penombra:last-match'); } catch (_) { /* ignore */ }
    }
    try {
      lsSet('penombra:base-match-in-progress', profile.base_match_in_progress ? '1' : '0');
    } catch (_) { /* ignore */ }
    return profile;
  } catch (e) {
    console.warn('Profilo server non disponibile', e);
    return null;
  }
}


/** Flag leggero su profilo: partita base in corso (niente fetch dello stato intero). */
export async function setBaseMatchInProgress(on, matchId = null) {
  try {
    const body = { base_match_in_progress: !!on };
    if (on && matchId) body.last_match_id = matchId;
    if (!on) body.last_match_id = null;
    await api('/me/profile', { method: 'PUT', body });
    if (_profileCache) {
      _profileCache.base_match_in_progress = !!on;
      if (on && matchId) _profileCache.last_match_id = matchId;
      if (!on) _profileCache.last_match_id = null;
    }
    try {
      lsSet('penombra:base-match-in-progress', on ? '1' : '0');
      if (on && matchId) lsSet('penombra:last-match', String(matchId));
      if (!on) lsRemove('penombra:last-match');
    } catch (_) { /* ignore */ }
  } catch (e) {
    console.warn('setBaseMatchInProgress', e);
  }
}
export function isBaseMatchInProgress() {
  if (_profileCache && typeof _profileCache.base_match_in_progress === 'boolean') {
    return _profileCache.base_match_in_progress;
  }
  try { return lsGet('penombra:base-match-in-progress') === '1'; } catch (_) { return false; }
}
export function baseMatchIdHint() {
  if (_profileCache?.last_match_id) return String(_profileCache.last_match_id);
  try { return lsGet('penombra:last-match'); } catch (_) { return null; }
}

/** Claim device + pull profilo (dopo login / Sono io). */
export async function claimDeviceAndSync() {
  try {
    await api('/me/claim-device', {
      method: 'POST',
      body: { deviceId: getDeviceId(), deviceLabel: getDeviceLabel() },
    });
  } catch (e) {
    console.warn('Claim device fallito', e);
  }
  return pullProfileFromServer();
}
// Le carte scadono dopo 5 minuti; clearCardCache() a ogni newMatch.
export async function card(id) {
  const fresh = cache.has(id) && Date.now() - (cardLoaded.get(id) ?? 0) < CARD_TTL;
  if (!fresh) {
    try { cache.set(id,(await api(`/cards/${encodeURIComponent(id)}`)).card); cardLoaded.set(id,Date.now()); }
    catch (error) { if (!cache.has(id)) throw error; }
  }
  return cache.get(id);
}

