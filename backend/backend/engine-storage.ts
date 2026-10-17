// engine-storage.ts — Penombra lab: catalogo seed + store partite in memoria.
// Non richiede Supabase per lo stato partita (utile finché non configuri il DB).
import type { CardData, GameState, MatchLogEntry } from './types.js';
import { allSeedCards, seedCard } from './catalog-seed.js';

const matches = new Map<string, GameState>();
const logsByMatch = new Map<string, MatchLogEntry[]>();

export const db = null as unknown as { from: (...args: never[]) => never };

export async function load(id: string): Promise<GameState> {
  const s = matches.get(id);
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
  return structuredClone(next);
}

export async function saveGameState(id: string, s: GameState): Promise<void> {
  matches.set(id, structuredClone(s));
  if (!logsByMatch.has(id)) logsByMatch.set(id, []);
}

export async function getCardData(cardId: string): Promise<CardData> {
  const c = seedCard(cardId);
  if (!c) throw new Error(`Carta non trovata: ${cardId}`);
  return {
    id: c.id,
    name: c.name,
    faction_id: null,
    faction_code: c.faction_code,
    card_type: c.card_type,
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

export async function logMatchAction(id: string, entry: MatchLogEntry): Promise<void> {
  const bag = logsByMatch.get(id) ?? [];
  bag.push({ ...entry });
  logsByMatch.set(id, bag);
}

export function listCatalogForDebug() {
  return allSeedCards().map(c => ({ id: c.id, name: c.name, type: c.card_type, faction: c.faction_code }));
}
