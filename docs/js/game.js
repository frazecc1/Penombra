// docs/js/game.js — Penombra (lab partita base).
// Derivato dal client Bellum Penumbrum: login/home/partita base; modalità Storia/Endless/PvP disattivate.

import { getAccessToken, getCurrentUser, signOut, usernameFromEmail, showAuthScreen } from './auth.js';
import { API, SHOW_BASE_MATCH_PYRAMID } from './config.js';

const $ = id => document.getElementById(id);
const cache = new Map();
let state = null, matchId = null, busy = false, initialized = false, view = null, flow = null;
let deathDraft = { choiceId: null, instanceIds: [] };
let presentationRunning = false, presentationGeneration = 0;
let lastPhaseKey = null; // scandisce ogni cambio fase anche se vuota
const waitPresentation = ms => new Promise(resolve => setTimeout(resolve,ms));

const board = () => state?.board?.rows ?? [[null,null,null],[null,null,null],[null,null,null]];
const at = p => board()[p.row]?.[p.col] ?? null;

/** In PvE sei sempre index 1; in PvP dipende da user_id.
 *  Vista plancia: SEMPRE tu in basso (riga visuale 2), avversario in alto (riga 0),
 *  come in single player. Le coordinate inviate al server restano quelle del motore. */
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
const toViewPos = (enginePos) => enginePos ? { row: toViewRow(enginePos.row), col: enginePos.col } : viewPos;

function syncMyPlayerIndex(userId) {
  if (!state?.players || !userId) { myPlayerIndex = 1; return; }
  if (state.players[1]?.user_id === userId) myPlayerIndex = 1;
  else if (state.players[0]?.user_id === userId) myPlayerIndex = 0;
  else myPlayerIndex = 1;
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
const AI_TARGET = 'player:0';
const playerTargetEffect = d => ['aura','terraforma'].includes(d?.card_type) ? undefined : effects(d).find(e => !e?.trigger && e?.target === 'any_target' && ['damage','damage_creature'].includes(e.type));
const hasTargets = d => !!playerTargetEffect(d) || targets(d).length > 0;
const attackable = p => around(p).filter(q => { const c = at(q); return c && isFoe(c.owner_index) && (isCreatureCell(c) || (c.kind === 'terraforma' && c.hp !== undefined)); });

const factions = ['','CHI','INF','PES','BUL','GRO','CLO','IND'];
const deckFactionNames = {CHI:'Chiericanza',INF:'Infamia',PES:'Pestilenza',BUL:'Bullismo',GRO:'Grossanza',CLO:'Clownerie'};
const types = {monster:'MOSTRO',mostrissimo:'MOSTRISSIMO',maledizione:'MALEDIZIONE',instant:'TRAPPOLA',terraforma:'TERRAFORMA',aura:'AURA'};
const rarities = {common:'Comune',uncommon:'Non comune',rare:'Rara',ultra_rare:'Ultra rara',legendary:'Leggendaria'};

const faction = d => {
  const code = String(d?.faction_code ?? factions[Number(d?.faction_id)] ?? 'IND').toLowerCase();
  return ['chi','inf','pes','bul','gro','clo','ind'].includes(code) ? code : 'ind';
};

// ---------- Passo 1: helper di presentazione (stage) ----------
const stageRoot = () => $('stage') ?? document.body; // tutti i dialoghi vivono dentro la colonna centrale

/** Overlay di attesa: blocca click sulla Home mentre si crea/carica la partita. */
function showMatchLoading(text) {
  let el = document.getElementById('match-loading-overlay');
  if (!el) {
    el = createElement('div');
    el.id = 'match-loading-overlay';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;background:rgba(8,6,4,.82);padding:1.2rem;';
  const msg = String(text || 'Caricamento…').replace(/\n/g, '<br>');
  el.innerHTML = '<div class="panel" style="width:min(92vw,360px);margin:auto;padding:1.3rem;text-align:center;border:1px solid #d5a758;box-shadow:0 12px 48px #000"><p style="margin:0;line-height:1.45;font-size:1.05rem">' + msg + '</p></div>';
  el.hidden = false;
  el.classList.remove('hidden');
}
function hideMatchLoading() {
  const el = document.getElementById('match-loading-overlay');
  if (!el) return;
  el.hidden = true;
  el.classList.add('hidden');
  el.style.display = 'none';
  el.innerHTML = '';
}
try { window.hideMatchLoading = hideMatchLoading; window.showMatchLoading = showMatchLoading; } catch (_) {}

/** Creazione elemento con classe e contenuto. */
function createElement(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content) el.innerHTML = content;
  return el;
}

/** Ritorna la UI di una carta dal catalogo. */
function getCardUI(cardId) {
  if (!state?.catalog) return '';
  const card = state.catalog[cardId];
  if (!card) return '';
  const f = faction(card);
  return `
    <article class="fan-card faction-${f}${creature(card) ? '' : ' no-stats'}">
      <div class="fc-nameband"><span class="fc-name">${escape(card.name)}</span></div>
      <div class="fc-art">${artHTML(card)}</div>
      <span class="fc-cost shape-${f}" title="Costo">${costText(card)}</span>
      ${fxHTML(card)}
    </article>`;
}

/** HTML art della carta. */
function artHTML(d) {
  return d.image_url ? `<img src="${escape(d.image_url)}" alt="Illustrazione di ${escape(d.name)}">` : '<span class="game-card-art-placeholder">🎴</span>';
}

/** Testo effetto (preview). */
function fxHTML(d) {
  const t = effectPreview(d, 72);
  return t ? `<div class="fc-fx">${escape(t)}</div>` : '';
}

/** Anteprima effetto: intero se corto, altrimenti taglio + puntini. */
function effectPreview(d, max = 72) {
  const t = plainText(d);
  if (!t) return '';
  return t.length > max ? `${t.slice(0, Math.max(1, max - 1))}…` : t;
}

/** Testo effetto pulito. */
function plainText(d) {
  return String(d?.effect_text ?? '').replace(/\*\*/g,'').replace(/\s+/g,' ').trim();
}

/** Testo costo. */
function costText(d) {
  return d.card_type === 'mostrissimo' ? `✦${Number(d.sacrifice_cost ?? 0)}` : `⚡${effectiveManaCost(d)}`;
}

/** Mana effettivo. */
function effectiveManaCost(d) {
  let cost = Number(d?.mana_cost ?? 0);
  if (currentMode === 'story' && d?.card_type === 'monster') {
    const med = getStoryProgress()?.chosenPower;
    if (med === 'CLO') cost = Math.max(1, cost - 1);
  }
  return cost;
}

/** Nome dell'avversario. */
function foeName() {
  return them()?.name || 'Avversario';
}

/** Nome del giocatore corrente. */
function myName() {
  return me()?.name || usernameFromEmail() || 'Tu';
}

// ==================== FUNZIONI GAME ====================

function showEndgameDialog(result) {
  const root = stageRoot();
  if ($('endgame-dialog')) return;

  const meRes = isMine(deathOrder()?.chooser_index) ? 'you' : 'them';
  const isDraw = (me()?.hp ?? 0) === 0 && (them()?.hp ?? 0) === 0;

  const title = isDraw ? 'È un pareggio!' : (meRes === 'you' ? 'Hai vinto!' : 'Hai perso!');
  const message = isDraw 
    ? 'Nessuno dei due giocatori ha superato lo zero PV.' 
    : (meRes === 'you' ? 'Il tuo avversario ha raggiunto lo zero PV.' : 'Sei arrivato allo zero PV.');

  const dialogHTML = `
    <div id="endgame-dialog" class="game-overlay" style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center">
      <div class="panel" style="width:min(92vw,420px);padding:2rem;text-align:center;border:3px solid #d5a758;background:#111">
        <h2 style="color:#ffdd00;margin:0 0 1rem;font-size:2.2rem;">${title}</h2>
        <p style="font-size:1.3rem;margin:1rem 0;line-height:1.5">${message}</p>
        <p style="margin:2rem 0 1.5rem;font-size:1.1rem;color:#aaa">Premi "Accetto il giudizio" per continuare</p>
        <button id="accept-judgment" style="padding:1rem 3rem;font-size:1.3rem;background:#d5a758;color:#000;border:none;border-radius:8px;cursor:pointer">Accetto il giudizio</button>
      </div>
    </div>
  `;

  root.insertAdjacentHTML('beforeend', dialogHTML);

  const btn = $('#accept-judgment');
  btn.onclick = () => {
    if (meRes === 'you') {
      // Vittoria = Camera di Vittoria V
      showVictoryRoom();
    } else {
      // Perso o pareggiato = Login
      hideEndgameDialog();
      signOut();
      showAuthScreen();
    }
  };
}

function hideEndgameDialog() {
  const el = $('#endgame-dialog');
  if (el) el.remove();
}

function showVictoryRoom() {
  const root = stageRoot();
  const html = `
    <div id="victory-room" class="game-overlay" style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center">
      <div class="panel" style="width:min(92vw,480px);padding:3rem;text-align:center;border:3px solid #ffdd00;background:#111">
        <h2 style="color:#ffd700;margin:0 0 1.5rem;font-size:2.5rem">🎉 CAMERA DI VITTORIA V 🎉</h2>
        <p style="font-size:1.4rem;margin:2rem 0">Complimenti! Hai vinto la partita.</p>
        <p style="margin:2rem 0 3rem;font-size:1.1rem;color:#aaa">Questa è la camera di vittoria (placeholder per ora).</p>
        <button id="go-to-login" style="padding:1rem 3rem;font-size:1.3rem;background:#d5a758;color:#000;border:none;border-radius:8px;cursor:pointer">Torna al login</button>
      </div>
    </div>
  `;

  root.insertAdjacentHTML('beforeend', html);

  $('#go-to-login').onclick = () => {
    hideVictoryRoom();
    signOut();
    showAuthScreen();
  };
}

function hideVictoryRoom() {
  const el = $('#victory-room');
  if (el) el.remove();
}

// ==================== FINE FINE PARTITA ====================

// ... (il resto del file originale rimane identico fino alla fine)

// Funzione di fine partita (già presente nel tuo file originale)
async function finalizeGame(result) {
  // ... (codice originale di finalizeGame rimane qui)

  // Dopo il segnale di morte, mostriamo il dialogo
  if (deathOrder() && result.state?.pending_death_order) {
    const loser = result.state.players[result.state.pending_death_order.chooser_index];
    const isDraw = (loser.hp ?? 0) === 0 && (result.state.players[1 - result.state.pending_death_order.chooser_index].hp ?? 0) === 0;

    let outcome = isDraw ? 'draw' : (isMine(loser.index) ? 'loss' : 'victory');
    await showEndgameDialog(outcome);
  }
}

// Chiamata finale (già presente nel tuo file originale)
async function finalizeGame(result) {
  // ... (il tuo codice originale di finalizeGame)

  // Aggiungiamo qui il nostro popup (dopo la logica esistente)
  if (deathOrder() && result.state?.pending_death_order) {
    const loser = result.state.players[result.state.pending_death_order.chooser_index];
    const isDraw = (loser.hp ?? 0) === 0 && (result.state.players[1 - result.state.pending_death_order.chooser_index].hp ?? 0) === 0;

    let outcome = isDraw ? 'draw' : (isMine(loser.index) ? 'loss' : 'victory');
    await showEndgameDialog(outcome);
  }

  // ... (il resto del tuo codice di finalizeGame rimane identico)
}

// ==================== FINE AGGIUNTE ====================

// ... (tutto il resto del file originale rimane esattamente come prima)