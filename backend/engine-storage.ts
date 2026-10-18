// engine-storage.ts — partite in memoria + catalogo carte da Supabase (fallback seed).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CardData, CardEffectJson, CardType, GameState, MatchLogEntry } from './types.js';
import { allSeedCards, seedCard } from './catalog-seed.js';
import { adaptAbilities } from './abilities-adapter.js';
import type { Ability } from './effect-types.js';

const matches = new Map<string, GameState>();
const logsByMatch = new Map<string, MatchLogEntry[]>();

/** Cache catalogo: id → CardData già adattata per il motore. */
const cardCache = new Map<string, CardData>();
const bossFlags = new Map<string, boolean>();
let catalogLoaded = false;
let catalogSource: 'supabase' | 'seed' | 'mixed' = 'seed';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

if (!supabase) {
  console.warn('[penombra] SUPABASE_* assenti: catalogo carte solo da seed in memoria.');
}

export const db = null as unknown as { from: (...args: never[]) => never };

// ---------------------------------------------------------------------------
// Catalogo carte
// ---------------------------------------------------------------------------

function seedToCardData(c: {
  id: string;
  name: string;
  faction_code: string;
  card_type: string;
  mana_cost: number;
  sacrifice_cost: number | null;
  attack: number | null;
  hp: number | null;
  rarity: string;
  effect_text: string | null;
  effect_json: CardEffectJson | null;
  effect_on_death_json: CardEffectJson | null;
  image_url: string | null;
}): CardData {
  return {
    id: c.id,
    name: c.name,
    faction_id: null,
    faction_code: c.faction_code,
    card_type: c.card_type as CardType,
    mana_cost: Number(c.mana_cost ?? 0),
    sacrifice_cost: Number(c.sacrifice_cost ?? 0),
    attack: c.attack,
    hp: c.hp,
    subtype: null,
    rarity: c.rarity || 'common',
    effect_text: c.effect_text,
    effect_json: c.effect_json,
    effect_on_death_json: c.effect_on_death_json,
    flavor_text: null,
    image_url: c.image_url,
    subtype_names: [],
  };
}


function forceDrawAnyPlayer(raw: CardEffectJson | null): CardEffectJson | null {
  if (!raw) return raw;
  const mapOne = (e: Record<string, unknown>) =>
    e && e.type === 'draw' ? { ...e, target: 'any_player' } : e;
  if (typeof raw === 'object' && raw !== null && 'effects' in raw && Array.isArray((raw as { effects: unknown }).effects)) {
    const r = raw as { effects: Record<string, unknown>[]; reaction_trigger?: unknown };
    return {
      ...r,
      effects: r.effects.map(mapOne),
    } as CardEffectJson;
  }
  if (typeof raw === 'object' && raw !== null && (raw as { type?: string }).type === 'draw') {
    return mapOne(raw as Record<string, unknown>) as CardEffectJson;
  }
  return raw;
}

/** Riga Supabase → CardData (abilities → effect_json via adapter). */
function rowToCardData(row: Record<string, unknown>): CardData {
  const cardType = String(row.card_type) as CardType;
  let effect_json = (row.effect_json as CardEffectJson | null) ?? null;
  let effect_on_death_json = (row.effect_on_death_json as CardEffectJson | null) ?? null;
  let effect_text = (row.effect_text as string | null) ?? null;

  const abilitiesRaw = row.abilities;
  if (abilitiesRaw && typeof abilitiesRaw === 'object') {
    const payload = abilitiesRaw as { abilities?: Ability[] };
    const list = Array.isArray(payload.abilities)
      ? payload.abilities
      : Array.isArray(abilitiesRaw)
        ? (abilitiesRaw as Ability[])
        : [];
    if (list.length) {
      const adapted = adaptAbilities(list, cardType);
      effect_json = adapted.effect_json as CardEffectJson | null;
      effect_on_death_json = adapted.effect_on_death_json as CardEffectJson | null;
    }
  }
  // Sicurezza: ogni draw deve essere any_player (scelta in partita)
  effect_json = forceDrawAnyPlayer(effect_json);
  effect_on_death_json = forceDrawAnyPlayer(effect_on_death_json);

  return {
    id: String(row.id),
    name: String(row.name ?? row.id),
    faction_id: row.faction_id == null ? null : Number(row.faction_id),
    faction_code: String(row.faction_code ?? ''),
    card_type: cardType,
    mana_cost: Number(row.mana_cost ?? 0),
    sacrifice_cost: Number(row.sacrifice_cost ?? 0),
    attack: row.attack == null ? null : Number(row.attack),
    hp: row.hp == null ? null : Number(row.hp),
    subtype: row.subtype == null ? null : String(row.subtype),
    rarity: String(row.rarity || 'common'),
    effect_text,
    effect_json,
    effect_on_death_json,
    flavor_text: row.flavor_text == null ? null : String(row.flavor_text),
    image_url: row.image_url == null ? null : String(row.image_url),
    subtype_names: Array.isArray(row.subtype_names)
      ? (row.subtype_names as string[])
      : [],
  };
}

/** Carica (una volta) tutte le carte enabled da Supabase; integra i seed mancanti. */
export async function ensureCatalog(): Promise<void> {
  if (catalogLoaded) return;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('enabled', true);
      if (error) throw error;
      if (data && data.length) {
        for (const row of data) {
          try {
            const card = rowToCardData(row as Record<string, unknown>);
            cardCache.set(card.id, card);
            bossFlags.set(card.id, (row as { is_boss?: boolean }).is_boss === true);
          } catch (e) {
            console.warn(`[penombra] carta ${ (row as { id?: string }).id } saltata:`, e);
          }
        }
        catalogSource = 'supabase';
        console.info(`[penombra] catalogo Supabase: ${cardCache.size} carte`);
      } else {
        console.warn('[penombra] tabella cards vuota: uso seed');
      }
    } catch (e) {
      console.warn('[penombra] lettura cards fallita, fallback seed:', e);
    }
  }

  // Se Supabase ha carte enabled → SOLO quelle (niente seed mescolato).
  // Seed solo se il catalogo è ancora vuoto (lab senza DB / tabella vuota).
  if (!cardCache.size) {
    for (const s of allSeedCards()) {
      cardCache.set(s.id, seedToCardData(s));
      bossFlags.set(s.id, s.is_boss === true);
    }
    catalogSource = 'seed';
    console.info('[penombra] catalogo: solo seed (Supabase vuoto o non configurato)');
  } else {
    // Mostrissimi: se non sono su Supabase, tieni solo quelli del seed (offerta separata).
    let extra = 0;
    for (const s of allSeedCards()) {
      if (s.card_type !== 'mostrissimo') continue;
      if (cardCache.has(s.id)) continue;
      cardCache.set(s.id, seedToCardData(s));
      bossFlags.set(s.id, s.is_boss === true);
      extra++;
    }
    if (extra) console.info(`[penombra] aggiunti ${extra} mostrissimi dal seed (non in Supabase)`);
  }

  catalogLoaded = true;
  console.info(`[penombra] catalogo pronto (${catalogSource}): ${cardCache.size} carte`);
}

/** Forza ricarica (es. dopo seed su Supabase). */
export async function reloadCatalog(): Promise<void> {
  cardCache.clear();
  catalogLoaded = false;
  await ensureCatalog();
}

export async function getCardData(cardId: string): Promise<CardData> {
  await ensureCatalog();
  const hit = cardCache.get(cardId);
  if (hit) return structuredClone(hit);

  // Ultimo tentativo: seed singolo (id nuovi non in cache)
  const s = seedCard(cardId);
  if (s) {
    const card = seedToCardData(s);
    cardCache.set(card.id, card);
    return structuredClone(card);
  }
  throw new Error(`Carta non trovata: ${cardId}`);
}

export type CatalogEntry = CardData & { is_boss: boolean };

/** Tutte le carte del catalogo (per mazzi / debug). */
export async function listCardData(): Promise<CatalogEntry[]> {
  await ensureCatalog();
  return [...cardCache.values()].map(c => ({
    ...structuredClone(c),
    is_boss: bossFlags.get(c.id) === true,
  }));
}

export function listCatalogForDebug() {
  return [...cardCache.values()].map(c => ({
    id: c.id,
    name: c.name,
    type: c.card_type,
    faction: c.faction_code,
  }));
}

export function getCatalogSource() {
  return catalogSource;
}

// ---------------------------------------------------------------------------
// Partite in memoria + persistenza Supabase (recupero spoglie)
// ---------------------------------------------------------------------------

/**
 * Schema atteso (SQL Editor Supabase):
 *
 * create table if not exists public.matches (
 *   id uuid primary key,
 *   player_id uuid not null,
 *   opponent_type text default 'ai',
 *   opponent_name text,
 *   status text not null default 'running',
 *   state_json jsonb not null,
 *   state_revision int not null default 0,
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 * create index if not exists matches_player_status on public.matches(player_id, status);
 *
 * RLS: service role only (il backend usa SUPABASE_SERVICE_KEY).
 */

function humanPlayerId(s: GameState): string | null {
  // In PvE l'umano è index 1; in PvP entrambi hanno user_id.
  const p1 = s.players?.[1]?.user_id;
  const p0 = s.players?.[0]?.user_id;
  if (p1) return p1;
  if (p0) return p0;
  return null;
}

function isMissingMatchesTable(message: string): boolean {
  const m = (message || '').toLowerCase();
  return (
    m.includes('schema cache') ||
    m.includes('does not exist') ||
    m.includes('could not find the table') ||
    m.includes('matches')
  );
}

/** Scrive (o aggiorna) lo stato su Supabase. Non blocca se la tabella manca. */
async function persistMatch(id: string, s: GameState): Promise<void> {
  if (!supabase) return;
  const playerId = humanPlayerId(s);
  if (!playerId) {
    console.warn('[penombra] persistMatch: nessun player_id, skip DB');
    return;
  }
  const isPvp = (s as GameState & { match_mode?: string }).match_mode === 'pvp';
  const row = {
    id,
    player_id: playerId,
    opponent_type: isPvp ? 'pvp' : 'ai',
    opponent_name: isPvp
      ? (s.players[0]?.user_id === playerId ? s.players[1]?.user_id : s.players[0]?.user_id) ?? null
      : 'Mummy',
    status: s.status ?? 'running',
    state_json: s,
    state_revision: s.state_revision ?? 0,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('matches').upsert(row, { onConflict: 'id' });
  if (error) {
    if (isMissingMatchesTable(error.message)) {
      console.warn('[penombra] tabella matches assente: partite solo in RAM (crea la tabella per recuperare le spoglie)');
      return;
    }
    console.error('[penombra] persistMatch fallito:', error.message);
  }
}

/** Carica stato da Supabase se non è in RAM. */
async function loadFromDb(id: string): Promise<GameState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('matches')
    .select('state_json, status, state_revision')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    if (isMissingMatchesTable(error.message)) {
      console.warn('[penombra] tabella matches assente: impossibile recuperare da DB');
      return null;
    }
    console.error('[penombra] loadFromDb:', error.message);
    return null;
  }
  if (!data?.state_json) return null;
  const s = data.state_json as GameState;
  if (s.state_version !== 4 || !s.board?.rows || !Array.isArray(s.work_queue)) {
    throw new Error('Partita non compatibile: avvia una nuova partita.');
  }
  // Allinea status se il DB ha un valore più recente
  if (data.status && s.status !== data.status) s.status = data.status as GameState['status'];
  return structuredClone(s);
}

export async function load(id: string): Promise<GameState> {
  let s = matches.get(id);
  if (!s) {
    const fromDb = await loadFromDb(id);
    if (fromDb) {
      matches.set(id, fromDb);
      if (!logsByMatch.has(id)) logsByMatch.set(id, []);
      s = fromDb;
      console.info(`[penombra] partita ${id.slice(0, 8)}… ripristinata da Supabase (rev ${fromDb.state_revision})`);
    }
  }
  if (!s) throw new Error(`Stato partita non trovato: ${id}`);
  if (s.state_version !== 4 || !s.board?.rows || !Array.isArray(s.work_queue))
    throw new Error('Partita non compatibile: avvia una nuova partita.');
  return structuredClone(s);
}

export async function commit(id: string, s: GameState, logs: MatchLogEntry[]): Promise<GameState> {
  const prev = matches.get(id);
  if (!prev) throw new Error(`Stato partita non trovato: ${id}`);
  if (prev.state_revision !== s.state_revision)
    throw new Error('Revisione dello stato non coerente (mossa concorrente)');
  const next: GameState = { ...structuredClone(s), state_revision: s.state_revision + 1 };
  matches.set(id, next);
  const bag = logsByMatch.get(id) ?? [];
  for (const entry of logs) {
    bag.push({
      ...entry,
      log_revision: next.state_revision,
    } as MatchLogEntry);
  }
  logsByMatch.set(id, bag);
  // Persistenza best-effort: non fallire la mossa se Supabase è lento/assente
  void persistMatch(id, next).catch(err => console.error('[penombra] commit persist:', err));
  return structuredClone(next);
}

export async function saveGameState(id: string, s: GameState): Promise<void> {
  const copy = structuredClone(s);
  matches.set(id, copy);
  if (!logsByMatch.has(id)) logsByMatch.set(id, []);
  // Alla creazione (e ai salvataggi diretti) aspettiamo la scrittura così
  // last_match_id punta già a uno stato recuperabile.
  await persistMatch(id, copy);
}

export async function logMatchAction(id: string, entry: MatchLogEntry): Promise<void> {
  const bag = logsByMatch.get(id) ?? [];
  bag.push({ ...entry });
  logsByMatch.set(id, bag);
}
