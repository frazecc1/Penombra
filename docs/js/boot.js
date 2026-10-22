/**
 * Boot obbligatorio: precache asset critici + barra di avanzamento.
 * Non scarica le tracce Egipt (pesanti); solo musica base + UI partita base.
 */
const BOOT = {
  images: [
    'img/UI/HOME/login-mummy-phone.webp',
    'img/UI/HOME/piramide-storia.webp',
    'img/UI/HOME/piramide-endless.webp',
    'img/UI/HOME/piramide-pvp.webp',
    'img/UI/HOME/piramide-base.webp',
    'img/UI/HOME/piramide1.webp', // fallback legacy
    'img/UI/CARTE/dorso.webp',
    'img/png/domanda/domanda.webp',
    'img/png/missing/missing.webp',
    'apple-touch-icon.png',
  ],
  audio: [
    'musics/base.mp3',
    'musics/egiziana.mp3', // fallback se base non ancora pushato
  ],
};

function $(id) { return document.getElementById(id); }

function setProgress(done, total, label) {
  const pct = total ? Math.round((done / total) * 100) : 100;
  const fill = $('boot-bar-fill');
  const pctEl = $('boot-pct');
  const st = $('boot-status');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (st && label) st.textContent = label;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve({ src, ok: img.naturalWidth > 0 });
    img.onload = done;
    img.onerror = () => resolve({ src, ok: false });
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
      a.removeAttribute('src');
      try { a.load(); } catch (_) { /* ignore */ }
      resolve({ src, ok });
    };
    a.preload = 'auto';
    a.oncanplaythrough = () => finish(true);
    a.onloadeddata = () => finish(true);
    a.onerror = () => finish(false);
    // timeout: non bloccare il boot se la rete è lenta su un singolo file
    setTimeout(() => finish(false), 20000);
    a.src = src;
    try { a.load(); } catch (_) { finish(false); }
  });
}

async function runBoot() {
  const screen = $('boot-screen');
  const tasks = [
    ...BOOT.images.map((src) => ({ type: 'image', src })),
    ...BOOT.audio.map((src) => ({ type: 'audio', src })),
  ];
  const total = tasks.length;
  let done = 0;
  setProgress(0, total, 'Preparo la piramide…');

  // Sequenza a piccoli batch paralleli (3 alla volta) per non saturare la rete
  const concurrency = 3;
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    await Promise.all(batch.map(async (t) => {
      const label = t.type === 'audio' ? 'Musica…' : 'Immagini…';
      setProgress(done, total, label);
      if (t.type === 'image') await loadImage(t.src);
      else await loadAudio(t.src);
      done += 1;
      setProgress(done, total, label);
    }));
  }

  setProgress(total, total, 'Pronto.');
  // Preferisci base.mp3 sull’elemento audio se è arrivato
  const audioEl = $('bg-music');
  if (audioEl) {
    // Prova base; se 404 il browser userà già gestito da music.js
    if (!audioEl.getAttribute('data-boot-src')) {
      audioEl.setAttribute('data-boot-src', 'musics/base.mp3');
    }
  }

  document.documentElement.classList.add('boot-done');
  if (screen) {
    screen.classList.add('boot-screen-out');
    setTimeout(() => screen.remove(), 350);
  }
  window.dispatchEvent(new CustomEvent('penombra:boot-ready'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void runBoot(); });
} else {
  void runBoot();
}
