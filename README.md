# Penombra

Gioco di carte a turni ambientato nella penombra.  
Repository del lab **Partita base**: frontend statico (GitHub Pages) + API Node su Render + catalogo carte su Supabase.

---

## Cosa fa il progetto

- **Partita base (PvE vs IA)** — scegli tre colori, moneta del destino, camera di dialogo, poi partita sulla griglia 3×3.
- **Carte su Supabase** — il catalogo non è più solo seed locale: le carte `lab-*` vivono nel database.
- **Abilità a 2 pezzi** — ogni effetto è `trigger` + `effetto` (es. *quando entra* + *un giocatore pesca*).
- **Auth** — login tramite Supabase (sessione browser).

Modalità Storia / Endless / PvP esistono nel codice ma in questo lab sono disattivate o secondarie.

---

## Architettura in una riga

```
Browser (docs/)  →  API Render (backend/)  →  Supabase (auth + tabella cards)
                         ↓
                   Motore di gioco in memoria
```

| Pezzo | Tecnologia | Ruolo |
|-------|------------|--------|
| Frontend | HTML / CSS / JS (ES modules) | UI, griglia, popup, chiamate API |
| Backend | Node.js + Express + TypeScript | Regole, turni, IA, mazzi |
| Dati | Supabase Postgres | Catalogo `cards`, autenticazione |
| Hosting FE | GitHub Pages (`docs/`) | Sito pubblico |
| Hosting BE | Render | `penombra-api` |

Documento completo: **[docs/ARCHITETTURA.md](docs/ARCHITETTURA.md)** (o `ARCHITETTURA.md` in root se preferisci).

---

## Struttura del repo

```
Penombra/
├── backend/                 # API e motore
│   ├── server.ts            # Express, health, porta
│   ├── api.ts               # Route /match, /cards, auth
│   ├── engine-core.ts       # Turni, effetti, IA, fine partita
│   ├── engine-board.ts      # Plancia, bersagli, utilità pure
│   ├── engine-deck.ts       # Mazzi a 3 colori, giocabilità
│   ├── engine-storage.ts    # Catalogo Supabase + partite in RAM
│   ├── abilities-adapter.ts # abilities[] → effect_json motore
│   ├── effect-library.ts    # Libreria trigger/effetti (ridotta)
│   ├── effect-types.ts      # Tipi Ability / Trigger / Effect
│   ├── card-rules.ts        # Validazione carte
│   ├── catalog-seed.ts      # Fallback se Supabase è vuoto
│   ├── types.ts             # Contratto stato partita v4
│   └── lobby.ts             # Lobby PvP (se attivo)
└── docs/                    # Frontend GitHub Pages
    ├── index.html
    ├── css/
    ├── js/
    │   ├── game.js          # Client partita
    │   ├── auth.js          # Login Supabase
    │   └── config.js        # URL API
    ├── img/
    └── musics/
```

---

## Avvio locale (backend)

```bash
cd backend
cp .env.example .env   # compila SUPABASE_URL, SUPABASE_SERVICE_KEY, PORT
npm install
npm run dev            # o build + start secondo package.json
```

Variabili essenziali:

| Variabile | Uso |
|-----------|-----|
| `SUPABASE_URL` | Progetto Supabase |
| `SUPABASE_SERVICE_KEY` | Service role (solo server) |
| `PORT` | Default `3000` |

Frontend: apri `docs/` con un server statico oppure punta GitHub Pages; in `docs/js/config.js` imposta l’URL dell’API.

---

## Catalogo carte

1. Tabella Supabase `public.cards` (colonne: `id`, `name`, `card_type`, `faction_code`, `mana_cost`, `attack`, `hp`, `abilities` jsonb, `enabled`, …).
2. All’avvio il backend carica le carte `enabled = true`, adatta `abilities` → `effect_json`, tiene cache in memoria.
3. Se Supabase è vuoto o non configurato → fallback `catalog-seed.ts`.

### Abilità (modello a 2 pezzi)

```json
{
  "abilities": [
    {
      "trigger_id": "on_enter",
      "effect_id": "draw",
      "amount": 1
    }
  ]
}
```

**Trigger (lab):** `on_enter` · `on_enchanted_attack` · `on_death` · `on_ally_enters` · `on_opponent_turn_end`  

**Effetti (lab):** `draw` · `opponent_discard` · `heal_self` · `damage` · `buff_creature`  

**Pesca:** in partita scegli sempre chi pesca (Tu / avversario) — `target: any_player`.

**Colori / fazioni:** CHI (cura) · INF (pesca) · PES (scarto) · BUL (danno) · GRO (buff +X/+X) · CLO (giallo, tutte le varianti).

---

## Flusso Partita base

1. Login  
2. Scelta tre colori (primario / secondario / terziario)  
3. Moneta del destino (chi inizia)  
4. Camera di dialogo (placeholder)  
5. Partita: griglia 3×3, mana, mano, trappole, fine partita  

Stato partita **in memoria + Supabase** (`matches.state_json`).  
Su Render Free la RAM si azzera al sleep, ma le partite non terminate si recuperano da DB («RIPRENDI le tue spoglie»).

---

## Health check

```text
GET /health
→ { ok, service, mode, catalog, build }
```

`catalog`: `supabase` | `seed` | `mixed`  
`build`: etichetta deploy (es. `v6-match-persist`)

---


---

## Recupero partite («le spoglie»)

1. Alla creazione e a ogni mossa lo stato completo viene scritto in `public.matches` (colonna `state_json`).
2. Il profilo utente tiene `last_match_id`.
3. All’apertura del sito il client chiama `/me/profile` e prova `GET /match/:id`.
4. Se il server ha perso la RAM (cold start), `load()` ripristina lo stato da Supabase.

### SQL da eseguire una volta (SQL Editor Supabase)

```sql
create table if not exists public.matches (
  id uuid primary key,
  player_id uuid not null,
  opponent_type text default 'ai',
  opponent_name text,
  status text not null default 'running',
  state_json jsonb not null,
  state_revision int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists matches_player_status on public.matches(player_id, status);
```

Il backend usa la **service role**: non serve RLS per il lab (o disabilita RLS su `matches`).

Senza questa tabella il gioco funziona ancora, ma le spoglie restano solo in RAM (comportamento precedente).

## Deploy

| Componente | Dove | Note |
|------------|------|------|
| Frontend | push su `main` → GitHub Pages da `/docs` | Dopo cambi a `game.js`, alza `?v=` in `index.html` |
| Backend | Render (root `backend/` o comando da `package.json`) | Env Supabase; restart dopo deploy catalogo |
| Carte | SQL Editor Supabase | Seed / fix script |

---

## Debug rapido (F12)

Con frontend aggiornato:

```js
window.__penombraDebug?.version
window.__penombraDebug?.hasDrawUi()
await window.__penombraDebug?.card('lab-inf-m2')
window.__penombraDebug?.pendingTarget()
```

Health API:

```js
fetch('https://penombra-api.onrender.com/health').then(r => r.json()).then(console.log)
```

---

## Licenza / autori

Progetto personale / lab di sviluppo.  
Motore e client derivati dall’ecosistema Bellum Penumbrum, adattati a Penombra.
