/**
 * Boot post-login: precache asset Partita base + messaggi a tema mummia.
 * NON parte all’apertura del sito: solo dopo «Accedi» / «Sono io».
 */
const BOOT_IMAGES = [
  'img/UI/HOME/login-mummy-phone.webp',
  'img/UI/HOME/piramide-storia.webp',
  'img/UI/HOME/piramide-endless.webp',
  'img/UI/HOME/piramide-pvp.webp',
  'img/UI/HOME/piramide-base.webp',
  'img/UI/CARTE/dorso.webp',
  'img/png/domanda/domanda.webp',
  'img/png/missing/missing.webp',
];
const BOOT_AUDIO = ['musics/base.mp3'];

const FUNNY_LINES = [
  'Collegando le bende…',
  'Rispolverando il regolamento…',
  'Mettendo in pausa il film «La Mummia»…',
  'Scuotendo la sabbia dalle scarpe…',
  'Allineando le piramidi…',
  'Contando le bende residue…',
  'Svegliando nomeavversario…',
  'Lucidando il sarcofago…',
  'Traducendo i geroglifici…',
  'Chiudendo la tomba a chiave…',
];

function $(id) { return document.getElementById(id); }

function funnyLine(i) {
  return FUNNY_LINES[i % FUNNY_LINES.length];
}

function setProgress(done, total, label) {
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 100;
  const fill = $('boot-bar-fill');
  const pctEl = $('boot-pct');
  const st = $('boot-status');
  const screen = $('boot-screen');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (st && label) st.textContent = label;
  if (screen) screen.setAttribute('aria-valuenow', String(pct));
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

function loadAudio(src) {
  return new Promise((resolve) => {
    const a = new Audio();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      try { a.removeAttribute('src'); a.load(); } catch (_) { /* ignore */ }
      resolve(ok);
    };
    a.preload = 'auto';
    a.oncanplaythrough = () => finish(true);
    a.onloadeddata = () => finish(true);
    a.onerror = () => finish(false);
    setTimeout(() => finish(false), 15000);
    a.src = src;
    try { a.load(); } catch (_) { finish(false); }
  });
}

function showBootScreen() {
  const screen = $('boot-screen');
  if (!screen) return;
  screen.classList.remove('boot-screen-out', 'boot-screen-hidden');
  screen.style.display = 'flex';
  setProgress(0, 1, funnyLine(0));
}

function hideBootScreen() {
  const screen = $('boot-screen');
  if (!screen) return;
  screen.classList.add('boot-screen-out');
  setTimeout(() => {
    screen.style.display = 'none';
    screen.classList.add('boot-screen-hidden');
  }, 320);
}

/** Overlay riusabile (recupero spoglie, ecc.) */
export function showLoadOverlay(title = 'Un attimo…') {
  let el = $('penombra-load-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'penombra-load-overlay';
    el.innerHTML = `
      <div class="boot-panel">
        <p class="boot-title">Penombra</p>
        <p class="boot-status" id="load-overlay-status"></p>
        <div class="boot-bar"><div id="load-overlay-fill" style="width:15%"></div></div>
      </div>`;
    el.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 30%, #2e1f11 0%, #0b0806 84%);color:#efe2c0;font-family:system-ui,sans-serif';
    document.body.append(el);
  }
  const st = el.querySelector('#load-overlay-status');
  if (st) st.textContent = title;
  el.style.display = 'flex';
  let i = 0;
  const fill = el.querySelector('#load-overlay-fill');
  const timer = setInterval(() => {
    i += 1;
    if (st) st.textContent = funnyLine(i);
    if (fill) fill.style.width = Math.min(90, 15 + i * 7) + '%';
  }, 900);
  el._timer = timer;
  return el;
}

export function hideLoadOverlay() {
  const el = $('penombra-load-overlay');
  if (!el) return;
  if (el._timer) clearInterval(el._timer);
  el.style.display = 'none';
}

export async function runBoot() {
  showBootScreen();
  const tasks = [
    ...BOOT_IMAGES.map((src) => ({ type: 'image', src })),
    ...BOOT_AUDIO.map((src) => ({ type: 'audio', src })),
  ];
  const total = tasks.length;
  let done = 0;
  const concurrency = 3;
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    await Promise.all(batch.map(async (t) => {
      setProgress(done, total, funnyLine(done));
      if (t.type === 'image') await loadImage(t.src);
      else await loadAudio(t.src);
      done += 1;
      setProgress(done, total, funnyLine(done));
    }));
  }
  setProgress(total, total, 'Bende in ordine. Avanti!');
  await new Promise((r) => setTimeout(r, 280));
  hideBootScreen();
  window.dispatchEvent(new CustomEvent('penombra:boot-ready'));
}

// Esposto per auth.js (senza import circolari con game.js)
window.__penombraRunBoot = runBoot;
window.__penombraShowLoad = showLoadOverlay;
window.__penombraHideLoad = hideLoadOverlay;
