# Penombra

Nuovo sito di sviluppo. Il gioco online funzionante resta il backup:

- Backup: https://github.com/frazecc/backup-bellum  
- Questo repo: https://github.com/frazecc1/Penombra/

## Obiettivo attuale (lab)

1. Login (UX come il backup, **nuovo** Supabase)
2. Home come il backup + **4ª piramide «Partita base»**
3. Partita base G1 umano / G2 IA (motore in arrivo nelle fasi successive della roadmap)

## Struttura

```
docs/          → frontend statico (GitHub Pages)
  js/config.js → API + Supabase (DA CONFIGURARE)
backend/       → API (ora solo /health; poi motore)
```

## Setup frontend

1. Copia questo contenuto nel repo GitHub `Penombra`.
2. Abilita **GitHub Pages** dalla cartella `docs/`.
3. Crea un **nuovo** progetto Supabase (Auth email/password).
4. Modifica `docs/js/config.js`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `API` (URL Render quando disponibile)
5. `SHOW_BASE_MATCH_PYRAMID = true` in lab; `false` in produzione.

## Setup backend (Fase 0)

```bash
cd backend
npm install
npm run dev
```

Poi deploy su Render e metti l’URL in `config.js`.

## Asset

Immagini login/piramidi già incluse sotto `docs/img/`.  
Musica opzionale: copia `docs/musics/egiziana.mp3` dal backup se vuoi l’audio.

## Roadmap

Vedi `PENOMBRA-ROADMAP.txt` nel workspace di sviluppo.  
Stato: **Fase 1–2 frontend avviata**; **Fase 0 backend = health stub**; **Fase 4 motore ancora da portare**.
