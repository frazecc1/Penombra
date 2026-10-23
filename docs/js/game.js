// docs/js/game.js — Penombra (lab Partita base). Entry principale.
// Moduli: storage, constants, peek, net (+ fix home dopo Sono io)
// Flusso: login → home → Partita base → fine partita.
import { getAccessToken, getCurrentUser, signOut, usernameFromEmail, showAuthScreen } from './auth.js';
import { API, SHOW_BASE_MATCH_PYRAMID } from './config.js';
import { lsGet, lsSet, lsRemove } from './game/storage.js';
import {
  FUNNY_BOOT, funnyBootLine, factions, deckFactionNames, types, rarities,
  STAGE_W, STAGE_H, STAGE_MIN_ASPECT, STAGE_FRAME_MIN_W, HAND_AREA, HAND_MIN_VISIBLE,
  OPPONENT_NAME, OPPONENT_IMG, AI_TARGET, TOKEN_TTL_MS, CARD_TTL,
} from './game/constants.js';
import {
  clearBattlefieldPeek, enterBattlefieldPeek, ensurePeekOnBar, appendBattlefieldPeekButton,
} from './game/peek.js';
import {
  getDeviceId, getDeviceLabel, getAccessTokenCached, api,
  pullProfileFromServer, setBaseMatchInProgress, isBaseMatchInProgress,
  baseMatchIdHint, claimDeviceAndSync, card, getCardCache, clearCardCache,
  clearProfileCache, getProfileCache,
} from './game/net.js';

const $ = id => document.getElementById(id);

/** Debug F12: window.__penombraDebug */
window.__penombraDebug = {
  version: 'versioneB_9-home-auth',
  hasDrawUi: () => typeof showDrawPlayerChoice === 'function',
  state: () => state,
  matchId: () => matchId,
  pendingTarget: () => state?.pending_target_choice ?? null,
  cache: () => getCardCache(),
  async card(id) {
    getCardCache().delete(id);
    return (await api(`/cards/${encodeURIComponent(id)}`)).card;
  },
};


let state = null, matchId = null, busy = false, initialized = false, view = null, flow = null;
/** Cella scelta per l’ingresso del Mostrissimo (fase 2), in attesa di conferma. */
let mostEntryPick = null;
/** Indice trappola mostrata nel dettaglio grande (finestra reattiva). */
let trapPickIdx = 0;
let trapPickWindowId = null;
/** Utente ha chiuso il messaggio «dove entra» con Ho capito. */
let mostEntryHintDismissed = false;
/** Utente ha chiuso il messaggio iniziale sacrifici con Ho capito. */
let mostSacrificeHintDismissed = false;
let mostSacrificeHintShowing = false;
let deathDraft = { choiceId: null, instanceIds: [] };
let presentationRunning = false, presentationGeneration = 0;
let lastPhaseKey = null; // scandisce ogni cambio fase anche se vuota
const waitPresentation = ms => new Promise(resolve => setTimeout(resolve,ms));
const board = () => state?.board?.rows ?? [[null,null,null],[null,null,null],[null,null,null]];
const at = p => board()[p.row]?.[p.col] ?? null;
/** Lab Partita base: umano = indice 1, IA = 0. Vista: tu in basso. */
let myPlayerIndex = 1;
const foePlayerIndex = () => (myPlayerIndex === 1 ? 0 : 1);
const me = () => state?.players?.[myPlayerIndex];
const them = () => state?.players?.[foePlayerIndex()];
const isMine = (owner) => owner === myPlayerIndex;
const isFoe = (owner) => owner === foePlayerIndex();
/** Riga casa motore: P1 → 2, P0 → 0 */
const myHomeRow = () => (myPlayerIndex === 1 ? 2 : 0);
const foeHomeRow = () => (myPlayerIndex === 1 ? 0 : 2);
/** Converti riga motore ↔ riga visuale (flip se sei P0). */
const toViewRow = (engineRow) => (myPlayerIndex === 1 ? engineRow : 2 - engineRow);
const toEngineRow = (viewRow) => (myPlayerIndex === 1 ? viewRow : 2 - viewRow);
const toEnginePos = (viewPos) => viewPos ? { row: toEngineRow(viewPos.row), col: viewPos.col } : viewPos;
const toViewPos = (enginePos) => enginePos ? { row: toViewRow(enginePos.row), col: enginePos.col } : enginePos;
function syncMyPlayerIndex(_userId) {
  // Lab Partita base: umano sempre index 1 (IA = 0).
  myPlayerIndex = 1;
}
const reaction = () => state?.pending_reaction?.responder_index === myPlayerIndex ? state.pending_reaction : null;
const deathOrder = () => state?.pending_death_order?.chooser_index === myPlayerIndex ? state.pending_death_order : null;
const deathTarget = () => state?.pending_target_choice?.chooser_index === myPlayerIndex ? state.pending_target_choice : null;
const obligatory = () => !!state?.pending_death_order || !!state?.pending_target_choice;
const turn = () => state?.status === 'running' && state.active_player_index === myPlayerIndex && state.phase === 'main';
const pending = () => state?.pending_mostrissimo?.player_index === myPlayerIndex ? state.pending_mostrissimo : null;
const active = () => turn() && !busy && !pending() && !state?.pending_reaction && !obligatory() && !(state?.work_queue?.length);
const inside = p => p.row >= 0 && p.row < 3 && p.col >= 0 && p.col < 3;
const around = p => [{row:p.row-1,col:p.col},{row:p.row+1,col:p.col},{row:p.row,col:p.col-1},{row:p.row,col:p.col+1}].filter(inside);
const eq = (a,b) => !!(a && b && a.row === b.row && a.col === b.col);
const isCreatureCell = c => c?.kind === 'creature';
const foes = p => around(p).filter(q => isCreatureCell(at(q)) && isFoe(at(q).owner_index));
const steps = p => around(p).filter(q => q.row !== 0 && !at(q));
const escape = x => String(x ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const creature = d => ['monster','mostrissimo'].includes(d.card_type);
const effects = d => Array.isArray(d?.effect_json?.effects) ? d.effect_json.effects : d?.effect_json?.type ? [d.effect_json] : [];
const targetEffect = d => effects(d).find(e => !e?.trigger && (e?.target === 'any_creature' || e?.target === 'any_target' || e?.type === 'return_hand'));
// Danno a scelta: il giocatore avversario (IA, indice 0) si sceglie toccando i suoi PV. Id fittizio player:0.
const playerTargetEffect = d => ['aura','terraforma'].includes(d?.card_type) ? undefined : effects(d).find(e => !e?.trigger && e?.target === 'any_target' && ['damage','damage_creature'].includes(e.type));
const hasTargets = d => !!playerTargetEffect(d) || targets(d).length > 0;
// Si attaccano creature nemiche e Terraforme nemiche con PV; solo le creature bloccano l'attacco diretto.
const attackable = p => around(p).filter(q => { const c = at(q); return c && isFoe(c.owner_index) && (isCreatureCell(c) || (c.kind === 'terraforma' && c.hp !== undefined)); });
const faction = d => {
  const code = String(d?.faction_code ?? factions[Number(d?.faction_id)] ?? 'IND').toLowerCase();
  return ['chi','inf','pes','bul','gro','clo','ind'].includes(code) ? code : 'ind';
};
// ---------- Passo 1: helper di presentazione (stage) ----------
const stageRoot = () => $('stage') ?? document.body; // tutti i dialoghi vivono dentro la colonna centrale

/** Partita base: avversario sempre anonimo */
function opponentImageHtml(size = 140) {
  const s = Number(size) || 140;
  return `<img src="${OPPONENT_IMG}" alt="${OPPONENT_NAME}" width="${s}" height="${s}" style="width:${s}px;height:${s}px;max-width:40vw;object-fit:cover;border-radius:10px;border:2px solid #c9a043" onerror="this.style.display='none'">`;
}




/** Overlay di attesa: blocca click sulla Home mentre si crea/carica la partita. */
function showMatchLoading(text) {
  clearBattlefieldPeek();
  let el = document.getElementById('match-loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'match-loading-overlay';
    el.className = 'game-dialog-overlay';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.classList.remove('hidden', 'is-peeking');
  el.hidden = false;
  el.style.cssText = '';
  const raw = String(text || 'Caricamento...');
  const msg = raw.split(String.fromCharCode(10)).join('<br>');
  el.innerHTML = '';
  const panel = document.createElement('div');
  panel.className = 'game-dialog-panel';
  const h = document.createElement('h2');
  h.className = 'game-dialog-title';
  h.textContent = 'Un attimo';
  const body = document.createElement('div');
  body.className = 'game-dialog-body';
  body.innerHTML = '<p>' + msg + '</p>';
  const actions = document.createElement('div');
  actions.className = 'game-dialog-actions';
  appendBattlefieldPeekButton(actions, el);
  panel.append(h, body, actions);
  el.append(panel);
}
function hideMatchLoading() {
  clearBattlefieldPeek();
  const el = document.getElementById('match-loading-overlay');
  if (!el) return;
  el.hidden = true;
  el.classList.add('hidden');
  el.innerHTML = '';
}

// Debug F12: window.hideMatchLoading()
try { window.hideMatchLoading = hideMatchLoading; window.showMatchLoading = showMatchLoading; } catch (_) {}


function effectiveManaCost(d) {
  return Number(d?.mana_cost ?? 0);
}
const costText = d => d.card_type === 'mostrissimo' ? `✦${Number(d.sacrifice_cost ?? 0)}` : `⚡${effectiveManaCost(d)}`;
const plainText = d => String(d?.effect_text ?? '').replace(/\*\*/g,'').replace(/\s+/g,' ').trim();
const hasText = d => plainText(d).length > 0;
/** Anteprima effetto: intero se corto, altrimenti taglio + puntini. */
const effectPreview = (d, max = 72) => {
  const t = plainText(d);
  if (!t) return '';
  return t.length > max ? `${t.slice(0, Math.max(1, max - 1))}…` : t;
};
const artHTML = d => d.image_url ? `<img src="${escape(d.image_url)}" alt="Illustrazione di ${escape(d.name)}">` : '<span class="game-card-art-placeholder">🎴</span>';
const TEXT_ICON = '<span class="CLS" title="Questa carta ha un testo" aria-hidden="true">📜</span>';
function cellHTML(d, c) {
  const isCreature = isCreatureCell(c);
  const atk = c.attack ?? d.attack ?? 0;
  const hp = c.hp ?? d.hp ?? 0;
  const hurt = isCreature && Number(c.max_hp) > 0 && Number(hp) < Number(c.max_hp) ? ' hurt' : '';
  const buff = isCreature && Number(atk) > Number(d.attack ?? 0) ? ' buff' : '';
  const f = faction(d);
  const cost = d.card_type === 'mostrissimo'
    ? Number(d.sacrifice_cost ?? 0)
    : Number(d.mana_cost ?? 0);
  const costIcon = d.card_type === 'mostrissimo' ? '✦' : '';
  const fx = effectPreview(d, 48);

  return `<article class="cell-card faction-${f}${c.kind === 'terraforma' ? ' is-terra' : ''}">
    <div class="cc-nameband"><span class="cc-name">${escape(d.name)}</span></div>
    <div class="cc-art">${artHTML(d)}</div>
    <span class="cc-cost shape-${f}" title="Costo">${costIcon}${cost}</span>
    ${fx ? `<div class="cc-fx">${escape(fx)}</div>` : ''}
    ${isCreature
      ? `<span class="cc-atk${buff}">${atk}</span><span class="cc-hp${hurt}">${hp}</span>`
      : (c.kind === 'terraforma' && c.hp !== undefined
          ? `<span class="cc-hp${Number(c.hp) < Number(c.max_hp) ? ' hurt' : ''}">${c.hp}</span>`
          : '')}
  </article>`;
}
function handCardHTML(d) {
  const isCreature = creature(d);
  const f = faction(d);
  const cost = d.card_type === 'mostrissimo'
    ? Number(d.sacrifice_cost ?? 0)
    : Number(d.mana_cost ?? 0);
  const costIcon = d.card_type === 'mostrissimo' ? '✦' : '';
  const fx = effectPreview(d, 72);

  return `<article class="fan-card faction-${f}${isCreature ? '' : ' no-stats'}">
    <div class="fc-nameband"><span class="fc-name">${escape(d.name)}</span></div>
    <div class="fc-art">${artHTML(d)}</div>
    <span class="fc-cost shape-${f}" title="Costo">${costIcon}${cost}</span>
    ${fx ? `<div class="fc-fx">${escape(fx)}</div>` : ''}
    ${isCreature ? `<span class="fc-stat atk">${d.attack ?? 0}</span><span class="fc-stat hp">${d.hp ?? 0}</span>` : ''}
  </article>`;
}
// Geometria del ventaglio, in "px di riferimento" della colonna 455x768 (vedi css/stage.css).
function handGeometry(n) {
  const w = Math.max(56, Math.min(88, n > 1 ? HAND_AREA - HAND_MIN_VISIBLE * (n - 1) : 88));
  const step = n > 1 ? Math.min(w + 6, (HAND_AREA - w) / (n - 1)) : 0;
  const rot = n > 1 ? Math.min(3.4, 22 / (n - 1)) : 0;
  const k = n > 1 ? Math.min(3, 12 / Math.max(1, ((n - 1) / 2) ** 2)) : 0;
  return {w, h: Math.round(w * 1.48), step, rot, k, drop: k * ((n - 1) / 2) ** 2};
}
// Misura la finestra reale e imposta la scala della colonna centrale.
// Riferimento 455x768. Finestra "larga" (PC): colonna di 455x768 scalata e centrata. Finestra "stretta" (telefono
// in verticale): la colonna occupa tutta l'area visibile e l'altezza è flessibile.
/** Soglia desktop: colonne laterali + colonna centrale fissa al centro. */
let _fitKey = '';
function fitStage() {
  const stage = $('stage'); if (!stage) return;
  const vw = window.innerWidth, vh = window.innerHeight; if (!vw || !vh) return;
  // Desktop largo: scala per altezza/larghezza ma dimensioni stage SEMPRE 455×768 * unit (niente saltelli)
  const framed = vw >= STAGE_FRAME_MIN_W;
  const byWidth = vw / STAGE_W, byHeight = vh / STAGE_H;
  let unit, width, height;
  if (framed) {
    unit = Math.min(byWidth, byHeight);
    // Lascia un po’ di respiro alle colonne laterali: non usare più del 42% della larghezza per lo stage
    const maxUnitBySide = (vw * 0.42) / STAGE_W;
    unit = Math.min(unit, maxUnitBySide);
    width = STAGE_W * unit;
    height = STAGE_H * unit;
  } else {
    // Mobile / stretto: tutta la larghezza, altezza proporzionata
    unit = vw / STAGE_W;
    width = vw;
    height = Math.min(vh, Math.max(STAGE_H * unit * 0.92, vw / STAGE_MIN_ASPECT));
    // Ricalcola unit dall’altezza se serve per non sforare
    unit = Math.min(width / STAGE_W, height / STAGE_H);
    width = Math.floor(STAGE_W * unit);
    height = Math.floor(STAGE_H * unit);
  }
  const key = `${framed}|${unit.toFixed(3)}|${Math.floor(width)}|${Math.floor(height)}`;
  if (key === _fitKey) return; // evita micro-aggiornamenti che fanno "saltare" il layout
  _fitKey = key;
  stage.style.setProperty('--p', `${unit.toFixed(4)}px`);
  document.documentElement.style.setProperty('--p', `${unit.toFixed(4)}px`);
  stage.style.setProperty('--sw', `${Math.floor(width)}px`);
  stage.style.setProperty('--sh', `${Math.floor(height)}px`);
  stage.closest('.stage-frame')?.classList.toggle('is-framed', framed);
}
function wireStage() {
  fitStage();
  let resizeTimer = null;
  const schedule = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitStage, 80);
  };
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', () => setTimeout(() => { _fitKey = ''; fitStage(); }, 150));
  // visualViewport può oscillare con la tastiera mobile: su desktop framed ignora micro-variazioni
  window.visualViewport?.addEventListener('resize', () => {
    if (window.innerWidth >= STAGE_FRAME_MIN_W) return;
    schedule();
  });
}
function applyReduceMotion(on) {
  const stage = $('stage');
  if (stage) stage.classList.toggle('calm', !!on);
  const toggle = $('reduce-motion-toggle');
  if (toggle) toggle.setAttribute('aria-checked', on ? 'true' : 'false');
  try { lsSet('penombra:reduce-motion', on ? '1' : '0'); } catch (_) { /* ignore */ }
}
function wireReduceMotion() {
  const toggle = $('reduce-motion-toggle');
  if (!toggle || toggle.dataset.ready) return;
  toggle.dataset.ready = 'true';
  let stored = null;
  try { stored = lsGet('penombra:reduce-motion'); } catch (_) { /* ignore */ }
  const prefers = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on = stored === '1' || (stored === null && prefers);
  applyReduceMotion(on);
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    const next = toggle.getAttribute('aria-checked') !== 'true';
    applyReduceMotion(next);
  });
}

/** Preferenza: conferma automatica dei popup «Ho capito». */
function isAutoNotice() {
  try { return lsGet('penombra:auto-ho-capito') === '1'; } catch (_) { return false; }
}
function applyAutoNotice(on) {
  const toggle = $('auto-notice-toggle');
  if (toggle) toggle.setAttribute('aria-checked', on ? 'true' : 'false');
  try { lsSet('penombra:auto-ho-capito', on ? '1' : '0'); } catch (_) { /* ignore */ }
}

/** Overlay dialog unificato (stile card-detail) nella colonna centrale. */
function ensureGameDialogRoot() {
  let el = $('game-dialog-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'game-dialog-overlay';
    el.className = 'game-dialog-overlay hidden';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    stageRoot().append(el);
  }
  return el;
}

/**
 * Dialog unificato stile A (titolo + testo + immagine opz. + bottoni).
 * Sempre: «Guarda campo di battaglia».
 */
function showHoCapitoDialog({ title, bodyHtml, imageHtml = '' }) {
  return new Promise((resolve) => {
    clearBattlefieldPeek();
    const root = ensureGameDialogRoot();
    root.innerHTML = '';
    root.classList.remove('hidden', 'is-peeking');
    const panel = document.createElement('div');
    panel.className = 'game-dialog-panel';
    const h = document.createElement('h2');
    h.className = 'game-dialog-title';
    h.textContent = title || '';
    const body = document.createElement('div');
    body.className = 'game-dialog-body';
    body.innerHTML = bodyHtml || '';
    panel.append(h, body);
    if (imageHtml) {
      const imgWrap = document.createElement('div');
      imgWrap.className = 'game-dialog-image';
      imgWrap.innerHTML = imageHtml;
      panel.append(imgWrap);
    }
    const actions = document.createElement('div');
    actions.className = 'game-dialog-actions';
    let settled = false;
    let autoTimer = null;
    const done = () => {
      if (settled) return;
      settled = true;
      if (autoTimer) clearTimeout(autoTimer);
      clearBattlefieldPeek();
      root.classList.add('hidden');
      root.innerHTML = '';
      resolve();
    };
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'primary-button game-dialog-ok';
    ok.textContent = 'Ho capito';
    ok.onclick = (e) => { e.stopPropagation(); done(); };
    actions.append(ok);
    appendBattlefieldPeekButton(actions, root);
    panel.append(actions);
    root.append(panel);
    root.onclick = (e) => {
      if (e.target === root && !root.classList.contains('is-peeking')) done();
    };
    if (isAutoNotice()) {
      autoTimer = setTimeout(done, 900);
    }
  });
}

/** Conferma generica (stesso stile). buttons: [{ label, primary?, value, onClick? }] */
function showGameConfirmDialog({ title, bodyHtml, imageHtml = '', buttons }) {
  return new Promise((resolve) => {
    clearBattlefieldPeek();
    const root = ensureGameDialogRoot();
    root.innerHTML = '';
    root.classList.remove('hidden', 'is-peeking');
    const panel = document.createElement('div');
    panel.className = 'game-dialog-panel';
    const h = document.createElement('h2');
    h.className = 'game-dialog-title';
    h.textContent = title || '';
    const body = document.createElement('div');
    body.className = 'game-dialog-body';
    body.innerHTML = bodyHtml || '';
    panel.append(h, body);
    if (imageHtml) {
      const imgWrap = document.createElement('div');
      imgWrap.className = 'game-dialog-image';
      imgWrap.innerHTML = imageHtml;
      panel.append(imgWrap);
    }
    const actions = document.createElement('div');
    actions.className = 'game-dialog-actions';
    let settled = false;
    const done = (val) => {
      if (settled) return;
      settled = true;
      clearBattlefieldPeek();
      root.classList.add('hidden');
      root.innerHTML = '';
      resolve(val);
    };
    for (const b of buttons || []) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = b.primary ? 'primary-button' : 'secondary-button';
      btn.textContent = b.label;
      btn.onclick = (e) => {
        e.stopPropagation();
        if (b.onClick) b.onClick();
        done(b.value);
      };
      actions.append(btn);
    }
    appendBattlefieldPeekButton(actions, root);
    panel.append(actions);
    root.append(panel);
  });
}



function wireAutoNotice() {
  const toggle = $('auto-notice-toggle');
  if (!toggle || toggle.dataset.ready) return;
  toggle.dataset.ready = 'true';
  let stored = null;
  try { stored = lsGet('penombra:auto-ho-capito'); } catch (_) { /* ignore */ }
  applyAutoNotice(stored === '1');
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    const next = toggle.getAttribute('aria-checked') !== 'true';
    applyAutoNotice(next);
  });
}
let narratorResolver = null;
function setNarratorImage(src) {
  const url = src || OPPONENT_IMG;
  for (const id of ['narrator-popup-img', 'narrator-desk-img']) {
    const img = $(id);
    if (!img) continue;
    img.style.display = '';
    img.onerror = () => {
      img.style.display = 'none';
      img.nextElementSibling?.classList.remove('hidden');
    };
    if (img.getAttribute('src') !== url) img.setAttribute('src', url);
    img.onload = () => {
      img.style.display = '';
      img.nextElementSibling?.classList.add('hidden');
    };
  }
}
/** Mostra battuta del narratore. Su mobile apre popup; su desktop aggiorna la colonna sinistra. */
function showNarrator(text, imageSrc) {
  const speech = String(text ?? '').trim() || '…';
  setNarratorImage(imageSrc);
  const desk = $('narrator-desk-speech');
  if (desk) desk.textContent = speech;
  const popup = $('narrator-popup');
  const bubble = $('narrator-popup-speech');
  if (bubble) bubble.textContent = speech;
  const wide = typeof matchMedia === 'function' && matchMedia('(min-width: 1100px)').matches
    && !!document.querySelector('.stage-frame.is-framed');
  if (wide || !popup) return Promise.resolve();
  popup.classList.remove('hidden');
  return new Promise(resolve => {
    narratorResolver = resolve;
    const btn = $('narrator-continue');
    if (btn && !btn.dataset.ready) {
      btn.dataset.ready = 'true';
      btn.addEventListener('click', () => hideNarrator());
    }
  });
}
function hideNarrator() {
  $('narrator-popup')?.classList.add('hidden');
  const r = narratorResolver;
  narratorResolver = null;
  if (r) r();
}
function wireMenu() {
  const button = $('menu-button'), panel = $('menu-panel');
  if (!button || !panel || button.dataset.ready) return;
  button.dataset.ready = 'true';
  const setOpen = open => { panel.classList.toggle('hidden',!open); button.setAttribute('aria-expanded',String(open)); };
  button.addEventListener('click',e => { e.stopPropagation(); setOpen(panel.classList.contains('hidden')); });
  panel.addEventListener('click',e => {
    const t = e.target.closest?.('button');
    if (t) setOpen(false);
  });
  document.addEventListener('click',e => { if (!panel.classList.contains('hidden') && !panel.contains(e.target) && e.target !== button) setOpen(false); });
  document.addEventListener('keydown',e => { if (e.key === 'Escape' && !panel.classList.contains('hidden')) setOpen(false); });
}

/** Pannello Impostazioni sempre visibile (audio, auto Ho capito, riduci animazioni). */
function wireSettings() {
  const button = $('settings-button'), panel = $('settings-panel');
  if (!button || !panel || button.dataset.ready) return;
  button.dataset.ready = 'true';
  const setOpen = open => {
    panel.classList.toggle('hidden', !open);
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(panel.classList.contains('hidden'));
  });
  document.addEventListener('click', e => {
    if (panel.classList.contains('hidden')) return;
    if (panel.contains(e.target) || e.target === button) return;
    setOpen(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.classList.contains('hidden')) setOpen(false);
  });
  wireReduceMotion();
  wireAutoNotice();
}
function drawOpponentHand() {
  const root = $('opponent-hand'); if (!root) return;
  const n = them()?.hand?.length ?? 0; // SOLO il numero: mai card_id o faccia delle carte dell'IA.
  root.replaceChildren(); root.style.setProperty('--n',String(Math.max(n,1)));
  root.setAttribute('aria-label',`L’IA ha ${n} ${n === 1 ? 'carta' : 'carte'} in mano`);
  // Solo dorsi: il conteggio testuale «N in mano» è ridondante (i dorsi bastano).
  const backs = document.createElement('span'); backs.className = 'oh-backs';
  for (let i = 0; i < n; i++) { const back = document.createElement('span'); back.className = 'card-back'; backs.append(back); }
  root.append(backs);
}
function cardHTML(d, mini = false, cell = null) {
  const f = faction(d);
  const cls = `faction-${f}`;
  const isMostrissimo = d.card_type === 'mostrissimo';
  const costNum = isMostrissimo ? Number(d.sacrifice_cost ?? 0) : Number(d.mana_cost ?? 0);
  const costIcon = isMostrissimo ? '✦' : '';
  const art = d.image_url
    ? `<img src="${escape(d.image_url)}" alt="Illustrazione di ${escape(d.name)}" loading="lazy">`
    : '<span class="game-card-art-placeholder">🎴</span>';
  const atk = cell?.attack ?? d.attack ?? 0;
  const hp = cell?.hp ?? d.hp ?? 0;
  const subtype = d.subtype ? String(d.subtype) : '';
  const factionLabel = deckFactionNames[f.toUpperCase()] || f.toUpperCase();
  const typeLabel = types[d.card_type] ?? d.card_type;
  const isCreature = creature(d);
  // Stesso layout delle mini (fan/cell): badge rotondi agli angoli + effetto sotto l’arte.
  const fxShort = effectPreview(d, mini ? 90 : 160);
  const rulesFull = escape(d.effect_text || '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split(String.fromCharCode(10)).join('<br>');
  if (mini) {
    return `<article class="board-card fan-like ${cls}${isCreature ? '' : ' no-stats'}">
      <div class="fc-nameband"><span class="fc-name">${escape(d.name)}</span></div>
      <div class="fc-art">${art}</div>
      <span class="fc-cost shape-${f}" title="Costo">${costIcon}${costNum}</span>
      ${fxShort ? `<div class="fc-fx">${escape(fxShort)}</div>` : ''}
      ${isCreature ? `<span class="fc-stat atk">${atk}</span><span class="fc-stat hp">${hp}</span>` : ''}
    </article>`;
  }

  return `<article class="game-card fan-like ${cls}${isCreature ? '' : ' no-stats'}">
    <div class="fc-nameband"><span class="fc-name">${escape(d.name)}</span></div>
    <div class="fc-art">${art}</div>
    <span class="fc-cost shape-${f}" title="Costo">${costIcon}${costNum}</span>
    <div class="gc-type">${escape(typeLabel)}${subtype ? ' · ' + escape(subtype) : ''} · ${escape(factionLabel)}</div>
    <div class="game-card-rules">${rulesFull || '<em>Nessun effetto.</em>'}</div>
    ${d.flavor_text ? `<div class="game-card-flavor">${escape(d.flavor_text)}</div>` : ''}
    ${isCreature ? `<span class="fc-stat atk">${atk}</span><span class="fc-stat hp">${hp}</span>` : ''}
    <div class="gc-rarity">${escape(rarities[d.rarity] ?? d.rarity ?? 'Comune')}</div>
  </article>`;
}
// Durante monster_etb la Trappola mirata può colpire soltanto la fonte
// dell'ETB. Le altre finestre conservano le regole ordinarie di bersaglio.
function targetAllowed(d,c,event=null) {
  if (!isCreatureCell(c)) return false;
  if (d.card_type === 'aura') return true;
  const e = targetEffect(d);
  if (!e) return false;
  if (event?.kind === 'monster_etb' && c.instance_id !== event.source_instance_id) return false;
  if (e.target === 'any_target') return true;
  if (['damage','damage_creature'].includes(e.type) && e.timing !== 'instant') return isFoe(c.owner_index);
  if (e.type === 'heal' && e.timing !== 'instant') return isMine(c.owner_index);
  return true;
}
function targets(d) {
  const found = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const cell = at({row,col});
    if (targetAllowed(d,cell)) found.push(cell);
  }
  return found;
}
function permanents() {
  const found = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const c = at({row,col});
    if (!c) continue;
    if (isMine(c.owner_index)) found.push({id:c.instance_id,card_id:c.card_id,type:c.kind === 'terraforma' ? 'Terraforma' : 'Creatura'});
    if (isCreatureCell(c)) for (const a of c.auras ?? []) if (isMine(a.owner_index)) found.push({id:a.instance_id,card_id:a.card_id,type:'Aura'});
  }
  return found;
}
function summonCells(p) {
  if (!p) return [];
  const found = [];
  const home = myHomeRow();
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const pos = {row,col};
    if (!at(pos) && (row === home || (row === 1 && (p.freed_positions ?? []).some(x => eq(x,pos))))) found.push(pos);
  }
  return found;
}
let noticeTimer = null;
let noticeResolver = null;
let noticeOpen = false;

function dismissNotice() {
  const el = $('phase-banner');
  if (!el) {
    const r0 = noticeResolver; noticeResolver = null; noticeOpen = false;
    if (r0) r0();
    return;
  }
  clearTimeout(noticeTimer);
  el.classList.remove('is-visible');
  setTimeout(() => {
    if (!noticeOpen) {
      el.hidden = true;
      el.innerHTML = '';
    }
  }, 200);
  noticeOpen = false;
  document.body.classList.remove('notice-open');
  const r = noticeResolver;
  noticeResolver = null;
  if (r) r();
}

/** Mostra un messaggio e mette in pausa finché l’utente non clicca «Ho capito» o fuori. */
function notice(text, type = '') {
  const msg = String(text ?? '').trim();
  if (!msg) return Promise.resolve();

  const el = $('phase-banner');
  if (!el) return Promise.resolve();

  // Chiude eventuale notice precedente
  if (noticeResolver) {
    const prev = noticeResolver;
    noticeResolver = null;
    prev();
  }

  return new Promise(resolve => {
    noticeResolver = resolve;
    noticeOpen = true;
    document.body.classList.add('notice-open');
    clearTimeout(noticeTimer);
    el.hidden = false;
    el.className = `phase-banner${type ? ' ' + type : ''}`;
    el.innerHTML =
      `<span class="phase-banner-text">${escape(msg)}</span>` +
      `<button type="button" class="phase-banner-ok" id="phase-banner-ok">Ho capito</button>`;
    void el.offsetWidth;
    el.classList.add('is-visible');

    const ok = $('phase-banner-ok');
    if (ok) ok.onclick = e => { e.stopPropagation(); dismissNotice(); };
    el.onclick = e => {
      // click sul banner (anche fuori dal bottone) chiude
      if (e.target === el || e.target.classList?.contains('phase-banner-text')) dismissNotice();
    };

    // Auto «Ho capito»: chiude da solo dopo una breve pausa (solo questi banner, non i dialoghi Mummia)
    if (isAutoNotice()) {
      noticeTimer = setTimeout(() => { dismissNotice(); }, 900);
    }
  });
}

function wireNoticeDismiss() {
  if (document.body.dataset.noticeWire) return;
  document.body.dataset.noticeWire = 'true';
  document.addEventListener('click', e => {
    if (!noticeOpen) return;
    // click ovunque fuori dai controlli del banner chiude
    const el = $('phase-banner');
    if (el && el.contains(e.target)) return; // gestito dal banner
    dismissNotice();
  }, true);
}

function fail(e) { console.error(e); notice(e instanceof Error ? e.message : 'Errore inatteso','error'); }
function close() {
  view = null;
  $('card-detail-overlay')?.classList.add('hidden');
  document.body.classList.remove('detail-open');
  // Su desktop l'anteprima resta sull'ultima carta vista; non la svuotiamo.
}
async function moveCost(cell) {
  for (const aura of cell?.auras ?? []) {
    const d = await card(aura.card_id);
    if (effects(d).some(e => e.type === 'movement_cost' && e.duration === 'while_attached' && e.target === 'enchanted_creature' && e.amount === 0)) return 0;
  }
  return 1;
}
function button(text,fn,disabled=false) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'primary-button'; b.textContent = text; b.disabled = disabled;
  b.onclick = () => Promise.resolve(fn()).catch(fail);
  return b;
}

/** Testo guida sotto la griglia durante la scelta bersaglio / attacco. */
function targetReminderText(cardDef) {
  const fx = cardDef ? (plainText(cardDef) || cardDef.name || 'effetto') : 'effetto';
  return `Stai attivando: «${fx}». Seleziona un bersaglio tra quelli evidenziati (bordo bianco).`;
}
function showTargetReminder(text) {
  const el = $('selection-instructions');
  if (!el) return;
  el.hidden = false;
  el.textContent = text || '';
}
function hideTargetReminder() {
  const el = $('selection-instructions');
  if (!el) return;
  el.hidden = true;
  el.textContent = '';
}

/**
 * Anteprima del permanente scelto come bersaglio → Conferma / Annulla.
 * Risolve true se confermato, false se annullato.
 */
function confirmTargetChoice(cell, cardDef, hint = '', dialogTitle = 'Conferma bersaglio') {
  const who = isMine(cell?.owner_index) ? 'tua' : 'IA';
  const stats = isCreatureCell(cell)
    ? ` · ATK ${cell.attack} · HP ${cell.hp}`
    : (cell?.hp != null ? ` · PV ${cell.hp}` : '');
  const body = hint || `${cardDef?.name ?? 'Permanente'} (${who}${stats})`;
  const imageHtml = cardDef ? cardHTML(cardDef, true) : '';
  return showGameConfirmDialog({
    title: dialogTitle,
    bodyHtml: `<p>${escape(body)}</p>`,
    imageHtml,
    buttons: [
      { label: 'Annulla', value: false },
      { label: 'Conferma', primary: true, value: true },
    ],
  });
}
function overlay() {
  let el = $('card-detail-overlay');
  if (el) return el;
  el = document.createElement('div'); el.id = 'card-detail-overlay'; el.className = 'card-detail-overlay hidden';
  el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true');
  el.innerHTML = '<div class="detail-stage"><div class="detail-image" id="detail-image"></div><div class="detail-actions" id="detail-actions"></div></div>';
  el.onclick = e => { if (e.target === el) close(); };
  stageRoot().append(el); return el;
}
function reactionDialog() {
  let el = $('reaction-dialog');
  if (el) return el;
  el = document.createElement('div'); el.id = 'reaction-dialog'; el.className = 'card-detail-overlay hidden';
  el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','Finestra reattiva');
  const stage = document.createElement('div'); stage.className = 'panel'; stage.style.cssText = 'width:min(94vw,720px);max-height:90dvh;overflow:auto;text-align:center;border-color:#d5a758;box-shadow:0 12px 48px #000';
  const title = document.createElement('h2'); title.id = 'reaction-title'; title.textContent = 'Finestra reattiva';
  const text = document.createElement('p'); text.id = 'reaction-description';
  const choices = document.createElement('div'); choices.id = 'reaction-choices'; choices.style.cssText = 'display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;align-items:stretch;margin:.7rem 0';
  const actions = document.createElement('div'); actions.id = 'reaction-actions';
  stage.append(title,text,choices,actions); el.append(stage); stageRoot().append(el); return el;
}
function choiceDialog() {
  let el = $('death-choice-dialog');
  if (el) return el;
  el = document.createElement('div'); el.id = 'death-choice-dialog'; el.className = 'card-detail-overlay hidden';
  el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-labelledby','death-choice-title');
  el.style.zIndex = '150';
  const panel = document.createElement('div'); panel.className = 'panel';
  panel.style.cssText = 'width:min(94vw,740px);max-height:90dvh;overflow:auto;text-align:center;border-color:#d5a758;box-shadow:0 12px 48px #000';
  const title = document.createElement('h2'); title.id = 'death-choice-title';
  const text = document.createElement('p'); text.id = 'death-choice-description';
  const choices = document.createElement('div'); choices.id = 'death-choice-options';
  choices.style.cssText = 'display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;margin:.8rem 0';
  const actions = document.createElement('div'); actions.id = 'death-choice-actions';
  panel.append(title,text,choices,actions); el.append(panel); stageRoot().append(el);
  // Nessun click sullo sfondo o Escape può annullare una scelta obbligatoria.
  return el;
}

/** Popup: chi pesca X carte? (Tu / avversario). */
function showDrawPlayerChoice(choiceId, amount, eligibleIds) {
  try { dismissNotice(); } catch (_) { /* ignore */ }
  const foeName = (typeof opponentDisplayName === 'function' ? opponentDisplayName() : null) || 'Avversario';
  const n = Math.max(1, Number(amount) || 1);
  return new Promise(resolve => {
    let el = $('draw-player-choice-dialog');
    if (!el) {
      el = document.createElement('div');
      el.id = 'draw-player-choice-dialog';
      el.className = 'card-detail-overlay';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.style.zIndex = '160';
      stageRoot().append(el);
    }
    el.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.cssText = 'width:min(92vw,400px);margin:auto;padding:1.3rem 1.2rem;text-align:center;border:1px solid #d5a758;box-shadow:0 12px 48px #000';
    const text = document.createElement('p');
    text.style.cssText = 'margin:0 0 1.1rem;line-height:1.45;font-size:1.08rem;';
    text.textContent = `Chi vuoi che peschi ${n} cart${n === 1 ? 'a' : 'e'}?`;
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap';
    const makeBtn = (label, targetId) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'primary-button';
      b.textContent = label;
      b.onclick = async () => {
        el.classList.add('hidden');
        el.style.display = 'none';
        try {
          await request('death/target', { choiceId, targetInstanceId: targetId }, 'Pesca risolta.');
        } catch (e) { fail(e); }
        resolve();
      };
      return b;
    };
    // eligible: player:1 = tu, player:0 = avversario (in PvE)
    if ((eligibleIds || []).includes('player:1')) actions.append(makeBtn('Tu', 'player:1'));
    if ((eligibleIds || []).includes('player:0')) actions.append(makeBtn(foeName, 'player:0'));
    // fallback se ids diversi
    if (!actions.childElementCount) {
      for (const id of eligibleIds || []) {
        const label = id === 'player:1' ? 'Tu' : id === 'player:0' ? foeName : id;
        actions.append(makeBtn(label, id));
      }
    }
    panel.append(text, actions);
    el.append(panel);
    el.classList.remove('hidden');
    el.style.display = '';
  });
}

async function renderDeathChoice() {
  const el = choiceDialog(), order = deathOrder(), selected = deathTarget();
  if (!state || state.status !== 'running' || busy || (!order && !selected)) { el.classList.add('hidden'); return; }
  close(); closeGraveyard(); reactionDialog().classList.add('hidden');
  const title = $('death-choice-title'), text = $('death-choice-description');
  const options = $('death-choice-options'), actions = $('death-choice-actions');
  options.replaceChildren(); actions.replaceChildren();
  if (order) {
    if (deathDraft.choiceId !== order.choice_id) deathDraft = {choiceId:order.choice_id,instanceIds:[]};
    const creatures = order.creatures ?? [], chosen = deathDraft.instanceIds;
    title.textContent = 'Ordine degli effetti alla morte';
    text.textContent = `Scegli la prossima creatura (${chosen.length + 1}/${creatures.length}). Gli effetti di ogni creatura restano nell’ordine scritto sulla carta.`;
    for (const source of creatures) {
      if (chosen.includes(source.instance_id)) continue;
      const d = await card(source.card_id);
      if (deathOrder()?.choice_id !== order.choice_id) return;
      const b = button(`${d.name} · ${isMine(source.owner_index) ? 'tua' : 'IA'} · ${source.effect_indices?.length ?? 0} effetti`, async () => {
        if (busy || deathOrder()?.choice_id !== order.choice_id) return;
        deathDraft.instanceIds.push(source.instance_id);
        if (deathDraft.instanceIds.length === creatures.length) {
          const instanceIds = [...deathDraft.instanceIds];
          await request('death/order',{choiceId:order.choice_id,instanceIds},'Ordine degli effetti alla morte confermato.');
        } else await renderDeathChoice();
      });
      options.append(b);
    }
    if (chosen.length) actions.append(button('Ricomincia ordine',async () => {
      deathDraft = {choiceId:order.choice_id,instanceIds:[]}; await renderDeathChoice();
    }));
  } else if (selected) {
    deathDraft = {choiceId:null,instanceIds:[]};
    // ETB già confermato con «Ho capito»: non riaprire il dialog, resta la scelta sulla griglia.
    if (flow?.kind === 'etb-target' && flow.choiceId === selected.choice_id) {
      el.classList.add('hidden');
      return;
    }
    const d = await card(selected.task.card_id);
    if (deathTarget()?.choice_id !== selected.choice_id) return;
    const src = selected.task?.source;
    // on_play / terraforma / aura → scelta sulla griglia (creatura già in campo).
    // Solo on_death resta nel dialogo a lista, con testo corretto «alla morte».
    const eligibleIds = selected.eligible_instance_ids ?? [];
    const playerOnly = eligibleIds.length > 0 && eligibleIds.every(id => String(id).startsWith('player:'));
    if (playerOnly) {
      el.classList.add('hidden');
      if (busy || deathTarget()?.choice_id !== selected.choice_id) return;
      if (flow?.kind === 'draw-player' && flow.choiceId === selected.choice_id) return;
      flow = { kind: 'draw-player', choiceId: selected.choice_id };
      const amt = selected.task?.amount; // may be undefined
      let amount = 1;
      try {
        const d = await card(selected.task?.card_id);
        const list = d?.effect_json?.effects || (d?.effect_json?.type ? [d.effect_json] : []);
        const fx = list[selected.task?.effect_index ?? 0];
        if (fx?.amount != null) amount = Number(fx.amount) || 1;
      } catch (_) { /* ignore */ }
      await showDrawPlayerChoice(selected.choice_id, amount, eligibleIds);
      return;
    }
    const useBoardPick = src === 'on_play' || src === 'terraforma_trigger' || src === 'aura_attack' || !src;
    if (useBoardPick) {
      el.classList.add('hidden');
      if (busy || deathTarget()?.choice_id !== selected.choice_id) return;
      flow = {
        kind: 'etb-target',
        choiceId: selected.choice_id,
        eligible: eligibleIds,
        sourceId: selected.task?.source_instance_id,
      };
      try { dismissNotice(); } catch (_) { /* ignore */ }
      await drawBoard();
      const sourceId = selected.task?.source_instance_id;
      if (sourceId) {
        for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
          const cell = at({ row, col });
          if (cell?.instance_id === sourceId) {
            const root = $('shared-board');
            const rowEl = root?.children?.[toViewRow(row)];
            const btn = rowEl?.children?.[col];
            if (btn) {
              btn.classList.add('just-entered');
              btn.style.outline = '3px solid #2fe0c4';
              btn.style.boxShadow = '0 0 18px rgba(47,224,196,.55)';
            }
          }
        }
      }
      showTargetReminder(targetReminderText(d));
      return;
    } else {
      // Solo effetti davvero «alla morte»
      title.textContent = 'Bersaglio dell’effetto alla morte';
      text.textContent = `${d.name}: scegli il bersaglio dell’effetto alla morte.`;
      for (const instanceId of selected.eligible_instance_ids ?? []) {
        let found = null;
        for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
          const cell = at({row,col});
          if (cell?.kind === 'creature' && cell.instance_id === instanceId) found = {cell,row,col};
        }
        if (!found) continue;
        const targetCard = await card(found.cell.card_id);
        if (deathTarget()?.choice_id !== selected.choice_id) return;
        const b = button(`${targetCard.name} · ${isMine(found.cell.owner_index) ? 'tua' : 'IA'} · [${found.row},${found.col}] · HP ${found.cell.hp}`,() => {
          if (busy || deathTarget()?.choice_id !== selected.choice_id) return;
          return request('death/target',{choiceId:selected.choice_id,targetInstanceId:instanceId},'Effetto alla morte risolto.');
        });
        options.append(b);
      }
      if ((selected.eligible_instance_ids ?? []).includes(AI_TARGET)) {
        options.append(button(`${opponentDisplayName()} · PV ${them()?.life ?? '?'}`,() => {
          if (busy || deathTarget()?.choice_id !== selected.choice_id) return;
          return request('death/target',{choiceId:selected.choice_id,targetInstanceId:AI_TARGET},'Effetto risolto.');
        }));
      }
      if (!options.childElementCount) text.textContent = 'Nessun bersaglio visibile: aggiorna la partita per recuperare lo stato.';
    }
  }
  el.classList.remove('hidden');
}
function reactionDescription(e) {
  const names = {
    upkeep_start:'Inizia il MANATENIMENTO avversario, prima di mana, risveglio e pesca.',
    upkeep_end:'Il MANATENIMENTO avversario sta terminando, prima della fase principale.',
    hand_card:'L’avversario ha dichiarato una carta dalla mano.',
    move:'L’avversario ha dichiarato un movimento.',attack:'L’avversario ha dichiarato un attacco.',
    mostrissimo_sacrifice:'L’avversario ha dichiarato un sacrificio.',
    mostrissimo_before_entry:'Il Mostrissimo ha pagato i sacrifici e sta per entrare nella cella scelta.',
    monster_etb:'Sta per risolversi un effetto all’entrata di una creatura avversaria.',
  };
  return names[e?.kind] ?? 'L’avversario ha dichiarato un’azione.';
}
// Il popup non modifica lo stato: la richiesta /advance parte solo dopo
// che il checkpoint server-side è stato presentato per un secondo.
function presentationLayer() {
  let layer = $('public-checkpoint-layer');
  if (layer) return layer;
  layer = document.createElement('div'); layer.id = 'public-checkpoint-layer';
  Object.assign(layer.style,{position:'absolute',inset:'0',zIndex:'200',display:'none',
    alignItems:'center',justifyContent:'center',background:'rgba(5,6,18,.78)',
    padding:'1.2rem',boxSizing:'border-box',pointerEvents:'auto'});
  stageRoot().append(layer); return layer;
}
/** Testo annuncio pubblico senza dump tecnici (UUID, monster_etb, [3e]). */
function humanizePublicText(a) {
  let t = String(a?.text ?? '');
  t = t.replace(/\[3e\]\s*/gi, '');
  t = t.replace(/\([^)]*fonte[^)]*\)/gi, '');
  t = t.replace(/monster_etb/gi, "effetto all’entrata");
  t = t.replace(/mostrissimo_before_entry/gi, 'ingresso del Mostrissimo');
  t = t.replace(/upkeep_start/gi, 'inizio manatenimento');
  t = t.replace(/upkeep_end/gi, 'fine manatenimento');
  t = t.replace(/hand_card/gi, 'carta dalla mano');
  t = t.replace(/;\s*evento da riprendere dopo gli effetti\.?/gi, '');
  t = t.replace(/;\s*evento contrastato\.?/gi, ' — effetto annullato');
  t = t.replace(/\s+/g, ' ').trim();
  // Se resta solo rumore e c'è una carta, titolo generico.
  if ((!t || t.length < 3) && a?.kind === 'card') {
    const who = a.actor === 0 ? opponentDisplayName() : a.actor === 1 ? 'Tu' : 'Qualcuno';
    return `${who} gioca una carta.`;
  }
  return t;
}

/** Mostra il popup di fase a ogni cambio turno/fase/giocatore, anche senza eventi. */
/** Popup di fase (Manatenimento / Svolgimento / Chiusura). */
async function presentPhase(phase, actor, turn, maxMana) {
  if (!state || state.status !== 'running') return;
  const ph = phase === 'main' ? 'main' : phase === 'end' ? 'end' : 'upkeep';
  await presentPublic({
    kind: 'phase',
    phase: ph,
    actor,
    turn: turn ?? state.current_turn ?? 1,
    max_mana: maxMana ?? state.players?.[actor]?.max_mana ?? 0,
    text: '',
  }, presentationGeneration);
}

/**
 * Scandisce le fasi richieste in ordine.
 * Ogni turno: manatenimento → svolgimento → (in fine turno) chiusura.
 */
async function scanPhases(phases, actor = null, turn = null) {
  if (!state || state.status !== 'running') return;
  const who = actor ?? state.active_player_index;
  const tnum = turn ?? state.current_turn ?? 1;
  const max = state.players?.[who]?.max_mana ?? 0;
  for (const phase of phases) {
    await presentPhase(phase, who, tnum, max);
  }
}

/** Allinea il banner alla fase corrente del motore (senza saltare se già mostrata). */
async function ensurePhaseBanner() {
  if (!state || state.status !== 'running') return;
  const phase = state.phase === 'main' ? 'main' : state.phase === 'end' ? 'end' : 'upkeep';
  await presentPhase(phase, state.active_player_index, state.current_turn ?? 1, state.players?.[state.active_player_index]?.max_mana ?? 0);
}

async function presentPublic(a, generation) {
  if (a?.kind === 'phase') {
    const ph = a.phase === 'main' ? 'main' : a.phase === 'end' ? 'end' : 'upkeep';
    const key = `${a.turn ?? state?.current_turn ?? 1}|${a.actor ?? state?.active_player_index}|${ph}`;
    if (key === lastPhaseKey) return; // già scandita
    lastPhaseKey = key;
  }
  const layer = presentationLayer(); layer.replaceChildren();
  const panel = document.createElement('div');
  Object.assign(panel.style,{width:'100%',maxHeight:'100%',overflowY:'auto',
    background:'#171426',color:'#f7eedc',border:'2px solid #a78355',borderRadius:'14px',
    padding:'1.2rem',boxShadow:'0 15px 60px #000',textAlign:'center',fontSize:'1.15rem',
    display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'});
  const title = document.createElement('div');
  if (a.kind === 'phase') {
    const phaseName = a.phase === 'upkeep' ? 'MANATENIMENTO'
      : a.phase === 'main' ? 'SVOLGIMENTO'
      : a.phase === 'end' ? 'CHIUSURA' : 'INIZIO';
    let who = '—';
    if (a.actor === 0) who = opponentDisplayName();
    else if (a.actor === 1) {
      try { who = usernameFromEmail((await getCurrentUser())?.email) || 'Tu'; }
      catch { who = 'Tu'; }
    }
    title.style.cssText = 'text-align:center;line-height:1.55;font-family:"Nunito",system-ui,sans-serif;font-weight:800;letter-spacing:.02em';
    title.innerHTML =
      `TURNO: <strong>${a.turn ?? '—'}</strong><br>` +
      `GIOCATORE ATTIVO: <strong>${escape(who)}</strong><br>` +
      `FASE ATTUALE: <strong>${phaseName}</strong><br>` +
      `MANA MAX: <strong>${a.max_mana ?? 0}</strong>`;
  } else {
    title.textContent = humanizePublicText(a);
  }
  panel.append(title);
  if (a.kind === 'card' && a.card_id) {
    try { const d = await card(a.card_id); if (generation !== presentationGeneration) return;
      const box = document.createElement('div'); box.style.margin = '14px auto';
      box.innerHTML = cardHTML(d); panel.append(box);
    } catch(e) { console.warn('Anteprima della carta non disponibile',e); }
  }
  if (a.kind !== 'phase' && a.position) {
    const cell = document.createElement('div'); cell.textContent = `Cella [${a.position.row},${a.position.col}]`;
    panel.append(cell);
  }
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.textContent = 'Ho capito';
  ok.className = 'phase-banner-ok';
  Object.assign(ok.style,{
    minHeight:'44px',padding:'0 20px',cursor:'pointer',
    border:'3px solid #8a5a14',borderRadius:'14px',
    background:'linear-gradient(180deg,#e8c565,#e0a22a)',color:'#4a1f08',
    fontFamily:"'Lilita One', Georgia, serif",fontSize:'1.05rem'
  });
  panel.append(ok);
  layer.append(panel); layer.style.display = 'flex';
  document.body.classList.add('notice-open');
  // Pausa finché l’utente non conferma (bottone o click sullo sfondo del layer).
  // Se «Auto Ho capito» è attivo, chiude da solo dopo una breve pausa.
  await new Promise(resolve => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(autoTimer);
      if (generation !== presentationGeneration) { resolve(); return; }
      layer.style.display = 'none';
      layer.replaceChildren();
      document.body.classList.remove('notice-open');
      layer.onclick = null;
      resolve();
    };
    let autoTimer = null;
    ok.onclick = e => { e.stopPropagation(); done(); };
    layer.onclick = e => { if (e.target === layer) done(); };
    if (isAutoNotice()) {
      autoTimer = setTimeout(done, 900);
    }
  });
}
// Passo 3: ogni risultato pubblico ha il suo balloon (state.public_announcements, in ordine); /advance usa
// sempre l'ID dell'ultimo (state.public_announcement). Dopo refresh/recupero (onlyLast) si ripresenta solo l'ultimo.

function showOpponentAngryDialog(text) {
  return new Promise(resolve => {
    let el = $('opponent-angry-dialog');
    if (!el) {
      el = document.createElement('div');
      el.id = 'opponent-angry-dialog';
      el.className = 'card-detail-overlay';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.style.zIndex = '170';
      document.body.append(el);
    }
    el.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.cssText = 'width:min(92vw,420px);margin:auto;padding:1.2rem;text-align:center;border:1px solid #d5a758;box-shadow:0 12px 48px #000';
    const img = document.createElement('img');
    img.src = 'img/png/domanda/domanda.webp';
    img.alt = 'nomeavversario';
    img.width = 160;
    img.height = 160;
    img.style.cssText = 'display:block;margin:0 auto .75rem;border-radius:12px;object-fit:cover;filter:drop-shadow(0 0 12px rgba(255,100,80,.35))';
    img.onerror = () => { img.style.display = 'none'; };
    const p = document.createElement('p');
    p.style.cssText = 'margin:0 0 1rem;line-height:1.45;font-size:1.1rem';
    p.textContent = text;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'primary-button';
    btn.textContent = 'Ho capito';
    btn.onclick = () => { el.classList.add('hidden'); resolve(); };
    panel.append(img, p, btn);
    el.append(panel);
    el.classList.remove('hidden');
  });
}

function queuePresentation(onlyLast = false) {
  if (presentationRunning || !matchId || !state?.public_announcement) return;
  const generation = presentationGeneration;
  presentationRunning = true;
  let replay = onlyLast;
  void (async () => {
    try {
      while (generation === presentationGeneration && matchId && state?.public_announcement) {
        const a = state.public_announcement, id = matchId;
        const list = !replay && Array.isArray(state.public_announcements) && state.public_announcements.length > 1 ? state.public_announcements : [a];
        replay = false;
        for (let i = 0; i < list.length; i++) {
          await presentPublic(list[i], generation);
          if (generation !== presentationGeneration || matchId !== id) break;
          if (i < list.length - 1) await waitPresentation(180);
        }
        if (generation !== presentationGeneration || matchId !== id) break;

        if (state.status === 'finished') {
      void setBaseMatchInProgress(false);
          await handleMatchFinished();
          break;
        }

        // Serve input del giocatore (trappola / morte / bersaglio): non advance, non riproporre.
        if (state.status !== 'running' || state.pending_reaction || obligatory()) break;

        // IMPORTANTE: chiama /advance anche con work_queue vuota.
        // Altrimenti lo stesso public_announcement resta nello state e viene
        // riproposto all’infinito → popup a catena e UI bloccata (busy / disabled).
        // pending_mostrissimo NON blocca advance (i sacrifici restano validi).
        busy = true; controls();
        try {
          state = (await api(`/match/${encodeURIComponent(id)}/advance`,
            { method: 'POST', body: { expectedAnnouncementId: a.id } })).state;
          await render(); await logs();
          await ensurePhaseBanner().catch(fail);
          if (state.status === 'finished') {
      void setBaseMatchInProgress(false);
            await handleMatchFinished();
            break;
          }
        } catch (e) {
          fail(e);
          try { state = (await api(`/match/${encodeURIComponent(id)}`)).state; await render(); } catch (refreshError) { console.warn(refreshError); }
          if (state?.status === 'finished') {
            await handleMatchFinished();
          }
          break;
        } finally {
          busy = false;
          await render().catch(fail);
        }
        // Se il server non ha consumato il checkpoint, esci (evita loop)
        if (state?.public_announcement?.id === a.id) break;
      }
    } finally {
      presentationRunning = false;
      busy = false;
      try { controls(); } catch (_) { /* ignore */ }
    }
  })();
}

/** Pulisce completamente la UI della partita (griglia, mani, overlay) senza toccare i progressi Storia. */
function clearMatchUI() {
  try { lsRemove('penombra:last-match'); } catch (_) { /* ignore */ }
  void api('/me/profile', { method: 'PUT', body: { last_match_id: null } }).catch(() => { /* ignore */ });
  matchId = null;
  state = null;
  flow = null;
  priorMatch = null;
  deathDraft = { choiceId: null, instanceIds: [] };
  busy = false; // importante: sblocca newMatch dopo una vittoria
  presentationGeneration++;
  try { presentationLayer().style.display = 'none'; } catch (_) { /* ignore */ }
  close();
  closeGraveyard();
  closeColorDialog();
    try { reactionDialog()?.classList.add('hidden'); } catch (_) { /* ignore */ }
  try { choiceDialog()?.classList.add('hidden'); } catch (_) { /* ignore */ }
  applyMedallionPlaceholders();
  // Svuota la griglia e la mano IA così non resta la partita vecchia a video
  const board = $('shared-board');
  if (board) board.innerHTML = '';
  const oppHand = $('opponent-hand');
  if (oppHand) oppHand.replaceChildren();
  const offer = $('offer-slot');
  if (offer) offer.innerHTML = '';
  // Reset HUD vita/mazzo (verranno aggiornati alla prossima partita)
  for (const id of ['opponent-life', 'player-life', 'opponent-deck-count', 'player-deck-count', 'opponent-graveyard-count', 'player-graveyard-count']) {
    const n = $(id);
    if (n) n.textContent = '–';
  }
}

/** Popup perdente: messaggio secco + «Accetto il giudizio» → login. */
function showLoserJudgment() {
  return new Promise(resolve => {
    let el = $('loser-judgment-dialog');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loser-judgment-dialog';
      el.className = 'card-detail-overlay';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', 'loser-judgment-title');
      el.style.zIndex = '200';
      el.innerHTML =
        '<div class="panel" style="width:min(92vw,420px);text-align:center;border-color:#c6a774;box-shadow:0 12px 48px #000;padding:1.5rem">' +
        '<h2 id="loser-judgment-title" style="margin:0 0 .75rem">Sei il perdente.</h2>' +
        '<p class="muted" style="margin:0 0 1.25rem">La partita è finita.</p>' +
        '<button type="button" class="primary-button" id="loser-judgment-accept">Accetto il giudizio</button>' +
        '</div>';
      document.body.append(el);
    }
    el.classList.remove('hidden');
    const btn = $('loser-judgment-accept');
    const done = () => {
      el.classList.add('hidden');
      if (btn) btn.onclick = null;
      resolve();
    };
    if (btn) btn.onclick = done;
  });
}

/** Camera di Vittoria V — placeholder; bottone → login. */
function showVictoryChamber() {
  return new Promise(resolve => {
    let el = $('victory-chamber-dialog');
    if (!el) {
      el = document.createElement('div');
      el.id = 'victory-chamber-dialog';
      el.className = 'card-detail-overlay';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', 'victory-chamber-title');
      el.style.zIndex = '200';
      el.innerHTML =
        '<div class="panel" style="width:min(92vw,480px);text-align:center;border-color:#c6a774;box-shadow:0 12px 48px #000;padding:1.75rem">' +
        '<p class="eyebrow" style="margin:0 0 .5rem;letter-spacing:.12em">PENOMBRA</p>' +
        '<h2 id="victory-chamber-title" style="margin:0 0 .75rem">Camera di Vittoria V</h2>' +
        '<p class="muted" style="margin:0 0 1.25rem">Placeholder. Qui arriveranno premi e contenuto.</p>' +
        '<button type="button" class="primary-button" id="victory-chamber-leave">Torna al login</button>' +
        '</div>';
      document.body.append(el);
    }
    el.classList.remove('hidden');
    const btn = $('victory-chamber-leave');
    const done = () => {
      el.classList.add('hidden');
      if (btn) btn.onclick = null;
      resolve();
    };
    if (btn) btn.onclick = done;
  });
}

/** Gestisce fine partita (vittoria, sconfitta o doppia sconfitta). */
async function handleMatchFinished() {
  if (!state || state.status !== 'finished') return;
  // PvE: umano = indice 1. Vincitore solo se winner_index === 1; altrimenti perdente (anche se entrambi ≤ 0).
  const won = state.winner_index === 1;

  try { dismissNotice(); } catch (_) { /* ignore */ }

  clearMatchUI();
  try { lsRemove('penombra:last-match'); } catch (_) { /* ignore */ }
  matchId = null;
  state = null;
  priorMatch = null;
  flow = null;
  busy = false;

  try { hideHome(); } catch (_) { /* ignore */ }
  try {
    document.getElementById('game-screen')?.classList.add('hidden');
  } catch (_) { /* ignore */ }

  if (won) {
    await showVictoryChamber();
  } else {
    await showLoserJudgment();
  }
  showAuthScreen({ forceLoginForm: false });
}
async function renderReaction() {
  const el = reactionDialog(), r = reaction();
  // Mai il popup piccolo: nascondi sempre la reaction-dialog compatta
  if (el) el.classList.add('hidden');

  if (!r || busy || obligatory() || flow?.kind === 'trap-target') {
    // Chiudi dettaglio trappola se la finestra non c’è più
    if (!r && view?.kind === 'trap-pick') close();
    if (!r) { trapPickWindowId = null; trapPickIdx = 0; }
    return;
  }

  // Nuova finestra reattiva → riparti dalla prima trappola
  if (trapPickWindowId !== r.window_id) {
    trapPickWindowId = r.window_id;
    trapPickIdx = 0;
  }

  await showTrapPickLarge(r);
}

/** Finestra trappola in stile dettaglio grande (Annulla/Passa + Conferma Trappola). */
async function showTrapPickLarge(r) {
  const ids = (r.eligible_instance_ids ?? []).filter(id => me()?.hand?.some(x => x.instance_id === id));
  const bar = $('detail-actions');
  const img = $('detail-image');
  if (!bar || !img) return;

  overlay();
  bar.replaceChildren();
  const add = (text, fn, disabled = false) => bar.append(button(text, fn, disabled));

  if (!ids.length) {
    // Nessuna trappola giocabile: solo passa
    view = { kind: 'trap-pick' };
    img.innerHTML = `<div class="trap-pass-only" style="padding:1.5rem;text-align:center">
      <h2 style="margin:0 0 .5rem;color:#f0d28f">Finestra Trappola</h2>
      <p style="margin:0 0 1rem;line-height:1.4">${escape(reactionDescription(r.event) || 'L’avversario ha dichiarato un’azione.')}</p>
      <p class="muted" style="margin:0">Nessuna trappola giocabile in mano.</p>
    </div>`;
    add('Passa', () => chooseTrap({ windowId: r.window_id, action: 'pass' }));
    $('card-detail-overlay')?.classList.remove('hidden');
    document.body.classList.add('detail-open');
  ensurePeekOnBar($('detail-actions'), $('card-detail-overlay'));
    return;
  }

  if (trapPickIdx >= ids.length) trapPickIdx = 0;
  const instId = ids[trapPickIdx];
  const inst = me()?.hand?.find(x => x.instance_id === instId);
  if (!inst) return;
  const d = await card(inst.card_id);
  view = { kind: 'trap-pick', instanceId: inst.instance_id, id: d.id };
  updateCardPreview(d, null);
  img.innerHTML = cardHTML(d, false);

  if (ids.length > 1) {
    add('← Altra', () => {
      trapPickIdx = (trapPickIdx - 1 + ids.length) % ids.length;
      showTrapPickLarge(r).catch(fail);
    });
    add(`Trappola ${trapPickIdx + 1}/${ids.length}`, () => {}, true);
    add('Altra →', () => {
      trapPickIdx = (trapPickIdx + 1) % ids.length;
      showTrapPickLarge(r).catch(fail);
    });
  }

  add('Annulla', () => chooseTrap({ windowId: r.window_id, action: 'pass' }));
  add('Conferma Trappola', () => beginTrap(inst, d));

  $('card-detail-overlay')?.classList.remove('hidden');
  document.body.classList.add('detail-open');
  ensurePeekOnBar($('detail-actions'), $('card-detail-overlay'));
}
async function chooseTrap(choice) {
  const r = reaction();
  if (!r || r.window_id !== choice.windowId) return notice('Finestra scaduta: aggiorna la partita.','error');
  return request('trap/choice',choice,choice.action === 'pass' ? 'Hai passato la priorità.' : 'Trappola risolta.');
}
async function beginTrap(inst,d) {
  const r = reaction();
  if (!r || !r.eligible_instance_ids.includes(inst.instance_id) || busy) return;
  if (targetEffect(d)) {
    flow = {kind:'trap-target',windowId:r.window_id,instanceId:inst.instance_id,id:d.id};
    reactionDialog().classList.add('hidden');
    close(); // chiudi dettaglio grande mentre si sceglie il bersaglio
    await render();
    notice(
      r.event?.kind === 'monster_etb'
        ? 'Scegli la creatura che ha generato l’effetto all’entrata.'
        : `Scegli il bersaglio di ${d.name}${playerTargetEffect(d) ? ' (tocca i PV dell’IA per colpire il giocatore)' : ''}.`,
      'success',
    );
    return;
  }
  await chooseTrap({windowId:r.window_id,action:'play',cardInstanceId:inst.instance_id});
}
function graveyardDialog() {
  let el = $('graveyard-dialog');
  if (el) return el;
  el = document.createElement('div'); el.id = 'graveyard-dialog'; el.className = 'card-detail-overlay hidden';
  el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-labelledby','graveyard-title'); el.style.zIndex = '120';
  const panel = document.createElement('div'); panel.className = 'panel'; panel.style.cssText = 'width:min(94vw,720px);max-height:88dvh;overflow:auto;border-color:#c6a774;text-align:center;box-shadow:0 12px 48px #000';
  const title = document.createElement('h2'); title.id = 'graveyard-title';
  const list = document.createElement('div'); list.id = 'graveyard-cards'; list.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:.55rem;margin:.7rem 0;max-height:60dvh;overflow:auto';
  const actions = document.createElement('div'); actions.style.cssText = 'display:flex;justify-content:center'; actions.append(button('Chiudi',closeGraveyard));
  panel.append(title,list,actions); el.append(panel);
  el.addEventListener('click',e => { if (e.target === el) closeGraveyard(); });
  stageRoot().append(el); return el;
}
function closeGraveyard() { $('graveyard-dialog')?.classList.add('hidden'); }
async function openGraveyard(owner) {
  if ((owner !== 0 && owner !== 1) || !state || busy || obligatory()) return;
  const el = graveyardDialog(), title = $('graveyard-title'), list = $('graveyard-cards');
  const cards = state.players?.[owner]?.graveyard ?? [];
  title.textContent = `${owner === 1 ? 'Il tuo cimitero' : 'Cimitero dell’IA'} · ${cards.length}`;
  list.replaceChildren();
  if (!cards.length) { const empty = document.createElement('p'); empty.textContent = 'Cimitero vuoto.'; list.append(empty); }
  else for (const inst of cards) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hand-card grave-card';
    try {
      const d = await card(inst.card_id); b.innerHTML = handCardHTML(d);
      b.setAttribute('aria-label',`Apri ${d.name} nel cimitero`);
      b.onclick = () => { closeGraveyard(); inspect('grave',inst.card_id).catch(fail); };
    } catch (error) { b.textContent = 'Carta non caricabile'; b.disabled = true; console.warn(error); }
    list.append(b);
  }
  el.classList.remove('hidden');
}
function wireGraveyards() {
  for (const [id,owner] of [['opponent-graveyard-count',0],['player-graveyard-count',1]]) {
    const box = $(id)?.closest('.hud-value.grave');
    if (!box || box.dataset.graveyardReady) continue;
    box.dataset.graveyardReady = 'true'; box.setAttribute('role','button'); box.setAttribute('tabindex','0');
    box.setAttribute('aria-label',`Apri ${owner === 1 ? 'il tuo cimitero' : 'il cimitero dell’IA'}`);
    box.style.cursor = 'pointer'; box.addEventListener('click',() => openGraveyard(owner).catch(fail));
    box.addEventListener('keydown',e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGraveyard(owner).catch(fail); } });
  }
  const life = $('opponent-life')?.closest('.hud-value');
  if (life && !life.dataset.playerTargetReady) { life.dataset.playerTargetReady = 'true'; life.addEventListener('click',() => playerClick().catch(fail)); }
}
function updateCardPreview(d, cell = null) {
  const empty = $('card-preview-empty');
  const slot = $('card-preview-card');
  if (!empty || !slot) return;
  if (!d) {
    empty.classList.remove('hidden');
    slot.classList.add('hidden');
    slot.innerHTML = '';
    slot.setAttribute('aria-hidden', 'true');
    return;
  }
  const f = faction(d);
  const isMostrissimo = d.card_type === 'mostrissimo';
  const costNum = isMostrissimo ? Number(d.sacrifice_cost ?? 0) : Number(d.mana_cost ?? 0);
  const costIcon = isMostrissimo ? '✦' : '';
  const atk = cell?.attack ?? d.attack ?? 0;
  const hp = cell?.hp ?? d.hp ?? 0;
  const subtype = d.subtype ? String(d.subtype) : '';
  const factionLabel = deckFactionNames[f.toUpperCase()] || f.toUpperCase();
  const typeLabel = types[d.card_type] ?? d.card_type;
  const rules = escape(String(d.effect_text || 'Nessun effetto.').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim());
  const art = d.image_url
    ? `<img src="${escape(d.image_url)}" alt="">`
    : 'Illustrazione provvisoria';
  const showStats = creature(d) || (cell?.kind === 'terraforma' && cell?.hp !== undefined);
  slot.className = `card-preview-card faction-${f}`;
  slot.innerHTML = `
    <div class="cp-nameband">${escape(d.name)}</div>
    <div class="cp-art">${art}</div>
    <div class="cp-type">${escape(typeLabel)}${subtype ? ' · ' + escape(subtype) : ''} · ${escape(factionLabel)}</div>
    <div class="cp-rules">${rules}</div>
    <div class="cp-cost">${costIcon}${costNum}</div>
    ${showStats ? `<div class="cp-atk">${atk}</div><div class="cp-hp">${hp}</div>` : ''}`;
  empty.classList.add('hidden');
  slot.classList.remove('hidden');
  slot.setAttribute('aria-hidden', 'false');
}
async function inspect(kind,id,extra={}) {
  if (busy || noticeOpen || obligatory() || (reaction() && kind !== 'grave' && kind !== 'trap-pick')) return;
  view = {kind,id,...extra};
  const current = view, d = await card(id);
  if (current !== view) return;
  updateCardPreview(d, current.cell ?? null);
  overlay(); $('detail-image').innerHTML = cardHTML(d,false,current.cell ?? null);
  const bar = $('detail-actions'); bar.replaceChildren();
  const add = (text,fn,disabled=false) => bar.append(button(text,fn,disabled));
  if (kind === 'hand' && active()) add(d.card_type === 'monster' ? 'Evoca' : d.card_type === 'terraforma' ? 'Colloca' : 'Gioca',() => beginCard(current.instanceId,d),!playable(d));
  if (kind === 'mostrissimo' && active() && state.last_mostrissimo_turn?.[1] !== state.current_turn) {
    const cost = Number(d.sacrifice_cost), own = board().flat().filter(c => isCreatureCell(c) && isMine(c.owner_index)).length;
    const legal = Number.isInteger(cost) && cost >= 0 && cost <= 6 && permanents().length >= cost && (board()[2].some(c => !c) || (cost > 0 && own > 0));
    add(`Evoca · ${cost} sacrifici`,() => request('mostrissimo/start',{cardId:id},'Evocazione iniziata: non puoi annullare.'),!legal);
  }
  if (kind === 'unit' && active() && isCreatureCell(current.cell) && isMine(current.cell.owner_index) && !current.cell.tired) {
    const targets = attackable(current.position);
    const canDirect = targets.length === 0;
    const foeName = opponentDisplayName();
    add(canDirect ? `Attacca ${foeName}` : 'Attacca', async () => {
      // Nessun permanente adiacente → attacco diretto al giocatore
      if (canDirect) {
        return request('attack', {
          attackerPosition: current.position,
          target: { type: 'player', playerIndex: foePlayerIndex() },
        }, 'Attacco dichiarato.');
      }
      // Un solo bersaglio valido (creatura o Terraforma) → conferma automatica, un click in meno
      if (targets.length === 1) {
        const pos = targets[0];
        const cell = at(pos);
        let def = null;
        try { def = cell ? await card(cell.card_id) : null; } catch (_) { /* ignore */ }
        const ok = await confirmTargetChoice(
          cell,
          def,
          def?.name ? `${def.name}` : '',
          'Sei sicuro di voler attaccare questa carta?',
        );
        if (!ok) return;
        close();
        return request('attack', {
          attackerPosition: current.position,
          target: { type: 'creature', position: pos },
        }, 'Attacco dichiarato.');
      }
      // Più bersagli → scelta sulla griglia
      flow = { kind: 'attack', from: current.position };
      close();
      render().catch(fail);
      showTargetReminder('Seleziona un nemico evidenziato (bordo bianco) per attaccare.');
    });
    const cost = await moveCost(current.cell);
    if (current !== view) return;
    add(`Muovi · ${cost} mana`,() => { flow = {kind:'move',from:current.position}; close(); render().catch(fail); notice('Tocca una cella libera adiacente.','success'); },Number(me()?.current_mana ?? 0) < cost || !steps(current.position).length);
  }
  if (kind === 'unit' && isCreatureCell(current.cell) && current.cell.auras?.length) {
    for (const aura of current.cell.auras) {
      const a = await card(aura.card_id);
      if (current !== view) return;
      add(`Aura ${a.name}${isMine(aura.owner_index) ? ' · tua' : ' · IA'}`,() => { close(); return inspect('aura',aura.card_id,{instanceId:aura.instance_id}); });
    }
  }
  if (kind === 'tribute' && pending() && pending().stage === 'paying' && pending().paid.length < pending().required) {
    // Avviso se sacrifichi un mostro con una tua aura addosso
    const cell = current.cell || findCellByInstanceId(current.instanceId);
    const ownAuras = (cell?.auras || []).filter(a => isMine(a.owner_index));
    if (isCreatureCell(cell) && ownAuras.length > 0) {
      add('Conferma sacrificio', async () => {
        const ok = window.confirm('Attenzione: stai sacrificando un mostro che ha una tua aura addosso. Sei sicuro di voler sacrificare il mostro e non l’aura?');
        if (!ok) return;
        return request('mostrissimo/sacrifice',{instanceId:current.instanceId},'Sacrificio dichiarato.');
      });
    } else {
      add('Conferma sacrificio',() => request('mostrissimo/sacrifice',{instanceId:current.instanceId},'Sacrificio dichiarato.'));
    }
  }
  add('Chiudi',close);
  $('card-detail-overlay').classList.remove('hidden'); document.body.classList.add('detail-open');
  ensurePeekOnBar($('detail-actions'), $('card-detail-overlay'));
}


/** Opzioni sacrificio: permanenti tuoi con riferimento cella (per aure). */
function tributeOptions() {
  return permanents().map(item => ({
    ...item,
    cell: findCellByInstanceId(item.id),
  }));
}


/** Conferma ingresso su cella scelta (stile dialog unificato). */
let mostEntryConfirmOpen = false;
async function showMostrissimoEntryConfirm(pos) {
  if (mostEntryConfirmOpen || busy || !pos) return;
  mostEntryConfirmOpen = true;
  try {
    const label = `[${pos.row}, ${pos.col}]`;
    const ok = await showGameConfirmDialog({
      title: 'Conferma ingresso',
      bodyHtml: `Evocare il Mostrissimo sulla cella <strong>${label}</strong>?`,
      buttons: [
        { label: 'Cambia cella', value: false },
        { label: 'Conferma', primary: true, value: true },
      ],
    });
    if (ok) {
      await confirmMostrissimoEntry(pos);
    } else {
      mostEntryPick = null;
      await render();
    }
  } finally {
    mostEntryConfirmOpen = false;
  }
}

/** Completa l’evocazione Mostrissimo sulla cella (dopo conferma utente). */
async function confirmMostrissimoEntry(pos) {
  const p = pending();
  if (!p || p.stage !== 'paying' || p.paid.length < p.required) return;
  if (!summonCells(p).some(x => eq(x, pos))) {
    return notice('Cella non valida.', 'error');
  }
  const d = await card(p.card_id);
  const etbAimed = effects(d).filter(e =>
    !e?.trigger && (e?.target === 'any_creature' || e?.target === 'any_target' || e?.type === 'return_hand')
  );
  const onlyBuffHeal = etbAimed.length > 0 && etbAimed.every(e => e.type === 'buff' || e.type === 'heal');
  mostEntryPick = null;
  if (etbAimed.length && !onlyBuffHeal) {
    flow = { kind: 'mostrissimo-target', position: pos, id: d.id };
    await render();
    showTargetReminder(targetReminderText(d));
    return;
  }
  return request('mostrissimo/complete', { position: pos }, 'Mostrissimo dichiarato.');
}


/** Scelta sacrificio: mostro vs aura (dialog unificato). */
function showSacrificeOptions(options, titleText) {
  const buttons = options.map(opt => ({
    label: opt.label,
    primary: true,
    value: opt.instanceId,
  }));
  buttons.push({ label: 'Annulla', value: null });
  return showGameConfirmDialog({
    title: titleText || 'Cosa vuoi sacrificare?',
    bodyHtml: 'Scegli il permanente da mandare al cimitero (non si può annullare dopo la conferma).',
    buttons,
  });
}

/** Click su una cella durante i sacrifici Mostrissimo. */
async function pickTributeFromCell(cell) {
  const p = pending();
  if (!p || p.stage !== 'paying' || p.paid.length >= p.required) return;
  if (!cell) return notice('Tocca un tuo permanente sul campo.', 'error');
  if (busy || noticeOpen || reaction() || obligatory()) return;

  const myAuras = (cell.auras || []).filter(a => isMine(a.owner_index));
  const mine = isMine(cell.owner_index);

  // Solo aure mie su permanente avversario
  if (!mine) {
    if (!myAuras.length) return notice('Puoi sacrificare solo i tuoi permanenti.', 'error');
    if (myAuras.length === 1) {
      const ad = await card(myAuras[0].card_id);
      const ok = await confirmTargetChoice(
        { ...cell, owner_index: myPlayerIndex, attack: undefined, hp: undefined, kind: 'aura' },
        ad,
        `Sacrificare l’aura ${ad.name}?`,
        'Conferma sacrificio',
      );
      if (!ok) return;
      return request('mostrissimo/sacrifice', { instanceId: myAuras[0].instance_id }, 'Sacrificio dichiarato.');
    }
    const opts = [];
    for (const a of myAuras) {
      const ad = await card(a.card_id);
      opts.push({ instanceId: a.instance_id, label: `Aura: ${ad.name}` });
    }
    const chosen = await showSacrificeOptions(opts, 'Quale aura sacrificare?');
    if (!chosen) return;
    return request('mostrissimo/sacrifice', { instanceId: chosen }, 'Sacrificio dichiarato.');
  }

  // Permanente tuo: creatura con aure → scegli cosa
  if (isCreatureCell(cell) && myAuras.length > 0) {
    const md = await card(cell.card_id);
    const opts = [{ instanceId: cell.instance_id, label: `Mostro: ${md.name}` }];
    for (const a of myAuras) {
      const ad = await card(a.card_id);
      opts.push({ instanceId: a.instance_id, label: `Aura: ${ad.name}` });
    }
    const chosen = await showSacrificeOptions(opts, 'Mostro o aura?');
    if (!chosen) return;
    return request('mostrissimo/sacrifice', { instanceId: chosen }, 'Sacrificio dichiarato.');
  }

  // Creatura senza aura / terraforma
  const d = await card(cell.card_id);
  const ok = await confirmTargetChoice(cell, d, `Sacrificare ${d.name}?`, 'Conferma sacrificio');
  if (!ok) return;
  return request('mostrissimo/sacrifice', { instanceId: cell.instance_id }, 'Sacrificio dichiarato.');
}



/** Banner istruzioni Mostrissimo (centro stage, leggibile). */
function ensureMostInstructionBanner() {
  let el = $('mostrissimo-instruction-banner');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'mostrissimo-instruction-banner';
  el.className = 'mostrissimo-instruction-banner hidden';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  const stage = $('stage') || document.body;
  stage.append(el);
  return el;
}
function updateMostInstructionBanner(_p) {
  // Non usare più il banner in alto: copriva le stats avversario. Solo popup «Ho capito».
  const el = ensureMostInstructionBanner();
  if (el) {
    el.classList.add('hidden');
    el.innerHTML = '';
  }
}

/** Popup una tantum istruzioni sacrificio (rispetta Auto Ho capito). */
async function showSacrificeHintDialog(required, paid) {
  const left = required - paid;
  await showHoCapitoDialog({
    title: 'Sacrifici',
    bodyHtml: `Ora dovrai sacrificare <strong>${left}</strong> permanent${left === 1 ? 'e' : 'i'} tra quelli evidenziati sulla plancia.`
      + `<br><span class="muted">${paid}/${required} sacrificati finora.</span>`,
  });
  mostSacrificeHintDismissed = true;
  mostSacrificeHintShowing = false;
  hideMostrissimoFlowOverlay();
  await render().catch(fail);
}


function hideMostrissimoFlowOverlay() {
  const el = $('mostrissimo-flow-overlay');
  if (el) el.classList.add('hidden');
}

/** Overlay a colonna centrale: sacrifici (lista) o ingresso (conferma cella). */
function ensureMostrissimoFlowOverlay() {
  let el = $('mostrissimo-flow-overlay');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'mostrissimo-flow-overlay';
  el.className = 'mostrissimo-flow-overlay hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'mostrissimo-flow-title');
  const stage = $('stage') || document.body;
  stage.append(el);
  return el;
}

function findCellByInstanceId(instanceId) {
  if (!instanceId) return null;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const cell = at({ row, col });
    if (cell?.instance_id === instanceId) return cell;
  }
  return null;
}
async function beginCard(instanceId,d) {
  if (!playable(d)) return;
  close(); flow = {kind:'hand',instanceId,id:d.id,step:(d.card_type === 'monster' || d.card_type === 'terraforma') ? 'cell' : (d.card_type === 'aura' || targetEffect(d)) ? 'target' : 'immediate'};
  if (flow.step === 'immediate') return request('play-card',{cardInstanceId:instanceId,options:{}},'Carta dichiarata.');
  await render(); notice(flow.step === 'cell' ? 'Scegli una cella libera della tua riga.' : 'Scegli una creatura bersaglio.','success');
}
function playable(d) {
  if (!active() || d.card_type === 'mostrissimo' || d.card_type === 'instant' || effectiveManaCost(d) > me().current_mana) return false;
  if ((d.card_type === 'monster' || d.card_type === 'terraforma') && !board()[2].some(c => !c)) return false;
  if (d.card_type === 'aura' && !targets(d).length) return false;
  if (!creature(d) && d.card_type !== 'aura' && targetEffect(d) && !hasTargets(d)) return false;
  return true;
}
/** Troppo cara rispetto al mana massimo del turno (bende mummia). Vale anche per trappole/instant. */
function tooExpensive(d) {
  if (!d || d.card_type === 'mostrissimo') return false;
  return effectiveManaCost(d) > Number(me()?.max_mana ?? 0);
}
async function drawBoard() {
  const root = $('shared-board'); if (!root) return;
  root.replaceChildren();
  const p = pending(), legal = p?.stage === 'paying' && p.paid.length === p.required ? summonCells(p) : [];
  const d = flow?.id ? cache.get(flow.id) : null;
  // viewRow 0 = alto (avversario), 1 = centro, 2 = basso (tu) — sempre, anche in PvP
  for (let viewRow = 0; viewRow < 3; viewRow++) {
    const row = toEngineRow(viewRow);
    const line = document.createElement('div'); line.className = `board-row ${['ai-row','center-row','human-row'][viewRow]}`;
    for (let col = 0; col < 3; col++) {
      const pos = {row,col}, c = at(pos), b = document.createElement('button');
      b.type = 'button'; b.className = 'board-cell';
      if (viewRow === 1 && col === 1) b.classList.add('center-cell');
      let definition = null;
      if (c) try { definition = await card(c.card_id); } catch(e) { console.warn(e); }
      b.classList.add(c ? (isMine(c.owner_index) ? 'human-card' : 'ai-card') : 'empty');
      if (c?.kind === 'terraforma') b.classList.add('terraforma-cell');
      if (isCreatureCell(c) && c.tired) b.classList.add('tired');
      // Sacrifici Mostrissimo: evidenzia i tuoi permanenti (e celle con tue aure)
      if (pending()?.stage === 'paying' && pending().paid.length < pending().required && c) {
        const myAura = (c.auras || []).some(a => isMine(a.owner_index));
        if (isMine(c.owner_index) || myAura) b.classList.add('can-sacrifice');
      }
      // Tue creature non stanche: evidenzia che possono muovere/attaccare (solo fuori da una scelta attiva)
      if (
        active() && !flow && !reaction() && !obligatory() && !pending()
        && isCreatureCell(c) && isMine(c.owner_index) && !c.tired
      ) {
        b.classList.add('can-act');
      }
      if (flow?.kind === 'move' && steps(flow.from).some(x => eq(x,pos))) b.classList.add('valid-move');
      if (flow?.kind === 'attack' && attackable(flow.from).some(x => eq(x,pos))) b.classList.add('valid-target');
      if (flow?.kind === 'hand' && flow.step === 'cell' && row === myHomeRow() && !c) b.classList.add('valid-summon');
      if (flow?.kind === 'hand' && flow.step === 'target' && flow.position && eq(flow.position, pos) && !c) b.classList.add('valid-target');
      if (flow?.kind === 'mostrissimo-target' && flow.position && eq(flow.position, pos) && !c) b.classList.add('valid-target');
      if (flow?.kind === 'etb-target' && c && (flow.eligible ?? []).includes(c.instance_id)) b.classList.add('valid-target');
      if (['hand','mostrissimo-target','trap-target'].includes(flow?.kind) && (flow?.step === 'target' || flow?.kind !== 'hand') && d && targetAllowed(d,c,flow?.kind === 'trap-target' ? reaction()?.event : null)) b.classList.add('valid-target');
      if (legal.some(x => eq(x,pos))) b.classList.add('valid-summon');
      if (mostEntryPick && eq(mostEntryPick, pos)) b.classList.add('most-entry-pick');
      const whoLabel = c ? (isMine(c.owner_index) ? 'Tu' : 'IA') : '';
      b.setAttribute('aria-label',c ? `${definition?.name ?? 'Permanente'} ${whoLabel}${isCreatureCell(c) ? ` ATK ${c.attack} HP ${c.hp}` : `, Terraforma${c.hp !== undefined ? `, PV ${c.hp}` : ' non attaccabile'}`}${isCreatureCell(c) && c.auras?.length ? `, ${c.auras.length} Aura` : ''}` : `Cella [${row},${col}]`);
      const altar = (row === 1 && col === 1)
        ? `<svg class="altar-svg" aria-hidden="true" width="68" height="96" viewBox="0 0 68 100"><path d="M10 20Q22 8 34 16Q46 8 58 20" fill="none" stroke="#c9a043" stroke-width="2" stroke-linecap="round"/><circle cx="34" cy="14" r="6.5" fill="#e8c565"/><path d="M21 36Q34 26 47 36Q34 46 21 36Z" fill="#0b0806" stroke="#e8c565" stroke-width="1.6"/><circle cx="34" cy="36" r="3.4" fill="#2fe0c4"/><path d="M28 43Q27 49 22 51M34 45V51" fill="none" stroke="#e8c565" stroke-width="1.6" stroke-linecap="round"/><g class="flame"><path d="M34 52Q26 60 30 68Q32 64 33 62Q34 66 37 69Q43 61 34 52Z" fill="#2fe0c4"/><path d="M34 60Q31 64 33 68Q35 66 34 60Z" fill="#e8f9f5"/></g><path d="M24 70h20l-2 6H26Z" fill="#3a2e22" stroke="#c9a043" stroke-width="1.5"/><rect x="18" y="76" width="32" height="8" fill="#3a2e22" stroke="#c9a043" stroke-width="1.5"/><rect x="12" y="84" width="44" height="9" fill="#2a2016" stroke="#c9a043" stroke-width="1.5"/></svg>`
        : '';
      b.innerHTML = altar + (c && definition ? cellHTML(definition,c) + (isCreatureCell(c) && c.auras?.length ? `<span class="cell-aura-count" title="Aure assegnate">✧ ${c.auras.length}</span>` : '') + `<span class="cell-coordinate">[${row},${col}]</span>` : '');
      // Durante etb-target le celle eleggibili restano cliccabili anche se obligatory.
      const etbPick = flow?.kind === 'etb-target' && c && (flow.eligible ?? []).includes(c.instance_id);
      const mostPayCell = pending()?.stage === 'paying';
      b.disabled = (busy && !mostPayCell) || (obligatory() && !etbPick && !mostPayCell);
      b.onclick = () => boardClick(pos).catch(fail); line.append(b);
    }
    root.append(line);
  }
}
async function drawHand() {
  const root = $('player-hand'); if (!root) return;
  root.replaceChildren();
  const hand = me()?.hand ?? [], g = handGeometry(hand.length);
  root.style.setProperty('--hw',String(g.w)); root.style.setProperty('--hh',String(g.h)); root.style.setProperty('--hs',g.step.toFixed(2));
  root.style.setProperty('--hr',g.rot.toFixed(2)); root.style.setProperty('--hk',g.k.toFixed(3)); root.style.setProperty('--hd',g.drop.toFixed(2));
  let index = 0;
  for (const inst of hand) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hand-card';
    b.style.setProperty('--t',(index - (hand.length - 1) / 2).toFixed(3)); b.style.setProperty('--i',String(index + 1)); index++;
    try {
      const d = await card(inst.card_id); b.innerHTML = handCardHTML(d);
      b.disabled = !state || busy || !!reaction() || obligatory();
      // Stati visivi: playable = alzata + cornice lampeggiante; too-expensive = sole bende.
      if (playable(d)) b.classList.add('playable');
      else if (tooExpensive(d)) b.classList.add('too-expensive');
      b.setAttribute('aria-label',`Apri ${d.name}${playable(d) ? ', giocabile' : tooExpensive(d) ? ', troppo costosa' : ''}`);
      b.onclick = () => inspect('hand',inst.card_id,{instanceId:inst.instance_id});
    } catch(e) { b.textContent = 'Carta non caricabile'; b.disabled = true; console.warn(e); }
    root.append(b);
  }
}
async function drawMostrissimi() {
  let panel = $('mostrissimo-panel');
  if (!panel) {
    panel = document.createElement('section'); panel.id = 'mostrissimo-panel'; panel.className = 'panel'; panel.setAttribute('aria-label','Offerta Mostrissimi');
    const slot = $('offer-slot'), before = document.querySelector('.logs-panel');
    if (slot) slot.append(panel); else if (before?.parentNode) before.parentNode.insertBefore(panel,before); else document.body.append(panel);
  }
  panel.replaceChildren();
  if (!state) { panel.classList.add('hidden'); updateMostInstructionBanner(null); return; }
  panel.classList.remove('hidden');

  const p = pending();
  // Durante i sacrifici: sostituisci l'offerta con un pannello chiaro di progresso
  updateMostInstructionBanner(null); // mai banner in alto (copriva le stats)

  if (p && p.stage === 'paying') {
    const paused = !!(reaction() || obligatory());

    // Fase 1 — sacrifici: popup «Ho capito» una volta, poi offerta visibile
    if (p.paid.length < p.required) {
      mostEntryHintDismissed = false;
      mostEntryPick = null;
      if (!paused && !mostSacrificeHintDismissed && !mostSacrificeHintShowing) {
        mostSacrificeHintShowing = true;
        showSacrificeHintDialog(p.required, p.paid.length).catch(fail);
      } else if (mostSacrificeHintDismissed) {
        hideMostrissimoFlowOverlay();
      }
      // non return: sotto si ridisegna la striscia Offerta (senza il Mostrissimo in evocazione)
    } else {
      // Fase 2 — ingresso
      const cells = summonCells(p);
      if (!cells.length) {
        hideMostrissimoFlowOverlay();
      } else if (!mostEntryHintDismissed && !window.__mostEntryHintShowing) {
        window.__mostEntryHintShowing = true;
        hideMostrissimoFlowOverlay();
        showHoCapitoDialog({
          title: 'Ingresso',
          bodyHtml: 'Ora seleziona dove vuoi evocare la creatura.',
        }).then(async () => {
          mostEntryHintDismissed = true;
          window.__mostEntryHintShowing = false;
          if (cells.length === 1) {
            mostEntryPick = { row: cells[0].row, col: cells[0].col };
            await showMostrissimoEntryConfirm(mostEntryPick);
          } else {
            await render().catch(fail);
          }
        }).catch(fail);
      } else if (!mostEntryHintDismissed) {
        // dialog già in corso
      } else {
        hideMostrissimoFlowOverlay();
        if (mostEntryPick) showMostrissimoEntryConfirm(mostEntryPick).catch(fail);
      }
      // continua: mostra ancora gli altri Mostrissimi in offerta
    }
  } else {
    hideMostrissimoFlowOverlay();
    mostEntryPick = null;
    mostEntryHintDismissed = false;
    mostSacrificeHintDismissed = false;
    mostSacrificeHintShowing = false;
  }

  // Offerta (anche durante i sacrifici: si vedono gli altri Mostrissimi)
  const h = document.createElement('h2'); h.textContent = 'Offerta'; panel.append(h);
  const rules = document.createElement('p');
  rules.className = 'mostrissimo-rules';
  if (p && p.stage === 'paying' && p.paid.length < p.required) {
    rules.textContent = `Sacrifici ${p.paid.length}/${p.required} · tocca un permanente evidenziato.`;
  } else if (p && p.stage === 'paying') {
    rules.textContent = 'Scegli la cella di ingresso sulla plancia.';
  } else {
    rules.textContent = 'Max 1/turno · Mana 0 · Sacrifica permanenti (anche stanchi).';
  }
  panel.append(rules);
  if (!state) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  const strip = document.createElement('div'); strip.className = 'mostrissimo-offer'; panel.append(strip);
  const summoningId = (p && p.stage === 'paying') ? p.card_id : null;
  for (const inst of state.shared_mostrissimi ?? []) {
    // Durante l’evocazione non mostrare quello in corso: restano gli altri in offerta
    if (summoningId && inst.card_id === summoningId) continue;
    const isBlocked = inst.card_id === 'lab-mostrissimo-inaccessible';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mostrissimo-card';
    if (isBlocked) {
      b.classList.add('mostrissimo-inaccessible');
      b.innerHTML = '<article class="hand-card is-inaccessible" style="background:#0a0a0a;color:#666;border-color:#222;min-height:7.5rem;display:flex;align-items:center;justify-content:center;text-align:center;padding:.5rem"><strong style="letter-spacing:.06em;font-size:.85rem">INACCESSIBILE</strong></article>';
      b.disabled = true;
      b.setAttribute('aria-label', 'Slot Mostrissimo inaccessibile');
      strip.append(b);
      continue;
    }
    let d;
    try { d = await card(inst.card_id); } catch (e) {
      console.warn(e);
      b.classList.add('mostrissimo-inaccessible');
      b.innerHTML = '<article class="hand-card is-inaccessible" style="background:#0a0a0a;color:#666;border-color:#222;min-height:7.5rem;display:flex;align-items:center;justify-content:center"><strong>INACCESSIBILE</strong></article>';
      b.disabled = true;
      strip.append(b);
      continue;
    }
    b.innerHTML = handCardHTML(d);
    const cost = Number(d.sacrifice_cost ?? 0);
    const own = board().flat().filter(c => isCreatureCell(c) && isMine(c.owner_index)).length;
    const canPay = Number.isInteger(cost) && cost >= 0 && cost <= 6 && permanents().length >= cost;
    const spaceOk = board()[myHomeRow()].some(c => !c) || (cost > 0 && own > 0);
    const onceOk = state.last_mostrissimo_turn?.[myPlayerIndex] !== state.current_turn;
    const legal = active() && canPay && spaceOk && onceOk;
    if (legal) b.classList.add('playable');
    else if (!canPay) b.classList.add('too-expensive');
    b.setAttribute('aria-label',`Apri ${d.name}, ${cost} sacrifici${legal ? ', evocabile' : !canPay ? ', sacrifici insufficienti' : ''}`);
    b.disabled = busy || noticeOpen || !!reaction() || obligatory();
    b.onclick = () => { if (noticeOpen) return; inspect('mostrissimo',inst.card_id); };
    strip.append(b);
  }
  if (p) {
    const zone = document.createElement('div'); zone.className = 'tribute-zone is-info'; panel.append(zone);
    const info = document.createElement('p'); info.className = 'tribute-progress';
    info.textContent = p.stage === 'etb' ? 'Risoluzione degli effetti all’entrata…' : p.stage === 'before_entry' ? 'Evocazione dichiarata: attendi la reazione.' : `Sacrifici ${p.paid.length}/${p.required}.`;
    zone.append(info);
  }
}
function controls() {
  const disable = (id,v) => { if ($(id)) $(id).disabled = !!v; };
  disable('end-turn-button',!active());
  disable('cancel-selection-button',busy || obligatory() || !flow || (!!pending() && flow?.kind !== 'trap-target'));
  // Reminder bersaglio/attacco: non svuotare se siamo in modalità scelta
  const keepReminder = flow && ['etb-target', 'mostrissimo-target', 'trap-target', 'attack', 'hand'].includes(flow.kind)
    && (flow.kind !== 'hand' || flow.step === 'target');
  if (!keepReminder) hideTargetReminder();
}
function showDeckColors() {
  const human = state?.deck_colors?.[1], ai = state?.deck_colors?.[0];
  const fmt = (colors) => {
    if (!colors) return '';
    const codes = [colors.primary, colors.secondary, colors.tertiary].filter(Boolean);
    return codes.map(c => {
      const iris = (typeof FACTION_EYE !== 'undefined' && FACTION_EYE[c]) || '#e8c565';
      const name = deckFactionNames[c] || c;
      return `<span class="hud-color-chip" title="${name}" style="--chip:${iris}"><i></i>${c}</span>`;
    }).join('');
  };
  const pEl = $('player-deck-colors');
  const oEl = $('opponent-deck-colors');
  if (pEl) pEl.innerHTML = fmt(human);
  if (oEl) oEl.innerHTML = fmt(ai);
}
/** Evita render sovrapposti: se ne parte uno mentre un altro è in corso, ne schedula uno solo alla fine. */
let renderRunning = false;
let renderQueued = false;
async function render() {
  if (renderRunning) {
    renderQueued = true;
    return;
  }
  renderRunning = true;
  try {
    do {
      renderQueued = false;
      const set = (id,x) => { if ($(id)) $(id).textContent = String(x); };
      if (state) { hideStart(); hideHome(); }
      set('player-life',me()?.life ?? 20); set('player-current-mana',me()?.current_mana ?? 0); set('player-max-mana',me()?.max_mana ?? 0);
      set('player-hand-count',me()?.hand?.length ?? 0); set('player-deck-count',me()?.deck?.length ?? 0); set('player-graveyard-count',me()?.graveyard?.length ?? 0);
      set('opponent-life',them()?.life ?? 20); set('opponent-current-mana',them()?.current_mana ?? 0); set('opponent-max-mana',them()?.max_mana ?? 0);
      set('opponent-hand-count',them()?.hand?.length ?? 0); set('opponent-deck-count',them()?.deck?.length ?? 0); set('opponent-graveyard-count',them()?.graveyard?.length ?? 0);
      updateOpponentName();
      showDeckColors(); drawOpponentHand();
      updateStoryMedallionBanner();
      // Board / mano / offerta in parallelo = meno attesa tra un click e l’altro
      await Promise.all([drawBoard(), drawHand(), drawMostrissimi()]);
      controls();
      await Promise.all([renderReaction(), renderDeathChoice(), markPlayerTarget()]);
    } while (renderQueued);
  } finally {
    renderRunning = false;
  }
}

/** Lab Partita base: medaglioni HUD come placeholder (nessun potere Storia). */
function applyMedallionPlaceholders() {
  const msg = 'medaglione lasciato a casa per sbaglio';
  for (const id of ['player-medallion', 'opponent-medallion']) {
    const el = $(id);
    if (!el) continue;
    el.classList.remove('hidden');
    el.textContent = '◇';
    el.title = msg;
    el.setAttribute('aria-label', msg);
    el.onclick = (e) => {
      e.stopPropagation();
      notice(msg, 'success');
    };
  }
}

/** Medaglioni HUD: sempre placeholder lab. */
function updateStoryMedallionBanner() {
  applyMedallionPlaceholders();
}

/** Nome avversario in Partita base. */
function opponentDisplayName() {
  return 'nomeavversario';
}

/** Aggiorna HUD nome avversario (nomeavversario in Partita base). */
function updateOpponentName() {
  const el = $('opponent-name');
  if (!el) return;
  el.textContent = opponentDisplayName();
}

async function logs() {
  if (!$('match-logs') || !matchId) return;
  let entries = [];
  try {
    const res = await api(`/match/${encodeURIComponent(matchId)}/logs?limit=1000`);
    entries = res?.logs ?? [];
  } catch (e) {
    // Lab senza match_logs: non chiamare fail(), la partita deve continuare
    console.warn('Log partita non disponibili', e);
    return;
  }
  $('match-logs').replaceChildren();
  const texts = [];
  for (const e of entries ?? []) {
    const li = document.createElement('li'), text = e.log_data?.description ?? e.log_data?.action_type ?? 'Evento';
    li.textContent = text; texts.push(text);
    $('match-logs').append(li);
  }
  const latest = $('log-latest');
  if (latest) { latest.replaceChildren(); for (const text of texts.slice(-3)) { const li = document.createElement('li'); li.textContent = text; latest.append(li); } }
}
/** Mostra gli annunci pubblici già presenti nello stato (senza /advance). */
async function presentPendingAnnouncements() {
  if (!state?.public_announcement) return;
  const a = state.public_announcement;
  const list = Array.isArray(state.public_announcements) && state.public_announcements.length > 1
    ? state.public_announcements
    : [a];
  const generation = presentationGeneration;
  for (let i = 0; i < list.length; i++) {
    await presentPublic(list[i], generation);
    if (generation !== presentationGeneration) return;
    if (i < list.length - 1) await waitPresentation(180);
  }
}

async function request(path, body, message) {
  if (busy || !matchId) return;
  close(); busy = true; controls(); reactionDialog().classList.add('hidden'); choiceDialog().classList.add('hidden');
  hideTargetReminder();
  let didRender = false;
  try {
    state = (await api(`/match/${encodeURIComponent(matchId)}/${path}`, { method: 'POST', body })).state;
    flow = null;
    // Log in background: non bloccare l’UI
    void logs().catch(e => console.warn(e));

    if (state.status === 'finished') {
      void setBaseMatchInProgress(false);
      await render();
      didRender = true;
      await handleMatchFinished();
    } else {
      // ETB (on_play): prima creatura in campo + annunci, POI scelta bersaglio
      const etbSrc = deathTarget()?.task?.source;
      const isEtbPick = etbSrc === 'on_play' || etbSrc === 'terraforma_trigger' || etbSrc === 'aura_attack';

      if (isEtbPick) {
        await Promise.all([drawBoard(), drawHand()]);
        controls();
        updateOpponentName();
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        try { await presentPendingAnnouncements(); } catch (e) { console.warn(e); }
        await render();
        didRender = true;
      } else {
        await render();
        didRender = true;
        let text = null;
        let kind = 'success';
        if (state.mostrissimo_result?.outcome === 'failed') {
          text = state.mostrissimo_result.message; kind = 'error';
        } else if (deathOrder()) text = 'Scegli l’ordine delle creature morte.';
        else if (deathTarget()?.task?.source === 'on_death') text = 'Scegli il bersaglio dell’effetto alla morte.';
        else if (state.pending_reaction) text = reactionDescription(state.pending_reaction.event);
        else if (message && !(path === 'end-turn' && state.active_player_index !== 1)
          && !/dichiarat/i.test(message)) text = message;
        if (text) await notice(text, kind);
      }
    }
  } catch (e) {
    fail(e);
    try {
      state = (await api(`/match/${encodeURIComponent(matchId)}`)).state;
      flow = null;
      didRender = false;
    } catch (refreshError) {
      console.warn(refreshError);
    }
  } finally {
    busy = false;
    // Un solo render di chiusura se non l’abbiamo già fatto (evita doppio lavoro)
    if (!didRender) await render().catch(fail);
    else controls(); // sblocca subito i pulsanti
    if (!state || !matchId || state.status === 'finished') {
      return;
    }
    if (path === 'end-turn') {
      const endedTurn = state.active_player_index === 0
        ? Math.max(1, (state.current_turn ?? 1) - 1)
        : (state.current_turn ?? 1);
      await presentPhase('end', 1, endedTurn, state.players?.[1]?.max_mana ?? 0).catch(fail);
    } else {
      await ensurePhaseBanner().catch(fail);
    }
    const etbSrc = deathTarget()?.task?.source;
    const skipPres = etbSrc === 'on_play' || etbSrc === 'terraforma_trigger' || etbSrc === 'aura_attack';
    if (!skipPres) queuePresentation();
  }
}
// Il giocatore avversario come bersaglio (danni a scelta): si tocca il riquadro dei suoi PV.
async function playerTargetable() {
  if (!state || busy || obligatory()) return false;
  const r = reaction();
  if (r && flow?.kind === 'trap-target') return !!playerTargetEffect(await card(flow.id)) && r.event?.kind !== 'monster_etb';
  if (flow?.kind === 'mostrissimo-target') { const p = pending(); return !!p && !!playerTargetEffect(await card(p.card_id)); }
  if (flow?.kind === 'hand' && flow.step === 'target') return !!playerTargetEffect(await card(flow.id));
  return false;
}
async function markPlayerTarget() {
  const box = $('opponent-life')?.closest('.hud-value'); if (!box) return;
  const on = await playerTargetable();
  box.classList.toggle('valid-target',on);
  box.style.cursor = on ? 'pointer' : ''; box.style.outline = on ? '2px solid #e8c46a' : ''; box.style.pointerEvents = on ? 'auto' : '';
}
async function playerClick() {
  if (!(await playerTargetable())) return;
  const r = reaction();
  if (r && flow?.kind === 'trap-target') return chooseTrap({windowId:r.window_id,action:'play',cardInstanceId:flow.instanceId,targetInstanceId:AI_TARGET});
  if (flow?.kind === 'mostrissimo-target') return request('mostrissimo/complete',{position:flow.position,targetInstanceId:AI_TARGET},'Mostrissimo dichiarato.');
  if (flow?.kind === 'hand') {
    const d = await card(flow.id);
    return request('play-card',{cardInstanceId:flow.instanceId,options:{...(flow.position ? {position:flow.position} : {}),targetInstanceId:AI_TARGET}},creature(d) ? 'Creatura dichiarata.' : 'Carta dichiarata.');
  }
}
async function boardClick(pos) {
  // Durante scelta ETB / attacco / movimento / sacrifici Mostrissimo non perdere i click.
  const mostPaying = pending()?.stage === 'paying';
  const allowWhileBusy = mostPaying || flow?.kind === 'etb-target' || flow?.kind === 'mostrissimo-target'
    || flow?.kind === 'attack' || flow?.kind === 'move' || flow?.kind === 'hand';
  if (busy && !allowWhileBusy) return;
  if (noticeOpen && !mostPaying && flow?.kind !== 'etb-target' && flow?.kind !== 'attack' && flow?.kind !== 'move') return;
  // Sacrifici / ingresso Mostrissimo hanno priorità sulle altre scelte obbligatorie residue
  if (obligatory() && flow?.kind !== 'etb-target' && !mostPaying) return;

  // Mostrissimo: gestisci SUBITO (prima di flow bersaglio / reminder confusi)
  if (mostPaying && !reaction()) {
    const c0 = at(pos);
    const p0 = pending();
    if (p0.paid.length < p0.required) {
      if (!mostSacrificeHintDismissed) {
        return notice('Prima premi «Ho capito» sul messaggio.', 'error');
      }
      if (!c0) return notice('Tocca un tuo permanente evidenziato da sacrificare.', 'error');
      return pickTributeFromCell(c0);
    }
    // Fase 2: cella di ingresso (dopo «Ho capito»)
    if (!mostEntryHintDismissed) {
      return notice('Prima premi «Ho capito» sul messaggio.', 'error');
    }
    if (c0 || !summonCells(p0).some(x => eq(x, pos))) {
      return notice('Tocca una cella libera evidenziata per far entrare il Mostrissimo.', 'error');
    }
    mostEntryPick = { row: pos.row, col: pos.col };
    await showMostrissimoEntryConfirm(mostEntryPick);
    return;
  }

  if (flow?.kind === 'etb-target') {
    const c = at(pos);
    if (!c || !(flow.eligible ?? []).includes(c.instance_id)) {
      return;
    }
    let def = null;
    try { def = await card(c.card_id); } catch (_) { /* ignore */ }
    const ok = await confirmTargetChoice(c, def);
    if (!ok) return; // resta in modalità scelta bersaglio
    if (deathTarget()?.choice_id !== flow.choiceId) return;
    const choiceId = flow.choiceId;
    flow = null;
    return request('death/target',{choiceId,targetInstanceId:c.instance_id},'Effetto in entrata risolto.');
  }
  const c = at(pos), r = reaction();
  if (r) {
    if (flow?.kind === 'trap-target') {
      if (flow.windowId !== r.window_id) { flow = null; await render(); return notice('Finestra reattiva scaduta.','error'); }
      const d = await card(flow.id);
      if (!targetAllowed(d,c,r.event)) return notice('Bersaglio della Trappola non valido.','error');
      let def = null;
      try { def = await card(c.card_id); } catch (_) { /* ignore */ }
      const ok = await confirmTargetChoice(c, def);
      if (!ok) return;
      return chooseTrap({windowId:r.window_id,action:'play',cardInstanceId:flow.instanceId,targetInstanceId:c.instance_id});
    }
    return notice('Scegli una Trappola oppure passa.','error');
  }
  if (!turn()) return;
  const p = pending();
  if (flow?.kind === 'mostrissimo-target') {
    if (!p || p.stage !== 'paying' || p.paid.length !== p.required) { flow = null; await render(); return notice('Evocazione non più valida.','error'); }
    const d = await card(p.card_id);
    // Cella di evocazione = se stessa (dopo l’ingresso).
    if (!c && flow.position && eq(flow.position, pos) && p.offered_instance_id) {
      return request('mostrissimo/complete',{position:flow.position,targetInstanceId:p.offered_instance_id},'Mostrissimo dichiarato.');
    }
    if (!targetAllowed(d,c)) return notice('Bersaglio dell’effetto all’entrata non valido.','error');
    let def = null;
    try { def = await card(c.card_id); } catch (_) { /* ignore */ }
    const ok = await confirmTargetChoice(c, def);
    if (!ok) return;
    return request('mostrissimo/complete',{position:flow.position,targetInstanceId:c.instance_id},'Mostrissimo dichiarato.');
  }
  if (p && p.stage === 'paying') {
    // Già gestito in cima a boardClick
    return;
  }
  if (flow?.kind === 'hand') {
    const d = await card(flow.id);
    if (flow.step === 'cell') {
      if (c || pos.row !== 2) return notice('Scegli una cella libera della tua riga.','error');
      flow.position = pos;
      // Mostri con danno/rimozione mirati: il server ESIGE il bersaglio già in play-card.
      // (Buff/cura possono essere scelti dopo l’ingresso; maledizioni usano già lo step target.)
      const needsTargetNow = creature(d) && effects(d).some(e =>
        !e?.trigger
        && (e?.target === 'any_creature' || e?.target === 'any_target' || e?.type === 'return_hand')
        && e.type !== 'heal'
        && e.type !== 'buff'
      );
      if (needsTargetNow && hasTargets(d)) {
        flow.step = 'target';
        await render();
        showTargetReminder(targetReminderText(d));
        return;
      }
      return request('play-card',{cardInstanceId:flow.instanceId,options:{position:pos}},'Carta dichiarata.');
    }
    if (flow.step === 'target') {
      if (!targetAllowed(d,c)) return notice('Bersaglio non valido.','error');
      let def = null;
      try { def = await card(c.card_id); } catch (_) { /* ignore */ }
      const ok = await confirmTargetChoice(c, def);
      if (!ok) return;
      return request('play-card',{cardInstanceId:flow.instanceId,options:{...(flow.position ? {position:flow.position} : {}),targetInstanceId:c.instance_id}},creature(d) ? 'Creatura dichiarata.' : 'Carta dichiarata.');
    }
  }
  if (flow?.kind === 'move') {
    if (!steps(flow.from).some(x => eq(x,pos))) return notice('Scegli una cella libera adiacente.','error');
    hideTargetReminder();
    return request('move',{from:flow.from,to:pos},'Movimento dichiarato.');
  }
  if (flow?.kind === 'attack') {
    if (!attackable(flow.from).some(x => eq(x,pos))) return notice('Scegli un nemico adiacente evidenziato.','error');
    hideTargetReminder();
    return request('attack',{attackerPosition:flow.from,target:{type:'creature',position:pos}},'Attacco dichiarato.');
  }
  if (c) return inspect('unit',c.card_id,{position:pos,cell:c});
}
/** Colori iris per gli occhi della maledizione (fallback cerchi). */
const FACTION_EYE = {
  CHI: '#c9b88a', INF: '#5a8dc2', PES: '#8a72b8',
  BUL: '#c4684f', GRO: '#5aa87c', CLO: '#e0a22a', IND: '#8a96a3',
};

/** Overlay narrativo (nomeavversario) per scelta colori: anima / artefatto / maledizione.
 *  Home resta sullo sfondo (3 piramidi). */
function closeColorDialog() {
  const anima = $('anima-scene');
  if (anima) {
    anima.classList.add('hidden');
    anima.style.display = 'none';
  }
  $('deck-color-dialog')?.classList.add('hidden');
  // Torna sempre alla Home (piramidi). Il dialog spoglie si apre solo cliccando «Partita base».
  if (!state && !busy && !matchId) showHome();
}

function animaSceneEl() {
  let el = $('anima-scene');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'anima-scene';
  el.className = 'anima-scene hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Scelta dell’anima');
  // Sopra la Home, sotto eventuali altri overlay di gioco
  el.style.cssText = 'position:fixed;inset:0;z-index:280;display:flex;align-items:center;justify-content:center;background:rgba(8,6,4,.72);padding:1rem;';
  document.body.append(el);
  return el;
}

function renderColorButtons(codes, onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'anima-color-grid';
  wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:.55rem;justify-content:center;margin-top:.9rem;max-width:min(92vw,420px);';
  for (const code of codes) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'primary-button anima-color-btn';
    btn.dataset.color = code;
    const name = deckFactionNames[code] || code;
    const iris = FACTION_EYE[code] || '#e8c565';
    btn.style.cssText = `min-width:7.2rem;padding:.7rem .85rem;border:2px solid ${iris};box-shadow:0 0 0 1px rgba(0,0,0,.35),0 0 14px ${iris}44;font-size:.95rem;`;
    btn.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${iris};margin-right:.45rem;vertical-align:middle;box-shadow:0 0 6px ${iris}"></span>${name}`;
    btn.onclick = () => onPick(code);
    wrap.append(btn);
  }
  return wrap;
}

/** Scena a step: A anima → B artefatto → saluto → occhi maledizione → newMatch. */
async function showAnimaScene() {
  if (busy || reaction() || pending() || obligatory()) return;
  close(); closeGraveyard();
  hideStart(); 
  // Home resta visibile sotto (3 piramidi)

  const el = animaSceneEl();
  el.innerHTML = '';
  el.style.display = 'flex';
  el.classList.remove('hidden');

  const panel = document.createElement('div');
  panel.className = 'panel anima-panel';
  panel.style.cssText = 'width:min(94vw,460px);max-height:92dvh;overflow:auto;margin:auto;padding:1.15rem 1.1rem 1.3rem;text-align:center;border:1px solid #d5a758;box-shadow:0 16px 56px #000;background:linear-gradient(180deg,#1a1410 0%,#0e0b09 100%);';

  const med = document.createElement('div');
  med.className = 'narrator-medallion bob';
  med.style.cssText = 'width:150px;height:150px;margin:0 auto .7rem;border-radius:50%;overflow:hidden;border:2px solid #d5a758;';
  med.innerHTML = `<img class="narrator-img" src="img/png/domanda/domanda.webp" alt="nomeavversario" width="150" height="150" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`;

  const nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-family:"Lilita One",Georgia,serif;color:#e8c565;font-size:1.15rem;margin-bottom:.35rem;letter-spacing:.03em;';
  nameEl.textContent = 'nomeavversario';

  const speech = document.createElement('p');
  speech.id = 'anima-speech';
  speech.style.cssText = 'margin:0 auto;line-height:1.5;font-size:1.08rem;max-width:36ch;white-space:pre-line;';

  const choices = document.createElement('div');
  choices.id = 'anima-choices';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'secondary-button';
  cancel.style.cssText = 'margin-top:1rem;';
  cancel.textContent = 'Annulla';
  cancel.onclick = () => {
    el.classList.add('hidden');
    el.style.display = 'none';
    showHome();
  };

  panel.append(med, nameEl, speech, choices, cancel);
  el.append(panel);

  const allCodes = Object.keys(deckFactionNames);

  // —— Passo A: colore dell’anima ——
  speech.textContent = 'Benvenuto, coraggioso. Dimmi, com’è fatta la tua anima?';
  choices.innerHTML = '';
  const primary = await new Promise(resolve => {
    choices.append(renderColorButtons(allCodes, code => resolve(code)));
  });

  // —— Passo B: artefatto ——
  speech.textContent = 'Interessante… ti aiuterò: quale artefatto vuoi?';
  choices.innerHTML = '';
  const remaining = allCodes.filter(c => c !== primary);
  const secondary = await new Promise(resolve => {
    choices.append(renderColorButtons(remaining, code => resolve(code)));
  });

  // —— Saluto avversario ——
  let uname = 'coraggioso';
  try {
    const u = await getCurrentUser();
    uname = usernameFromEmail(u?.email) || 'coraggioso';
  } catch (_) { /* ignore */ }
  speech.textContent = `Bene. Sei pronto per la prima stanza. Buona fortuna, ${uname}.`;
  choices.innerHTML = '';
  cancel.style.display = 'none';
  await new Promise(resolve => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'primary-button';
    btn.textContent = 'Continua';
    btn.onclick = () => resolve();
    choices.append(btn);
  });

  // —— Maledizione: solo 2 occhi del terzo colore ——
  const candidates = allCodes.filter(c => c !== primary && c !== secondary);
  const tertiary = candidates[Math.floor(Math.random() * candidates.length)];
  const tName = deckFactionNames[tertiary] || tertiary;
  const iris = FACTION_EYE[tertiary] || '#e8c565';

  med.style.display = 'none';
  nameEl.style.display = 'none';
  speech.textContent = `Un’ombra ti sfiora. Ora ${tName} fa parte di te.`;
  choices.innerHTML = '';
  const eyes = document.createElement('div');
  eyes.setAttribute('aria-hidden', 'true');
  eyes.style.cssText = 'display:flex;gap:2.2rem;justify-content:center;align-items:center;margin:.6rem 0 1rem;';
  for (let i = 0; i < 2; i++) {
    const eye = document.createElement('div');
    eye.style.cssText = `width:52px;height:52px;border-radius:50%;background:#0b0806;border:3px solid #3a2e1a;box-shadow:0 0 18px ${iris}88, inset 0 0 12px #000;display:flex;align-items:center;justify-content:center;`;
    const pupil = document.createElement('div');
    pupil.style.cssText = `width:22px;height:22px;border-radius:50%;background:${iris};box-shadow:0 0 10px ${iris},0 0 2px #fff8;`;
    eye.append(pupil);
    eyes.append(eye);
  }
  choices.append(eyes);
  await new Promise(resolve => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'primary-button';
    btn.textContent = 'Affronto il destino';
    btn.onclick = () => resolve();
    choices.append(btn);
  });

  el.classList.add('hidden');
  el.style.display = 'none';
  hideHome();
    // Avvia partita con tertiary già scelto (coerente con il messaggio); maledizione già mostrata
  await newMatch(primary, secondary, {
    tertiaryColor: tertiary,
    curseAlreadyShown: true,
  });
}

function openColorDialog() {
  // Dalla Home / Storia non c’è partita: sblocca sempre eventuali flag residui
  if (!state && !matchId) busy = false;
  if (busy || reaction() || pending() || obligatory()) {
    console.warn('[anima] openColorDialog blocked', { busy, reaction: !!reaction(), pending: !!pending(), obligatory: !!obligatory() });
    return;
  }
  showAnimaScene().catch(fail);
}
async function submitColors() {
  if (busy || obligatory()) return;
  const primaryColor = $('deck-primary-color')?.value, secondaryColor = $('deck-secondary-color')?.value;
  if (!deckFactionNames[primaryColor] || !deckFactionNames[secondaryColor] || primaryColor === secondaryColor) {
    if ($('deck-color-validation')) $('deck-color-validation').textContent = 'Scegli due colori diversi.';
    return;
  }
  if ($('deck-color-validation')) $('deck-color-validation').textContent = '';
  currentMode = 'base';
  await newMatch(primaryColor, secondaryColor, {});
}


// ---------- HOME PAGE: deserto + tre piramidi (Storia / Endless / Coming Soon) ----------
let currentMode = 'base'; // lab: solo Partita base


function homeDialog() {
  let el = $('home-dialog');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'home-dialog';
  el.className = 'home-dialog hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'home-title');

  // Sfondo deserto
  const bg = document.createElement('div');
  bg.className = 'home-desert';

  // Contenuto centrale
  const content = document.createElement('div');
  content.className = 'home-content';

  const title = document.createElement('h1');
  title.id = 'home-title';
  title.className = 'home-title';
  title.textContent = 'Scegli il tuo destino';

  const subtitle = document.createElement('p');
  subtitle.className = 'home-subtitle';
  subtitle.textContent = 'Tre piramidi sorgono all’orizzonte…';

  // Contenitore delle tre piramidi
  const pyramids = document.createElement('div');
  pyramids.className = 'home-pyramids';

  // Crea una piramide: se c’è imageSrc usa l’immagine, altrimenti SVG di fallback
  function makePyramid(id, label, locked, onClick, imageSrc) {
    const wrap = document.createElement('button');
    wrap.type = 'button';
    wrap.id = id;
    wrap.className = 'home-pyramid' + (locked ? ' is-locked' : '');
    wrap.setAttribute('aria-label', label);
    if (locked) wrap.disabled = true;

    if (imageSrc) {
      // Usa l’immagine caricata (es. piramide1.png)
      wrap.innerHTML = `
        <img class="pyramid-img" src="${imageSrc}" alt="" width="220" height="120" decoding="async" />
        <span class="pyramid-label">${label}</span>
      `;
    } else {
      // SVG di fallback (per le modalità senza immagine ancora)
      wrap.innerHTML = `
        <svg class="pyramid-svg" viewBox="0 0 120 110" width="140" height="128" aria-hidden="true">
          <defs>
            <linearGradient id="pg-${id}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#e8c565"/>
              <stop offset="55%" stop-color="#c9a043"/>
              <stop offset="100%" stop-color="#8a5a14"/>
            </linearGradient>
            <linearGradient id="ps-${id}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#00000055"/>
              <stop offset="100%" stop-color="#00000000"/>
            </linearGradient>
          </defs>
          <polygon points="60,8 112,100 8,100" fill="url(#pg-${id})" stroke="#5a3410" stroke-width="2.5"/>
          <polygon points="60,8 112,100 60,100" fill="url(#ps-${id})"/>
          <rect x="52" y="72" width="16" height="28" fill="#2a1a0a" opacity="0.85"/>
          <rect x="4" y="98" width="112" height="6" rx="1" fill="#6b4420"/>
        </svg>
        <span class="pyramid-label">${label}</span>
      `;
    }

    if (!locked && onClick) {
      wrap.onclick = onClick;
    }
    return wrap;
  }

  // Piramidi future: stesso aspetto, click → messaggio alieni (solo Partita base è giocabile).
  const alienPyramid = () => showHoCapitoDialog({
    title: 'In costruzione',
    bodyHtml: '<p>Gli alieni stanno ancora costruendo questa piramide.</p>',
    imageHtml: opponentImageHtml(120),
  });
  const storyBtn = makePyramid('home-story', '???', false, () => { void alienPyramid(); }, 'img/UI/HOME/piramide-storia.webp');
  const endlessBtn = makePyramid('home-endless', '???', false, () => { void alienPyramid(); }, 'img/UI/HOME/piramide-endless.webp');
  const pvpBtn = makePyramid('home-pvp', '???', false, () => { void alienPyramid(); }, 'img/UI/HOME/piramide-pvp.webp');

  // 4ª piramide: Partita base (lab). In produzione nascondere con SHOW_BASE_MATCH_PYRAMID=false.
  const baseBtn = makePyramid('home-base', 'Partita base', false, () => {
    currentMode = 'base';
        // Sempre passa da startScreen: probe last_match + dialog RIPRENDI / nuovo inizio
    startScreen().catch(fail);
  }, 'img/UI/HOME/piramide-base.webp');
  if (!SHOW_BASE_MATCH_PYRAMID) {
    baseBtn.classList.add('hidden');
    baseBtn.disabled = true;
  }

  subtitle.textContent = 'Lab: usa la piramide «Partita base» per testare il motore.';
  pyramids.append(storyBtn, endlessBtn, pvpBtn, baseBtn);
  content.append(title, subtitle, pyramids);
  el.append(bg, content);

  // Aggiungi al body (copre tutto lo schermo dopo il login)
  document.body.append(el);
  return el;
}

function showHome() {
  if (state || busy) return;
  const el = homeDialog();

  // Lab: piramidi 1–3 sempre bloccate; 4ª visibile solo se flag lab
  for (const id of ['home-story', 'home-endless', 'home-pvp']) {
    const b = $(id);
    if (!b) continue;
    // Cliccabili: messaggio alieni (onClick già su makePyramid)
  }
  const baseBtn = $('home-base');
  if (baseBtn) {
    if (SHOW_BASE_MATCH_PYRAMID) {
      baseBtn.classList.remove('hidden', 'is-locked');
      baseBtn.disabled = false;
    } else {
      baseBtn.classList.add('hidden');
      baseBtn.disabled = true;
    }
  }

  el.classList.remove('hidden');
  hideStart();
    try {  } catch (_) { /* ignore */ }
  $('deck-color-dialog')?.classList.add('hidden');
}

function hideHome() {
  $('home-dialog')?.classList.add('hidden');
}

// ---------- Schermata iniziale: recupera partita precedente / nuova partita ----------
let priorMatch = null, probing = false;
/** true se probePrior è già stato eseguito dopo l’ultimo login (warm). */
let priorProbed = false;
async function probePrior() {
  priorMatch = null;
  // Preferisci cache profilo (claimDevice) → localStorage → GET /me/profile
  let prior = null;
  const _pc = getProfileCache();
  if (_pc?.last_match_id) {
    prior = String(_pc.last_match_id);
  }
  if (!prior) {
    try { prior = lsGet('penombra:last-match'); } catch (_) { prior = null; }
  }
  if (!prior) {
    try {
      const profile = await api('/me/profile');
      /* profile in net cache via pullProfileFromServer */
      if (profile?.last_match_id) prior = String(profile.last_match_id);
    } catch (_) { /* ignore */ }
  }
  priorProbed = true;
  if (!prior) return;
  try {
    const [user, result] = await Promise.all([getCurrentUser(), api(`/match/${encodeURIComponent(prior)}`)]);
    const myId = user?.id;
    const isMine = myId && result.state?.players?.some(pl => pl?.user_id === myId);
    if (result.state?.state_version === 4 && isMine && result.state.status !== 'finished') {
      priorMatch = { id: prior };
      try { lsSet('penombra:last-match', prior); } catch (_) { /* ignore */ }
      return;
    }
    if (result.state?.status === 'finished') {
      void api('/me/profile', { method: 'PUT', body: { last_match_id: null } }).catch(() => {});
      try { lsRemove('penombra:last-match'); } catch (_) { /* ignore */ }
      priorMatch = null;
      return;
    }
  } catch (e) {
    console.warn('Ripristino non verificato sul server', e);
    priorMatch = { id: prior, unverified: true };
  }
}
function startDialog() {
  let el = $('start-dialog');
  if (el) {
    // Se era rimasto dentro #stage (versioni vecchie), spostalo sul body
    if (el.parentElement !== document.body) document.body.append(el);
    return el;
  }
  el = document.createElement('div');
  el.id = 'start-dialog';
  el.className = 'card-detail-overlay start-dialog hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'start-title');
  // Sul body, sopra Home (#game-screen è z-index:1). Non dentro #stage.
  el.style.cssText = 'position:fixed;inset:0;z-index:500;display:grid;place-items:center;padding:1rem;background:rgba(5,5,11,.92);';
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.style.cssText = 'width:min(92vw,420px);margin:auto;padding:1.2rem;text-align:center;border:1px solid #d5a758;box-shadow:0 12px 48px #000;';
  const title = document.createElement('h2');
  title.id = 'start-title';
  title.textContent = 'Le spoglie e l’inizio';
  const text = document.createElement('p');
  text.id = 'start-text';
  const actions = document.createElement('div');
  actions.className = 'start-actions';
  actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:.6rem;justify-content:center;margin-top:.9rem;';
  const recover = document.createElement('button');
  recover.type = 'button';
  recover.id = 'start-recover-button';
  recover.className = 'primary-button';
  recover.textContent = 'RIPRENDI le tue spoglie';
  recover.onclick = () => recoverPrior().catch(fail);
  const fresh = document.createElement('button');
  fresh.type = 'button';
  fresh.id = 'start-new-button';
  fresh.className = 'secondary-button';
  fresh.textContent = 'Abbraccia un nuovo inizio';
  fresh.onclick = () => {
    hideStart();
    showHome();
    openColorDialog();
  };
  actions.append(recover, fresh);
  panel.append(title, text, actions);
  el.append(panel);
  document.body.append(el);
  return el;
}
function showStart(opts = {}) {
  if (state || busy) {
    console.info('[penombra] showStart skip', { hasState: !!state, busy });
    return;
  }
  if ($('anima-scene') && !$('anima-scene').classList.contains('hidden')) return;
  const el = startDialog();
  const loading = !!opts.loading || probing;
  const has = !!priorMatch;
  const recover = $('start-recover-button');
  const fresh = $('start-new-button');
  const text = $('start-text');
  if (loading) {
    if (recover) recover.classList.add('hidden');
    if (fresh) { fresh.className = 'secondary-button'; fresh.disabled = true; }
    if (text) text.textContent = 'Ispezionando le bende…';
  } else {
    if (fresh) fresh.disabled = false;
    if (recover) recover.classList.toggle('hidden', !has);
    if (fresh) fresh.className = has ? 'secondary-button' : 'primary-button';
    if (text) {
      text.textContent = has
        ? 'Un’ombra precedente ti attende. Vuoi riprendere le tue spoglie o abbracciare un nuovo inizio?'
        : 'Nessuna spoglia da recuperare. Puoi solo abbracciare un nuovo inizio.';
    }
  }
  try { hideHome(); } catch (_) { /* ignore */ }
  el.classList.remove('hidden');
  el.style.display = 'grid';
  console.info('[penombra] showStart', { loading, hasPrior: has, priorId: priorMatch?.id ?? null });
}
function hideStart() {
  const el = $('start-dialog');
  if (!el) return;
  el.classList.add('hidden');
  el.style.display = 'none';
}
async function startScreen() {
  if (state || busy) return;
  // Partita base: solo flag profilo. Nessun GET /match finché non clicca RIPRENDI.
  currentMode = 'base';
  const on = isBaseMatchInProgress();
  const id = baseMatchIdHint();
  priorMatch = on && id ? { id } : null;
  priorProbed = true;
  showStart();
}

function showOpponentDialog(text) {
  return showHoCapitoDialog({
    title: OPPONENT_NAME,
    bodyHtml: `<p style="white-space:pre-line">${String(text || '').replace(/</g, '&lt;')}</p>`,
    imageHtml: opponentImageHtml(150),
  });
}


/** Dopo una vittoria in Storia: aggiorna progressi e propone il prossimo passo.
 *  Prima pulisce la griglia, poi mostra la schermata di complimenti della Mummia. */
async function recoverPrior() {
  if (!priorMatch || busy) return;
  const id = priorMatch.id;
  busy = true; controls();
  hideStart();
  let lineI = 0;
  showMatchLoading(funnyBootLine(0));
  const lineTimer = setInterval(() => {
    lineI += 1;
    showMatchLoading(funnyBootLine(lineI));
  }, 900);
  try {
    const result = await api(`/match/${encodeURIComponent(id)}`);
    if (!result?.state || result.state.status === 'finished') {
      priorMatch = null;
      await setBaseMatchInProgress(false);
      throw new Error('Partita non più disponibile');
    }
    matchId = id; state = result.state; flow = null; priorMatch = null; deathDraft = {choiceId:null,instanceIds:[]};
    await setBaseMatchInProgress(true, id);
    try { lsSet('penombra:last-match', id); } catch (_) { /* ignore */ }
    await render();
    notice('Partita precedente ripristinata.', 'success');
    queuePresentation(true);
  } catch (e) {
    console.warn('recoverPrior', e);
    priorMatch = null;
    await setBaseMatchInProgress(false);
    notice(
      'Lo stato non è più disponibile sul server (partita scaduta, già finita, o tabella matches assente).\n' +
      'Avvia una nuova Partita base.',
      'error'
    );
    showStart();
  } finally {
    clearInterval(lineTimer);
    hideMatchLoading();
    busy = false; controls();
  }
}
function showCurseDialog(humanColors, aiColors) {
  return new Promise(resolve => {
    let el = $('curse-dialog');
    if (!el) {
      el = document.createElement('div');
      el.id = 'curse-dialog';
      el.className = 'card-detail-overlay';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.style.zIndex = '140';
      stageRoot().append(el);
    }
    const tertiary = humanColors?.tertiary;
    const tName = deckFactionNames[tertiary] || tertiary || 'sconosciuto';
    const iris = (typeof FACTION_EYE !== 'undefined' && FACTION_EYE[tertiary]) || '#e8c565';
    el.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.cssText = 'width:min(92vw,440px);margin:auto;padding:1.3rem 1.2rem;text-align:center;border:1px solid #d5a758;box-shadow:0 12px 48px #000';
    const body = document.createElement('p');
    body.style.cssText = 'margin:0 0 .6rem;line-height:1.5;font-size:1.08rem;';
    body.textContent = `Un’ombra ti sfiora. Ora ${tName} fa parte di te.`;
    const eyes = document.createElement('div');
    eyes.setAttribute('aria-hidden', 'true');
    eyes.style.cssText = 'display:flex;gap:2.2rem;justify-content:center;align-items:center;margin:.7rem 0 1.1rem;';
    for (let i = 0; i < 2; i++) {
      const eye = document.createElement('div');
      eye.style.cssText = `width:52px;height:52px;border-radius:50%;background:#0b0806;border:3px solid #3a2e1a;box-shadow:0 0 18px ${iris}88, inset 0 0 12px #000;display:flex;align-items:center;justify-content:center;`;
      const pupil = document.createElement('div');
      pupil.style.cssText = `width:22px;height:22px;border-radius:50%;background:${iris};box-shadow:0 0 10px ${iris},0 0 2px #fff8;`;
      eye.append(pupil);
      eyes.append(eye);
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'primary-button';
    btn.textContent = 'Affronto il destino';
    btn.onclick = () => { el.classList.add('hidden'); resolve(); };
    panel.append(body, eyes, btn);
    el.append(panel);
    el.classList.remove('hidden');
  });
}
/** Popup moneta egizia: chi inizia la partita (dopo la maledizione). */
function showCoinFlip(firstIsHuman) {
  try { hideMatchLoading(); } catch (_) {}
  return new Promise(resolve => {
    let el = $('coin-flip-dialog');
    if (!el) {
      el = document.createElement('div');
      el.id = 'coin-flip-dialog';
      el.className = 'card-detail-overlay';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.style.zIndex = '145';
      stageRoot().append(el);
    }
    el.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.cssText = 'width:min(92vw,400px);margin:auto;padding:1.4rem 1.2rem;text-align:center;border:1px solid #d5a758;box-shadow:0 12px 48px #000';
    const label = document.createElement('p');
    label.style.cssText = 'margin:0 0 .6rem;font-family:"Nunito",system-ui,sans-serif;font-weight:700;color:#5a3410';
    label.textContent = 'La moneta del destino gira…';
    const coin = document.createElement('div');
    coin.className = 'coin-flip-disk';
    coin.setAttribute('aria-hidden', 'true');
    coin.innerHTML = `<svg viewBox="0 0 120 120" width="110" height="110">
      <circle cx="60" cy="60" r="56" fill="#e8c565" stroke="#8a5a14" stroke-width="6"/>
      <circle cx="60" cy="60" r="44" fill="none" stroke="#c9a043" stroke-width="3"/>
      <path d="M60 22 L66 48 L94 48 L72 64 L80 92 L60 76 L40 92 L48 64 L26 48 L54 48 Z" fill="#4a1f08" opacity=".85"/>
      <text x="60" y="108" text-anchor="middle" font-size="9" fill="#4a1f08" font-family="Georgia,serif">RA</text>
    </svg>`;
    const result = document.createElement('p');
    result.style.cssText = 'margin:1rem 0 .4rem;font-family:"Lilita One",Georgia,serif;font-size:1.35rem;color:#e8c565;letter-spacing:.02em';
    const foe = opponentDisplayName();
    result.textContent = firstIsHuman ? 'Inizi tu' : `Inizia ${foe}`;
    const sub = document.createElement('p');
    sub.style.cssText = 'margin:0 0 1.1rem;font-size:.95rem;line-height:1.4';
    sub.textContent = firstIsHuman
      ? 'Primo turno: mana massimo 1. Tocca una carta quando sei pronto.'
      : `${foe} muove per prima. Mana massimo 1. Osserva e preparati.`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'primary-button';
    btn.textContent = 'Continua';
    btn.onclick = () => { el.classList.add('hidden'); resolve(); };
    panel.append(label, coin, result, sub, btn);
    el.append(panel);
    el.classList.remove('hidden');
  });
}
/** Camera di dialogo (placeholder): dopo la moneta, prima dell’inizio reale della partita. */
function showDialogueRoom() {
  try { hideMatchLoading(); } catch (_) {}
  return new Promise(resolve => {
    let el = $('dialogue-room-dialog');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dialogue-room-dialog';
      el.className = 'card-detail-overlay';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', 'dialogue-room-title');
      el.style.zIndex = '146';
      stageRoot().append(el);
    }
    el.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.cssText = 'width:min(92vw,440px);margin:auto;padding:1.4rem 1.2rem;text-align:center;border:1px solid #d5a758;box-shadow:0 12px 48px #000';

    const title = document.createElement('h2');
    title.id = 'dialogue-room-title';
    title.style.cssText = 'margin:0 0 .75rem;font-family:"Lilita One",Georgia,serif;font-size:1.25rem;color:#e8c565;';
    title.textContent = 'Camera di dialogo';

    const body = document.createElement('p');
    body.style.cssText = 'margin:0 0 1.2rem;line-height:1.5;font-size:1.05rem;';
    body.textContent = 'PLACEHOLDER PER DIALOGHI UTILO';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'primary-button';
    btn.textContent = 'Comprendo';
    btn.onclick = () => {
      el.classList.add('hidden');
      el.style.display = 'none';
      resolve();
    };

    panel.append(title, body, btn);
    el.append(panel);
    el.classList.remove('hidden');
    el.style.display = '';
  });
}


async function newMatch(primaryColor, secondaryColor, options = {}) {
  clearCardCache();
  lastPhaseKey = null;
  if (busy || obligatory()) return;
  busy = true; controls();
  currentMode = 'base';
  hideHome();
  hideStart();
  if ($('deck-color-confirm')) $('deck-color-confirm').disabled = true;
  if ($('deck-color-validation')) $('deck-color-validation').textContent = '';
  try {
    const createBody = {
      primaryColor,
      secondaryColor,
      gameMode: 'base',
    };
    if (options.tertiaryColor) createBody.tertiaryColor = options.tertiaryColor;

    const result = await api('/match/create', { method: 'POST', body: createBody });
    if (result.matchId || result.match_id || result.id) {
      const mid = result.matchId || result.match_id || result.id;
      void setBaseMatchInProgress(true, mid);
    }
    presentationGeneration++;
    presentationLayer().style.display = 'none';
    matchId = result.match_id || result.matchId || result.id;
    state = result.state;
    flow = null;
    deathDraft = { choiceId: null, instanceIds: [] };
    close();
    closeGraveyard();
    hideStart();
    hideHome();
    closeColorDialog();
    lsSet('penombra:last-match', matchId);
    hideMatchLoading();

    const humanColors = state?.deck_colors?.[1];
    const aiColors = state?.deck_colors?.[0];

    if (!options.curseAlreadyShown) {
      await showCurseDialog(humanColors, aiColors);
    }
    await showCoinFlip(state?.active_player_index === 1);
    await showDialogueRoom();
    const uname = usernameFromEmail((await getCurrentUser())?.email) || 'coraggioso';
    const desk = $('narrator-desk-speech');
    if (desk) desk.textContent = `Che le bestie divine ti assistano, ${uname}.`;

    await render();
    await logs();
    lastPhaseKey = null;
    await scanPhases(['upkeep', 'main'], state.active_player_index, state.current_turn ?? 1);
  } catch (e) {
    fail(e);
    if ($('deck-color-validation')) {
      $('deck-color-validation').textContent = e instanceof Error ? e.message : 'Impossibile creare la partita.';
    }
  } finally {
    hideMatchLoading();
    busy = false;
    if ($('deck-color-confirm')) $('deck-color-confirm').disabled = false;
    await render().catch(fail);
    queuePresentation();
  }
}
async function refreshMatch() {
  if (busy || !matchId) return; busy = true; controls();
  try {
    state = (await api(`/match/${encodeURIComponent(matchId)}`)).state;
    flow = null; close(); closeGraveyard(); await render(); await logs(); notice('Aggiornato.','success');
  } catch(e) { fail(e); }
  finally { busy = false; await render().catch(fail); queuePresentation(); }
}
async function init() {
  if (initialized) return;
  const user = await getCurrentUser(); if (!user) return;
  initialized = true;
  if ($('signed-in-user')) $('signed-in-user').textContent = `@${usernameFromEmail(user.email)}`;
  if ($('player-title')) $('player-title').textContent = usernameFromEmail(user.email) || 'Tu';
  overlay(); reactionDialog(); choiceDialog(); graveyardDialog(); wireGraveyards(); wireMenu(); wireSettings(); wireNoticeDismiss(); fitStage();
  $('cancel-selection-button')?.addEventListener('click',() => {
    if (obligatory()) return;
    if (flow?.kind === 'trap-target') { flow = null; render().catch(fail); notice('Scegli un’altra Trappola o passa.'); return; }
    if (!pending() && !reaction()) { flow = null; close(); render().catch(fail); notice('Selezione annullata.'); }
  });
  $('end-turn-button')?.addEventListener('click',() => { if (active()) request('end-turn',{},''); });
  $('logout-button')?.addEventListener('click',() => signOut().then(() => { presentationGeneration++; presentationLayer().style.display = 'none'; matchId = null; state = null; flow = null; priorMatch = null; deathDraft = {choiceId:null,instanceIds:[]}; close(); closeGraveyard(); closeColorDialog(); hideHome(); hideStart();  reactionDialog().classList.add('hidden'); choiceDialog().classList.add('hidden'); }).catch(fail));
  document.addEventListener('keydown',e => { if (e.key === 'Escape' && !obligatory()) { if (!$('anima-scene')?.classList.contains('hidden') && !busy) closeColorDialog(); else if (!$('graveyard-dialog')?.classList.contains('hidden')) closeGraveyard(); else if (view) close(); } });
  await render();
  // NON mostriamo la Home qui: solo dopo che l’utente ha confermato «Sono io» o ha fatto login
  // (evento penombra:auth-ready).
}
// Solo dopo conferma identità (login o «Sono io») mostriamo la Home.
// Importante: showHome() SUBITO (sincrono) così non si vede la griglia vuota
// mentre claimDeviceAndSync parla col server.

window.addEventListener('penombra:auth-ready', () => {
  // Solo Home (piramidi). Il dialog «spoglie» esce SOLO al click sulla piramide «Partita base».
  priorProbed = false;
  try { clearProfileCache(); } catch (_) { /* ignore */ }
  // Nessuna partita residua in memoria: dopo «Sono io» / login si vede sempre la Home.
  matchId = null;
  state = null;
  flow = null;
  view = null;
  busy = false;
  priorMatch = null;
  try { hideStart(); } catch (_) { /* ignore */ }
  try { close(); } catch (_) { /* ignore */ }
  try { showHome(); } catch (e) { console.warn('showHome', e); }
  init()
    .then(() => claimDeviceAndSync().catch(() => {}))
    .catch(fail);
});

// Se c’è già sessione, prepariamo i listener ma NON mostriamo ancora la Home
// (l’utente deve prima cliccare «Sono io»)
getCurrentUser().then(user => {
  if (user) return init();
}).catch(fail);
wireStage();
// Impostazioni subito (anche sulla schermata login)
try { wireSettings(); } catch (_) { /* ignore */ }
