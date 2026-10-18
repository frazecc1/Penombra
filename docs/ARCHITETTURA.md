# Penombra — documento di accompagnamento

Spiega **come è fatto il sito nel suo intero**: pezzi, responsabilità, flussi e dove mettere le mani.

---

## 1. Panoramica

Penombra è un **gioco di carte a turni** con:

- interfaccia web (browser),
- regole e IA sul server,
- carte e login su Supabase.

Il lab attuale punta sulla **Partita base** (umano vs IA “Mummy”), con griglia 3×3, mana crescente, mostri, trappole, aure, terraforme e maledizioni.

```
┌─────────────┐     HTTPS      ┌──────────────────┐     SQL/Auth     ┌──────────┐
│  Browser    │ ─────────────► │  API (Render)    │ ───────────────► │ Supabase │
│  docs/      │ ◄───────────── │  engine + storage│ ◄─────────────── │ cards +  │
│  game.js    │   JSON stato   │  partite in RAM  │                  │ utenti   │
└─────────────┘                └──────────────────┘                  └──────────┘
```

---

## 2. Frontend (`docs/`)

### 2.1 Ruolo

- Schermate: login, home, scelta colori, partita.
- Disegna griglia, mano, vita, log.
- Invia azioni (`play-card`, `attack`, `end-turn`, `trap/choice`, `death/target`, …).
- Mostra popup di fase, moneta, camera di dialogo, scelta pesca, fine partita.

**Non** calcola le regole di gioco: si fida dello `state` restituito dall’API.

### 2.2 File principali

| File | Contenuto |
|------|-----------|
| `index.html` | Struttura DOM, script `type="module"` |
| `js/config.js` | `API` = URL Render |
| `js/auth.js` | Sessione Supabase client (anon key) |
| `js/game.js` | Tutta la logica UI partita |
| `css/` | Stili, tema “penombra / deserto” |
| `img/`, `musics/` | Asset |

Dopo modifiche a `game.js`, conviene cambiare la query `?v=N` in `index.html` per evitare cache del browser.

### 2.3 Flusso UI Partita base

1. **Auth** — token Bearer su ogni `fetch` all’API.  
2. **Home** — avvio partita base (piramide / bottone).  
3. **Colori** — primario, secondario, terziario (fazioni).  
4. **Moneta** — animazione chi inizia (il server ha già scelto `active_player_index`).  
5. **Camera di dialogo** — placeholder; al “Comprendo” si sblocca la plancia.  
6. **Partita** — `render()` da `state`; azioni solo se sei il giocatore attivo e non c’è una scelta obbligatoria.  
7. **Presentazione** — `public_announcement` / fasi; `/advance` consuma i checkpoint.  
8. **Fine** — popup vittoria/sconfitta → home (lab).

### 2.4 Scelte obbligatorie lato client

| Situazione | UI |
|------------|-----|
| Bersaglio creatura (buff, danno, …) | Celle evidenziate / conferma |
| Pesca `any_player` | Popup «Chi vuoi che peschi X carte?» → Tu / avversario |
| Trappola | Finestra reazione → passa o gioca |
| Ordine effetti a morte | Dialogo elenco |

Debug: `window.__penombraDebug` (versione, carta, `pendingTarget`).

---

## 3. Backend (`backend/`)

### 3.1 Layer

| Modulo | Responsabilità |
|--------|----------------|
| `server.ts` | HTTP, CORS, `/health`, preload catalogo |
| `api.ts` | Auth JWT Supabase, route REST, mapping errori |
| `engine-core.ts` | Motore: eventi, effetti, turni, IA, win |
| `engine-board.ts` | Plancia, adiacenze, `targeted` / `targetChoices` |
| `engine-deck.ts` | Pool carte, costruzione mazzo 3 colori, boss |
| `engine-storage.ts` | Catalogo Supabase + partite Map in RAM **e** persistenza su `matches.state_json` |
| `abilities-adapter.ts` | `abilities[]` → `effect_json` legacy |
| `effect-library.ts` | Definizioni trigger/effetti ammessi |
| `card-rules.ts` | Validazione statica carta |
| `types.ts` | `GameState` v4, tipi effetto, annunci |
| `catalog-seed.ts` | Fallback offline / mostrissimi lab |

### 3.2 Stato partita

- Versione contratto: **`state_version: 4`**.  
- Due giocatori: indice **0 = IA (o P2)**, indice **1 = umano (o P1)**.  
- Plancia `board.rows[3][3]`.  
- Code: `work_queue`, `pending_reaction`, `pending_target_choice`, `pending_death_order`.  
- Annunci pubblici per il client: `public_announcement` (+ lista se multipli).

**Persistenza:** memoria processo + tabella Supabase `matches` (`state_json`). Al cold start si ripristina da DB.

### 3.3 Ciclo di una mossa

1. Client `POST /match/:id/...` con token e spesso `expected` revision.  
2. `mutate` / handler carica stato, applica regola, esegue `drain` della coda.  
3. Se serve input umano (trappola, bersaglio, ordine morte) → si ferma con `pending_*`.  
4. Altrimenti continua fino a checkpoint presentabile o fine turno IA.  
5. Risposta: `{ state }` (e log se richiesti).

### 3.4 Effetti e abilità

**Autore carta (Supabase):**

```json
"abilities": [{ "trigger_id": "on_enter", "effect_id": "heal_self", "amount": 1 }]
```

**Adapter** produce ciò che il motore capisce da anni:

```json
"effect_json": {
  "effects": [{ "type": "heal", "amount": 1, "target": "self", "timing": "on_play" }]
}
```

| Trigger lab | Mapping motore |
|-------------|----------------|
| `on_enter` | `timing: on_play` |
| `on_death` | `effect_on_death_json` |
| `on_enchanted_attack` | `trigger: equipped_creature_attacks` |
| `on_ally_enters` | `trigger: own_monster_summoned` |
| `on_opponent_turn_end` | `reaction_trigger: opponent_turn_end` |

| Effect lab | Motore |
|------------|--------|
| `draw` | `type: draw`, `target: any_player` (scelta in partita) |
| `opponent_discard` | `discard` → avversario |
| `heal_self` | `heal` → self |
| `damage` | `damage` + target |
| `buff_creature` | `buff` con `stat: both` (+X/+X, un click) |

### 3.5 Mazzi

- Tre fazioni distinte: primario (include **un** boss mana 6), secondario, terziario.  
- Carte filtrate da `deckPlayable` / `engineErrors`.  
- Mostrissimi: offerta condivisa, non nel mazzo colore standard.

### 3.6 Fine partita

- Vita ≤ 0 → perdente.  
- Un solo vincitore se l’altro ha vita > 0.  
- Entrambi a 0 → due perdenti (`winner_index` null).  
- Client: messaggio e ritorno home (lab).

### 3.7 Recupero spoglie

1. `saveGameState` / `commit` scrivono `state_json` su `public.matches`.
2. `load(id)`: se non in Map → `SELECT state_json FROM matches WHERE id = $1` → rimette in RAM.
3. Profilo: `player_profiles.last_match_id` punta all’ultima partita aperta.
4. Client: dialog «RIPRENDI le tue spoglie» (`probePrior` / `recoverPrior` in `game.js`).

Senza tabella `matches` il backend logga un warning e resta in modalità solo-RAM (compatibile con il lab precedente).


---

## 4. Supabase

### 4.1 Auth

- Client: chiave **anon**, login email/magic o quanto configurato.  
- API: verifica JWT; header `Authorization: Bearer …`.  
- Opzionale: `X-Device-Id` per sessione unica dispositivo.

### 4.2 Tabella `cards` (concetto)

Campi usati dal lab:

- Identità: `id`, `name`, `card_type`, `faction_code`  
- Costo/stats: `mana_cost`, `sacrifice_cost`, `attack`, `hp`  
- Meta: `rarity`, `is_boss`, `effect_text`, `enabled`  
- Regole: **`abilities` jsonb** (fonte di verità lab)  
- Opzionali legacy: `effect_json`, `effect_on_death_json` (possono essere riallineati dall’adapter in lettura)

All’avvio: `SELECT * FROM cards WHERE enabled = true` → cache.  
`GET /cards/:id` serve la carta già adattata al motore.

### 4.3 Fazioni e serie lab

| Codice | Colore | Effetto tipico |
|--------|--------|----------------|
| CHI | Bianco | Cura a te |
| INF | Blu | Pesca (scelta giocatore) |
| PES | Nero | Avversario scarta |
| BUL | Rosso | Danno a bersaglio |
| GRO | Verde | +X/+X a una creatura |
| CLO | Giallo | Stesse carte, tutti gli effetti |

Slot tipici: mostri mana 1–6, trappola, aura, terraforma, maledizione.

---

## 5. API (sintesi)

| Metodo | Path | Uso |
|--------|------|-----|
| GET | `/health` | Stato servizio, `catalog`, `build` |
| POST | `/match/create` | Nuova partita base (colori) |
| GET | `/match/:id` | Stato |
| POST | `/match/:id/play-card` | Gioca dalla mano |
| POST | `/match/:id/attack` | Attacco |
| POST | `/match/:id/move` | Movimento |
| POST | `/match/:id/end-turn` | Fine turno umano |
| POST | `/match/:id/advance` | Consuma annuncio pubblico |
| POST | `/match/:id/trap/choice` | Passa / gioca trappola |
| POST | `/match/:id/death/target` | Bersaglio effetto (anche pesca) |
| GET | `/cards/:id` | Dati carta catalogo |

Dettaglio body e errori: vedere `api.ts`.

---

## 6. Deploy e ambienti

| Ambiente | Frontend | Backend | Dati |
|----------|----------|---------|------|
| Produzione lab | GitHub Pages | Render | Supabase progetto live |
| Locale | `docs/` + static server | `npm run dev` | Stesso Supabase o seed |

**Render Free:** spin-down → RAM azzerata → partite e cache catalogo da ricostruire al cold start (`ensureCatalog`).

---

## 7. Dove intervenire (mappa pratica)

| Vuoi… | Tocca… |
|-------|--------|
| Nuova carta | Riga in Supabase `cards` + eventuale seed SQL |
| Nuovo trigger/effetto | `effect-library.ts`, adapter, motore se serve codice nuovo |
| Cambiare bilanciamento stats | Supabase o script seed |
| Popup / UX | `docs/js/game.js` |
| Regola di combattimento | `engine-core.ts` / `engine-board.ts` |
| Costruzione mazzo | `engine-deck.ts` |
| Login / URL API | `auth.js`, `config.js`, env Render |

---

## 8. Limiti attuali del lab

- Partite persistenti su Supabase (`matches`); senza tabella si degrada a sola RAM.  
- Storia / Endless / PvP non sono il focus del lab (codice presente in parte).  
- Libreria effetti **ridotta** (5+5); niente destroy/return_hand/NOPE nel set lab minimo (il motore può ancora supportarne alcuni dal legacy).  
- `on_ally_enters` mappato su trigger mostro alleato (allineamento Mostrissimo da curare se serve).  
- Camera di dialogo e alcuni testi sono placeholder.

---

## 9. Glossario rapido

| Termine | Significato |
|---------|-------------|
| ETB | Effetto all’ingresso in campo (`on_enter` / `on_play`) |
| Trappola | Carta `instant`, reagisce a un evento (es. fine turno avversario) |
| Terraforma | Permanente di supporto in cella |
| Aura | Si attacca a una creatura |
| Maledizione | Incantesimo dalla mano in fase principale |
| Mostrissimo | Creatura potente via sacrifici, non nel mazzo colore base |
| `any_player` | Bersaglio pesca: scelta Tu / avversario in partita |

---

*Documento allineato al lab Penombra (catalogo Supabase, abilità a 2 pezzi, persistenza partite v6 + UI recupero v7).*
