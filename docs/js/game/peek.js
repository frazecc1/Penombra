// docs/js/game/peek.js — Guarda campo di battaglia (overlay peek)
export function clearBattlefieldPeek() {
  const chip = document.getElementById('game-dialog-restore');
  if (chip) chip.remove();
  document.querySelectorAll('.is-peeking').forEach((el) => el.classList.remove('is-peeking'));
  try { document.body.classList.remove('battlefield-peek'); } catch (_) {}
}

/** Nasconde temporaneamente un overlay a schermo intero per vedere (e toccare) la plancia. */
export function enterBattlefieldPeek(overlayEl) {
  if (!overlayEl) return;
  // Non chiamare clearBattlefieldPeek(): se c’era già un peek sotto (es. Ho capito),
  // resta nascosto; togliamo solo il chip vecchio.
  const oldChip = document.getElementById('game-dialog-restore');
  if (oldChip) oldChip.remove();
  overlayEl.classList.add('is-peeking');
  try { document.body.classList.add('battlefield-peek'); } catch (_) {}
  const chip = document.createElement('button');
  chip.id = 'game-dialog-restore';
  chip.type = 'button';
  chip.className = 'primary-button game-dialog-restore-chip';
  chip.textContent = 'Torna al messaggio';
  chip.addEventListener('click', (e) => {
    e.stopPropagation();
    // Esci dal peek di questo overlay; se ne restano altri is-peeking, tieni la modalità campo
    overlayEl.classList.remove('is-peeking');
    const still = document.querySelector('.is-peeking');
    const c = document.getElementById('game-dialog-restore');
    if (c) c.remove();
    if (!still) {
      try { document.body.classList.remove('battlefield-peek'); } catch (_) {}
    } else {
      // Ricrea chip per l’overlay ancora in peek
      enterBattlefieldPeek(still);
    }
  });
  document.body.appendChild(chip);
}

export function ensurePeekOnBar(actionsEl, overlayEl) {
  if (!actionsEl || !overlayEl) return;
  if (actionsEl.querySelector('[data-peek-btn]')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('data-peek-btn', '1');
  btn.className = 'secondary-button';
  btn.textContent = 'Guarda campo di battaglia';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    enterBattlefieldPeek(overlayEl);
  });
  actionsEl.appendChild(btn);
}
export function appendBattlefieldPeekButton(actionsEl, overlayEl) {
  ensurePeekOnBar(actionsEl, overlayEl);
}
