## Note v8 (dialog visibile)

* `#start-dialog` montato su `document.body` con `z-index:500` (prima era dentro `#stage`, coperta dalla Home).
* `showStart()` nasconde la Home mentre il dialog è aperto.
* Click piramide / login → dialog «RIPRENDI» finalmente visibile.



# Penombra

Gioco di carte a turni ambientato nella penombra.  
Repository del lab **Partita base**: frontend statico (GitHub Pages) + API Node su Render + catalogo carte su Supabase.

\---



## Changelog lab recente

- **v29** — Schermata di **boot obbligatoria** con barra: precache immagini UI + `musics/base.mp3`. Path piramidi: `piramide-storia/endless/pvp/base.webp`.


- **v28** — Path asset aggiornati (WebP): login/piramidi/dorso; avversario Partita base = `img/png/domanda/domanda.webp`; apple-touch-icon.png.


- **v26** — Spoglie/piramide più reattive: dialog subito («Cerco…»), probe in background dopo «Sono io», cache token/profilo.


- **v24** — Partita base: placeholder **nomeavversario**; `showOpponentDialog` / `showOpponentAngryDialog` (ex Mummy).


- **v23** — Finestra Trappola solo in **dettaglio grande** (Conferma Trappola / Annulla=Passa); eliminato il popup compatto.


* **v22** — HUD nome IA/giocatore a **2 righe fisse** (niente saltello); carta dettaglio al centro **più grande**.



* **v21** — Colonne laterali simmetriche (grid 1fr/auto/1fr); niente «Anteprima carta»; popup senza scroll; griglia bloccata (niente saltello all’ingresso carte).



* **v20** — Layout stabile: colonna centrale fissa al centro; colonne laterali simmetriche; carte grandi in trappole/dialoghi; meno saltelli di scala.



* **v19** — Dialog unificati (stile dettaglio carta); Sacrifici/Ingresso rispettano **Auto Ho capito**.



* **v18** — Istruzioni sacrificio in popup «Ho capito» (niente banner sulle stats); durante i sacrifici restano visibili gli altri Mostrissimi in offerta.



* **v17** — Fase «dove entra»: messaggio *Ora seleziona dove vuoi evocare la creatura* + **Ho capito** (niente overlay fisso sulla griglia).



* **v16** — Fix cella ingresso Mostrissimo; popup centrati; banner istruzioni sacrifici Y/X leggibile.



* **v15** — Sacrifici Mostrissimo sulla **griglia**: tap sul permanente; se ha aura, scegli mostro o aura. Niente lista a schermo.



* **v14** — UX sacrifici Mostrissimo: lista a schermo (colonna centrale), barra ✦, pausa in risoluzione, conferma cella di ingresso.



* **v13** — Anche le creature **in campo** che possono muovere/attaccare hanno il bordo arcobaleno (`.can-act`).



* **v12** — Evidenza giocabile/selezionabile: bordo **arcobaleno** (colori fazioni) su mano, Mostrissimi e celle.



* **v11b** — SQL Mostrissimi: constraint `faction\_code` allargato a **IND** (fixava l’insert).



* **v10** — Attacco: Terraforma attaccabile blocca l’attacco diretto; con un solo bersaglio, conferma automatica («Sei sicuro di voler attaccare questa carta?»).



* **v9** — Pesca a mazzo vuoto: **1 danno** per ogni carta tentata (prima erano 2).
* **v7** — Il dialog «RIPRENDI le tue spoglie» esce **solo** dopo il click sulla piramide «Partita base» (non più automatico al login).

## Cosa fa il progetto

* **Partita base (PvE vs IA)** — scegli tre colori, moneta del destino, camera di dialogo, poi partita sulla griglia 3×3.
* **Carte su Supabase** — il catalogo non è più solo seed locale: le carte `lab-\*` vivono nel database.
* **Abilità a 2 pezzi** — ogni effetto è `trigger` + `effetto` (es. *quando entra* + *un giocatore pesca*).
* **Auth** — login tramite Supabase (sessione browser).

Modalità Storia / Endless / PvP esistono nel codice ma in questo lab sono disattivate o secondarie.

\---

## Architettura in una riga

```
Browser (docs/)  →  API Render (backend/)  →  Supabase (auth + tabella cards)
                         ↓
                   Motore di gioco in memoria
```

|Pezzo|Tecnologia|Ruolo|
|-|-|-|
|Frontend|HTML / CSS / JS (ES modules)|UI, griglia, popup, chiamate API|
|Backend|Node.js + Express + TypeScript|Regole, turni, IA, mazzi|
|Dati|Supabase Postgres|Catalogo `cards`, autenticazione|
|Hosting FE|GitHub Pages (`docs/`)|Sito pubblico|
|Hosting BE|Render|`penombra-api`|

Documento completo: [**docs/ARCHITETTURA.md**](docs/ARCHITETTURA.md) (o `ARCHITETTURA.md` in root se preferisci).

\---

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
│   ├── abilities-adapter.ts # abilities\[] → effect\_json motore
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

\---

## Avvio locale (backend)

```bash
cd backend
cp .env.example .env   # compila SUPABASE\_URL, SUPABASE\_SERVICE\_KEY, PORT
npm install
npm run dev            # o build + start secondo package.json
```

Variabili essenziali:

|Variabile|Uso|
|-|-|
|`SUPABASE\_URL`|Progetto Supabase|
|`SUPABASE\_SERVICE\_KEY`|Service role (solo server)|
|`PORT`|Default `3000`|

Frontend: apri `docs/` con un server statico oppure punta GitHub Pages; in `docs/js/config.js` imposta l’URL dell’API.

\---

## Catalogo carte

1. Tabella Supabase `public.cards` (colonne: `id`, `name`, `card\_type`, `faction\_code`, `mana\_cost`, `attack`, `hp`, `abilities` jsonb, `enabled`, …).
2. All’avvio il backend carica le carte `enabled = true`, adatta `abilities` → `effect\_json`, tiene cache in memoria.
3. Se Supabase è vuoto o non configurato → fallback `catalog-seed.ts`.

### Abilità (modello a 2 pezzi)

```json
{
  "abilities": \[
    {
      "trigger\_id": "on\_enter",
      "effect\_id": "draw",
      "amount": 1
    }
  ]
}
```

**Trigger (lab):** `on\_enter` · `on\_enchanted\_attack` · `on\_death` · `on\_ally\_enters` · `on\_opponent\_turn\_end`

**Effetti (lab):** `draw` · `opponent\_discard` · `heal\_self` · `damage` · `buff\_creature`

**Pesca:** in partita scegli sempre chi pesca (Tu / avversario) — `target: any\_player`.

**Colori / fazioni:** CHI (cura) · INF (pesca) · PES (scarto) · BUL (danno) · GRO (buff +X/+X) · CLO (giallo, tutte le varianti).

\---

## Flusso Partita base

1. Login
2. Scelta tre colori (primario / secondario / terziario)
3. Moneta del destino (chi inizia)
4. Camera di dialogo (placeholder)
5. Partita: griglia 3×3, mana, mano, trappole, fine partita

Stato partita **in memoria + Supabase** (`matches.state\_json`).  
Su Render Free la RAM si azzera al sleep, ma le partite non terminate si recuperano da DB («RIPRENDI le tue spoglie»).

\---

## Health check

```text
GET /health
→ { ok, service, mode, catalog, build }
```

`catalog`: `supabase` | `seed` | `mixed`  
`build`: etichetta deploy (es. `v8-start-dialog-body`)

\---



\---

## Recupero partite («le spoglie»)

1. Alla creazione e a ogni mossa lo stato completo viene scritto in `public.matches` (colonna `state\_json`).
2. Il profilo utente tiene `last\_match\_id`.
3. Al click sulla piramide «Partita base» il client chiama `/me/profile` e prova `GET /match/:id` (il dialog non si apre da solo al login).
4. Se il server ha perso la RAM (cold start), `load()` ripristina lo stato da Supabase.

### SQL da eseguire una volta (SQL Editor Supabase)

```sql
create table if not exists public.matches (
  id uuid primary key,
  player\_id uuid not null,
  opponent\_type text default 'ai',
  opponent\_name text,
  status text not null default 'running',
  state\_json jsonb not null,
  state\_revision int not null default 0,
  created\_at timestamptz default now(),
  updated\_at timestamptz default now()
);
create index if not exists matches\_player\_status on public.matches(player\_id, status);
```

Il backend usa la **service role**: non serve RLS per il lab (o disabilita RLS su `matches`).

Senza questa tabella il gioco funziona ancora, ma le spoglie restano solo in RAM (comportamento precedente).



\---

## Note v7 (UI recupero)

* Click su **Partita base** → sempre `startScreen()` (probe `last\_match\_id` + dialog RIPRENDI).
* Dopo «Sono io» / login → `startScreen()` anche se non c’è partita da riprendere.
* Persistenza DB: ancora richiede deploy di `backend/engine-storage.ts` + tabella `matches` (vedi sopra). Senza quello, RIPRENDI funziona solo finché Render tiene la partita in RAM.

## Deploy

|Componente|Dove|Note|
|-|-|-|
|Frontend|push su `main` → GitHub Pages da `/docs`|Dopo cambi a `game.js`, alza `?v=` in `index.html`|
|Backend|Render (root `backend/` o comando da `package.json`)|Env Supabase; restart dopo deploy catalogo|
|Carte|SQL Editor Supabase|Seed / fix script|

\---

## Debug rapido (F12)

Con frontend aggiornato:

```js
window.\_\_penombraDebug?.version
window.\_\_penombraDebug?.hasDrawUi()
await window.\_\_penombraDebug?.card('lab-inf-m2')
window.\_\_penombraDebug?.pendingTarget()
```

Health API:

```js
fetch('https://penombra-api.onrender.com/health').then(r => r.json()).then(console.log)
```

\---

## Licenza e autori

Progetto personale / lab di sviluppo.  
Motore e client derivati dall’ecosistema Bellum Penumbrum, adattati a Penombra.

