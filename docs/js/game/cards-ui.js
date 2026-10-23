// docs/js/game/cards-ui.js — HTML carte / costi / escape (puro, senza stato partita)
import { factions, types, rarities, deckFactionNames, OPPONENT_NAME, OPPONENT_IMG } from './constants.js';

export const escape = x => String(x ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export const creature = d => ['monster','mostrissimo'].includes(d.card_type);
export const effects = d => Array.isArray(d?.effect_json?.effects) ? d.effect_json.effects : d?.effect_json?.type ? [d.effect_json] : [];
export const targetEffect = d => effects(d).find(e => !e?.trigger && (e?.target === 'any_creature' || e?.target === 'any_target' || e?.type === 'return_hand'));
export const playerTargetEffect = d => ['aura','terraforma'].includes(d?.card_type) ? undefined : effects(d).find(e => !e?.trigger && e?.target === 'any_target' && ['damage','damage_creature'].includes(e.type));

export const faction = d => {
  const code = String(d?.faction_code ?? factions[Number(d?.faction_id)] ?? 'IND').toLowerCase();
  return ['chi','inf','pes','bul','gro','clo','ind'].includes(code) ? code : 'ind';
};

const isCreatureCell = c => c?.kind === 'creature';

export function opponentImageHtml(size = 140) {
  const s = Number(size) || 140;
  return `<img src="${OPPONENT_IMG}" alt="${OPPONENT_NAME}" width="${s}" height="${s}" style="width:${s}px;height:${s}px;max-width:40vw;object-fit:cover;border-radius:10px;border:2px solid #c9a043" onerror="this.style.display='none'">`;
}

export function effectiveManaCost(d) {
  return Number(d?.mana_cost ?? 0);
}
export const costText = d => d.card_type === 'mostrissimo' ? `✦${Number(d.sacrifice_cost ?? 0)}` : `⚡${effectiveManaCost(d)}`;
export const plainText = d => String(d?.effect_text ?? '').replace(/\*\*/g,'').replace(/\s+/g,' ').trim();
export const hasText = d => plainText(d).length > 0;
/** Anteprima effetto: intero se corto, altrimenti taglio + puntini. */
export const effectPreview = (d, max = 72) => {
  const t = plainText(d);
  if (!t) return '';
  return t.length > max ? `${t.slice(0, Math.max(1, max - 1))}…` : t;
};
export const artHTML = d => d.image_url ? `<img src="${escape(d.image_url)}" alt="Illustrazione di ${escape(d.name)}">` : '<span class="game-card-art-placeholder">🎴</span>';
export const TEXT_ICON = '<span class="CLS" title="Questa carta ha un testo" aria-hidden="true">📜</span>';
export function cellHTML(d, c) {
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
export function handCardHTML(d) {
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
export function cardHTML(d, mini = false, cell = null) {
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
