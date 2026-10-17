/**
 * effect-types.ts
 * Sistema abilità a 2 pezzi: Trigger + Effetto (libreria ridotta).
 *
 * Ogni abilità su una carta = { trigger_id, effect_id, amount?, target? }
 */

export type CardType =
  | 'monster'
  | 'mostrissimo'
  | 'maledizione'
  | 'instant' // Trappola
  | 'aura'
  | 'terraforma';

/** Bersagli ammessi nella libreria ridotta. */
export type TargetOption =
  | 'self'
  | 'opponent'
  | 'any_creature'
  | 'any_target' // in partita: scelta tra player avversario e creature legali
  | 'source_creature' // la creatura che ha generato l’abilità (ETB di sé)
  | 'enchanted_creature' // creatura a cui è attaccata l’Aura
  | 'triggering_creature'; // creatura che ha scatenato on_ally_enters

// ---------------------------------------------------------------------------
// Trigger (pezzo 1) — lista chiusa
// ---------------------------------------------------------------------------
export type TriggerId =
  | 'on_enter'
  | 'on_enchanted_attack'
  | 'on_death'
  | 'on_ally_enters'
  | 'on_opponent_turn_end';

export type TriggerDefinition = {
  id: TriggerId;
  name: string;
  description: string;
  allowed_card_types: CardType[];
  /** Se true, apre finestra di reazione (Trappole). */
  is_reaction: boolean;
};

// ---------------------------------------------------------------------------
// Effetti (pezzo 2) — lista chiusa
// ---------------------------------------------------------------------------
export type EffectId =
  | 'draw'
  | 'opponent_discard'
  | 'heal_self'
  | 'damage'
  | 'buff_creature';

export type EffectDefinitionAtomic = {
  id: EffectId;
  name: string;
  description: string;
  allowed_card_types: CardType[];
  /** amount sempre richiesto (1–20). */
  needs_amount: true;
  /**
   * Bersagli che l’autore può scegliere in editor.
   * Se vuoto, il target è fisso nell’effetto (es. heal_self → self).
   */
  possible_targets: TargetOption[];
  /** Se true, in partita può servire una scelta di bersaglio. */
  requires_target_choice: boolean;
};

// ---------------------------------------------------------------------------
// Istanza su carta (salvata in abilities jsonb)
// ---------------------------------------------------------------------------
export type Ability = {
  trigger_id: TriggerId;
  effect_id: EffectId;
  /** Quantità 1–20 (obbligatoria per tutti gli effetti attuali). */
  amount: number;
  /**
   * Obbligatorio se l’effetto non ha target fisso:
   * - draw → self | opponent
   * - damage → self | opponent | any_creature | any_target
   * - buff_creature → any_creature | source_creature | enchanted_creature | triggering_creature
   */
  target?: TargetOption;
};

export type CardAbilitiesPayload = {
  abilities: Ability[];
};

export type EffectLibrary = {
  triggers: Record<TriggerId, TriggerDefinition>;
  effects: Record<EffectId, EffectDefinitionAtomic>;
};
