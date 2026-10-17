/**
 * abilities-adapter.ts
 * Traduce abilities[] (modello a 2 pezzi) nel formato effect_json / effect_on_death_json
 * che il motore attuale (engine-core) già risolve.
 *
 * Mapping trigger → motore:
 *   on_enter              → timing: on_play  (in effect_json)
 *   on_death              → effect_on_death_json
 *   on_enchanted_attack   → trigger: equipped_creature_attacks
 *   on_ally_enters        → trigger: own_monster_summoned
 *     (motore attuale: scatta su evocazione Mostro alleato; Mostrissimo da allineare dopo)
 *   on_opponent_turn_end  → reaction_trigger: opponent_turn_end
 *
 * Mapping effetti → tipo motore:
 *   draw              → { type: 'draw', target }
 *   opponent_discard  → { type: 'discard', target: 'opponent' }
 *   heal_self         → { type: 'heal', target: 'self' }
 *   damage            → { type: 'damage', target }
 *   buff_creature     → un buff permanent +X/+X (stat: 'both')
 */

import type { Ability, TargetOption } from './effect-types.js';
import { abilityErrors } from './effect-library.js';
import type { CardType } from './effect-types.js';

/** Forma legacy usata da types.ts / engine-core. */
type LegacyEffect = {
  type: string;
  amount?: number;
  target?: string;
  timing?: string;
  trigger?: string;
  stat?: 'attack' | 'hp';
  duration?: string;
};

type LegacyPayload = {
  effects: LegacyEffect[];
  reaction_trigger?: { event: string };
} | null;

export type AdaptedCardEffects = {
  effect_json: LegacyPayload;
  effect_on_death_json: LegacyPayload;
};

function mapTarget(t: TargetOption | undefined, fallback: string): string {
  return t ?? fallback;
}

/** Un effetto atomico → 1 o 2 entry legacy. */
function toLegacyEffects(ability: Ability): LegacyEffect[] {
  const n = ability.amount;
  switch (ability.effect_id) {
    case 'draw':
      return [{ type: 'draw', amount: n, target: mapTarget(ability.target, 'self') }];
    case 'opponent_discard':
      return [{ type: 'discard', amount: n, target: 'opponent' }];
    case 'heal_self':
      return [{ type: 'heal', amount: n, target: 'self' }];
    case 'damage':
      return [{ type: 'damage', amount: n, target: mapTarget(ability.target, 'opponent') }];
    case 'buff_creature': {
      const target = mapTarget(ability.target, 'any_creature');
      // Un solo effetto: +X attacco e +X PV sulla stessa creatura (un solo click bersaglio)
      return [
        { type: 'buff', amount: n, stat: 'both', duration: 'permanent', target },
      ];
    }
    default:
      return [];
  }
}

/**
 * Adatta la lista abilities al doppio campo legacy.
 * Lancia Error se una abilità non è valida per il tipo di carta.
 */
export function adaptAbilities(
  abilities: Ability[] | null | undefined,
  cardType: CardType,
): AdaptedCardEffects {
  const list = Array.isArray(abilities) ? abilities : [];
  const onPlay: LegacyEffect[] = [];
  const onDeath: LegacyEffect[] = [];
  let reactionEvent: string | undefined;

  for (const ability of list) {
    const errs = abilityErrors(ability, cardType);
    if (errs.length) throw new Error(errs.join(' '));

    const legacy = toLegacyEffects(ability);

    switch (ability.trigger_id) {
      case 'on_enter':
        for (const e of legacy) onPlay.push({ ...e, timing: 'on_play' });
        break;
      case 'on_death':
        for (const e of legacy) onDeath.push({ ...e });
        break;
      case 'on_enchanted_attack':
        for (const e of legacy) {
          // Motore: buff su attacco aura → enchanted_creature (o triggering)
          const patch =
            e.type === 'buff' && (e.target === 'any_creature' || e.target === 'triggering_creature')
              ? { ...e, trigger: 'equipped_creature_attacks', target: 'enchanted_creature' }
              : { ...e, trigger: 'equipped_creature_attacks' };
          onPlay.push(patch);
        }
        break;
      case 'on_ally_enters':
        for (const e of legacy) {
          // Motore terraforma: buff con trigger own_monster_summoned vuole triggering_creature
          const patch =
            e.type === 'buff'
              ? { ...e, trigger: 'own_monster_summoned', target: 'triggering_creature' }
              : { ...e, trigger: 'own_monster_summoned' };
          onPlay.push(patch);
        }
        break;
      case 'on_opponent_turn_end':
        for (const e of legacy) onPlay.push({ ...e });
        reactionEvent = 'opponent_turn_end';
        break;
      default:
        throw new Error(`Trigger non gestito dall’adapter: ${ability.trigger_id}`);
    }
  }

  const effect_json: LegacyPayload =
    onPlay.length || reactionEvent
      ? {
          effects: onPlay,
          ...(reactionEvent ? { reaction_trigger: { event: reactionEvent } } : {}),
        }
      : null;

  const effect_on_death_json: LegacyPayload = onDeath.length
    ? { effects: onDeath }
    : null;

  return { effect_json, effect_on_death_json };
}

/** Testo leggibile breve per UI (effect_text). */
export function abilityToText(ability: Ability): string {
  const when: Record<string, string> = {
    on_enter: 'Quando entra',
    on_enchanted_attack: 'Quando la creatura incantata attacca',
    on_death: 'Alla morte',
    on_ally_enters: 'Quando una creatura alleata entra',
    on_opponent_turn_end: 'A fine turno avversario',
  };
  const what: Record<string, string> = {
    draw: `pesca ${ability.amount}`,
    opponent_discard: `l’avversario scarta ${ability.amount}`,
    heal_self: `cura ${ability.amount} PV a te`,
    damage: `${ability.amount} danno/i`,
    buff_creature: `+${ability.amount}/+${ability.amount}`,
  };
  const t = ability.target && ability.target !== 'self' ? ` (${ability.target})` : '';
  return `${when[ability.trigger_id] ?? ability.trigger_id}: ${what[ability.effect_id] ?? ability.effect_id}${t}.`;
}
