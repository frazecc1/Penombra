// docs/js/game/storage.js — localStorage penombra: (+ migrazione bellum: una tantum)
export function lsGet(key) {
  try {
    const v = localStorage.getItem(key);
    if (v != null) return v;
    if (key.startsWith('penombra:')) {
      const legacy = 'bellum:' + key.slice('penombra:'.length);
      const old = localStorage.getItem(legacy);
      if (old != null) {
        try { localStorage.setItem(key, old); localStorage.removeItem(legacy); } catch (_) {}
        return old;
      }
    }
    return null;
  } catch (_) {
    return null;
  }
}

export function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}

export function lsRemove(key) {
  try {
    localStorage.removeItem(key);
    if (key.startsWith('penombra:')) localStorage.removeItem('bellum:' + key.slice('penombra:'.length));
  } catch (_) {}
}
