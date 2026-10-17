/**
 * effect-library.ts
 * Libreria ridotta: 5 trigger + 5 effetti.
 * Fonte di verità per validazione e editor.
 */

import type {
  CardType,
  EffectDefinitionAtomic,
  EffectId,
  EffectLibrary,
  TriggerDefinition,
  TriggerId,
} from './effect-types.js';

// ---------------------------------------------------------------------------
// TRIGGER (5)
// ---------------------------------------------------------------------------
const TRIGGERS: Record<TriggerId, TriggerDefinition> = {
  on_enter: {
    id: 'on_enter',
    name: 'Quando questa carta entra in campo',
    description: 'Subito dopo che questa carta è fisicamente entrata in campo.',
    allowed_card_types: ['monster', 'mostrissimo', 'maledizione', 'aura', 'terraforma'],
    is_reaction: false,
  },

  on_enchanted_attack: {
    id: 'on_enchanted_attack',
    name: 'Quando la creatura incantata attacca',
    description: 'Scatta quando la creatura a cui è attaccata questa Aura dichiara un attacco.',
    allowed_card_types: ['aura'],
    is_reaction: false,
  },

  on_death: {
    id: 'on_death',
    name: 'Quando questa carta muore',
    description: 'Scatta quando questa carta viene distrutta o sacrificata.',
    allowed_card_types: ['monster', 'mostrissimo', 'terraforma'],
    is_reaction: false,
  },

  on_ally_enters: {
    id: 'on_ally_enters',
    name: 'Quando una creatura alleata entra in campo',
    description: 'Ogni volta che una creatura del proprietario (Mostro o Mostrissimo) entra in campo.',
    allowed_card_types: ['monster', 'mostrissimo', 'terraforma', 'aura'],
    is_reaction: false,
  },

  on_opponent_turn_end: {
    id: 'on_opponent_turn_end',
    name: 'A fine turno dell’avversario',
    description: 'Scatta nella finestra di fine turno dell’avversario (Trappola).',
    allowed_card_types: ['instant'],
    is_reaction: true,
  },
};

// ---------------------------------------------------------------------------
// EFFETTI (5)
// ---------------------------------------------------------------------------
const ALL_TYPES: CardType[] = [
  'monster',
  'mostrissimo',
  'maledizione',
  'instant',
  'aura',
  'terraforma',
];

const EFFECTS: Record<EffectId, EffectDefinitionAtomic> = {
  draw: {
    id: 'draw',
    name: 'Pesca',
    description: 'Il giocatore bersaglio pesca un numero di carte.',
    allowed_card_types: ALL_TYPES,
    needs_amount: true,
    possible_targets: ['self', 'opponent'],
    requires_target_choice: false,
  },

  opponent_discard: {
    id: 'opponent_discard',
    name: 'Avversario scarta',
    description: 'L’avversario scarta un numero di carte (a caso).',
    allowed_card_types: ALL_TYPES,
    needs_amount: true,
    possible_targets: [],
    requires_target_choice: false,
  },

  heal_self: {
    id: 'heal_self',
    name: 'Cura a te stesso',
    description: 'Ripristina punti vita al proprietario della carta.',
    allowed_card_types: ALL_TYPES,
    needs_amount: true,
    possible_targets: [],
    requires_target_choice: false,
  },

  damage: {
    id: 'damage',
    name: 'Danno a bersaglio',
    description:
      'Infligge danni a un giocatore (te o avversario) o a una creatura. Con any_target la scelta avviene in partita.',
    allowed_card_types: ALL_TYPES,
    needs_amount: true,
    possible_targets: ['self', 'opponent', 'any_creature', 'any_target'],
    requires_target_choice: true,
  },

  buff_creature: {
    id: 'buff_creature',
    name: '+X attacco e +X PV',
    description:
      'Aumenta di X sia l’attacco sia i PV massimi/correnti della stessa creatura bersaglio (un solo effetto, un solo bersaglio).',
    allowed_card_types: ['monster', 'mostrissimo', 'aura', 'terraforma', 'maledizione', 'instant'],
    needs_amount: true,
    possible_targets: [
      'any_creature',
      'source_creature',
      'enchanted_creature',
      'triggering_creature',
    ],
    requires_target_choice: true,
  },
};

// ---------------------------------------------------------------------------
export const EFFECT_LIBRARY: EffectLibrary = {
  triggers: TRIGGERS,
  effects: EFFECTS,
};

export function getTrigger(id: string): TriggerDefinition | undefined {
  return EFFECT_LIBRARY.triggers[id as TriggerId];
}

export function getEffect(id: string): EffectDefinitionAtomic | undefined {
  return EFFECT_LIBRARY.effects[id as EffectId];
}

export function triggersForCardType(cardType: CardType): TriggerDefinition[] {
  return Object.values(EFFECT_LIBRARY.triggers).filter((t) =>
    t.allowed_card_types.includes(cardType),
  );
}

export function effectsForCardType(cardType: CardType): EffectDefinitionAtomic[] {
  return Object.values(EFFECT_LIBRARY.effects).filter((e) =>
    e.allowed_card_types.includes(cardType),
  );
}

/** Validazione di una singola abilità (messaggi in italiano). */
export function abilityErrors(
  ability: { trigger_id?: string; effect_id?: string; amount?: number; target?: string },
  cardType: CardType,
): string[] {
  const out: string[] = [];
  const trigger = getTrigger(String(ability.trigger_id ?? ''));
  const effect = getEffect(String(ability.effect_id ?? ''));

  if (!trigger) out.push(`Trigger sconosciuto: ${ability.trigger_id}`);
  else if (!trigger.allowed_card_types.includes(cardType))
    out.push(`Trigger «${trigger.name}» non ammesso su ${cardType}.`);

  if (!effect) out.push(`Effetto sconosciuto: ${ability.effect_id}`);
  else if (!effect.allowed_card_types.includes(cardType))
    out.push(`Effetto «${effect.name}» non ammesso su ${cardType}.`);

  const amount = ability.amount;
  if (!Number.isInteger(amount) || (amount as number) < 1 || (amount as number) > 20)
    out.push('Quantità: intero tra 1 e 20.');

  if (effect && effect.possible_targets.length > 0) {
    const t = ability.target;
    if (!t || !effect.possible_targets.includes(t as never))
      out.push(
        `Bersaglio obbligatorio per «${effect.name}»: ${effect.possible_targets.join(' | ')}.`,
      );
  }

  return out;
}
