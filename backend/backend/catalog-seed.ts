// catalog-seed.ts — carte lab Penombra (stats semplici, effetti cura 1).
import type { CardData, DeckFaction } from './types.js';

export type SeedCard = Omit<CardData, 'faction_id' | 'subtype' | 'flavor_text' | 'subtype_names'> & { faction_code: DeckFaction; is_boss: boolean; sacrifice_cost: number | null };

export const CATALOG_SEED: SeedCard[] = [
  {
    "id": "seed-chi-m1",
    "name": "Chiericanza Mostro 1",
    "card_type": "monster",
    "mana_cost": 1,
    "attack": 1,
    "hp": 1,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-m2",
    "name": "Chiericanza Mostro 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 2,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-m3",
    "name": "Chiericanza Mostro 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-m4",
    "name": "Chiericanza Mostro 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-m5",
    "name": "Chiericanza Mostro 5",
    "card_type": "monster",
    "mana_cost": 5,
    "attack": 5,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-m6",
    "name": "Chiericanza Boss 6",
    "card_type": "monster",
    "mana_cost": 6,
    "attack": 6,
    "hp": 7,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": true,
    "rarity": "legendary",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-mx2",
    "name": "Chiericanza Recluta 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-mx3",
    "name": "Chiericanza Recluta 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-mx4",
    "name": "Chiericanza Recluta 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-trap",
    "name": "Trappola Chiericanza",
    "card_type": "instant",
    "mana_cost": 1,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "A fine turno avversario: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self"
        }
      ],
      "reaction_trigger": {
        "event": "opponent_turn_end"
      }
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-aura",
    "name": "Aura Chiericanza",
    "card_type": "aura",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando la creatura equipaggiata attacca: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "equipped_creature_attacks"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-terra",
    "name": "Terraforma Chiericanza",
    "card_type": "terraforma",
    "mana_cost": 3,
    "attack": null,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra una creatura alleata: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "own_monster_summoned"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-chi-mal",
    "name": "Maledizione Chiericanza",
    "card_type": "maledizione",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-m1",
    "name": "Infamia Mostro 1",
    "card_type": "monster",
    "mana_cost": 1,
    "attack": 1,
    "hp": 1,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-m2",
    "name": "Infamia Mostro 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 2,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-m3",
    "name": "Infamia Mostro 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-m4",
    "name": "Infamia Mostro 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-m5",
    "name": "Infamia Mostro 5",
    "card_type": "monster",
    "mana_cost": 5,
    "attack": 5,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-m6",
    "name": "Infamia Boss 6",
    "card_type": "monster",
    "mana_cost": 6,
    "attack": 6,
    "hp": 7,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": true,
    "rarity": "legendary",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-mx2",
    "name": "Infamia Recluta 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-mx3",
    "name": "Infamia Recluta 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-mx4",
    "name": "Infamia Recluta 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-trap",
    "name": "Trappola Infamia",
    "card_type": "instant",
    "mana_cost": 1,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "A fine turno avversario: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self"
        }
      ],
      "reaction_trigger": {
        "event": "opponent_turn_end"
      }
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-aura",
    "name": "Aura Infamia",
    "card_type": "aura",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando la creatura equipaggiata attacca: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "equipped_creature_attacks"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-terra",
    "name": "Terraforma Infamia",
    "card_type": "terraforma",
    "mana_cost": 3,
    "attack": null,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra una creatura alleata: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "own_monster_summoned"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-inf-mal",
    "name": "Maledizione Infamia",
    "card_type": "maledizione",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "INF",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-m1",
    "name": "Pestilenza Mostro 1",
    "card_type": "monster",
    "mana_cost": 1,
    "attack": 1,
    "hp": 1,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-m2",
    "name": "Pestilenza Mostro 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 2,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-m3",
    "name": "Pestilenza Mostro 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-m4",
    "name": "Pestilenza Mostro 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-m5",
    "name": "Pestilenza Mostro 5",
    "card_type": "monster",
    "mana_cost": 5,
    "attack": 5,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-m6",
    "name": "Pestilenza Boss 6",
    "card_type": "monster",
    "mana_cost": 6,
    "attack": 6,
    "hp": 7,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": true,
    "rarity": "legendary",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-mx2",
    "name": "Pestilenza Recluta 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-mx3",
    "name": "Pestilenza Recluta 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-mx4",
    "name": "Pestilenza Recluta 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-trap",
    "name": "Trappola Pestilenza",
    "card_type": "instant",
    "mana_cost": 1,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "A fine turno avversario: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self"
        }
      ],
      "reaction_trigger": {
        "event": "opponent_turn_end"
      }
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-aura",
    "name": "Aura Pestilenza",
    "card_type": "aura",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando la creatura equipaggiata attacca: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "equipped_creature_attacks"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-terra",
    "name": "Terraforma Pestilenza",
    "card_type": "terraforma",
    "mana_cost": 3,
    "attack": null,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra una creatura alleata: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "own_monster_summoned"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-pes-mal",
    "name": "Maledizione Pestilenza",
    "card_type": "maledizione",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "PES",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-m1",
    "name": "Bullismo Mostro 1",
    "card_type": "monster",
    "mana_cost": 1,
    "attack": 1,
    "hp": 1,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-m2",
    "name": "Bullismo Mostro 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 2,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-m3",
    "name": "Bullismo Mostro 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-m4",
    "name": "Bullismo Mostro 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-m5",
    "name": "Bullismo Mostro 5",
    "card_type": "monster",
    "mana_cost": 5,
    "attack": 5,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-m6",
    "name": "Bullismo Boss 6",
    "card_type": "monster",
    "mana_cost": 6,
    "attack": 6,
    "hp": 7,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": true,
    "rarity": "legendary",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-mx2",
    "name": "Bullismo Recluta 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-mx3",
    "name": "Bullismo Recluta 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-mx4",
    "name": "Bullismo Recluta 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-trap",
    "name": "Trappola Bullismo",
    "card_type": "instant",
    "mana_cost": 1,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "A fine turno avversario: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self"
        }
      ],
      "reaction_trigger": {
        "event": "opponent_turn_end"
      }
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-aura",
    "name": "Aura Bullismo",
    "card_type": "aura",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando la creatura equipaggiata attacca: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "equipped_creature_attacks"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-terra",
    "name": "Terraforma Bullismo",
    "card_type": "terraforma",
    "mana_cost": 3,
    "attack": null,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra una creatura alleata: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "own_monster_summoned"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-bul-mal",
    "name": "Maledizione Bullismo",
    "card_type": "maledizione",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "BUL",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-m1",
    "name": "Grossanza Mostro 1",
    "card_type": "monster",
    "mana_cost": 1,
    "attack": 1,
    "hp": 1,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-m2",
    "name": "Grossanza Mostro 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 2,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-m3",
    "name": "Grossanza Mostro 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-m4",
    "name": "Grossanza Mostro 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-m5",
    "name": "Grossanza Mostro 5",
    "card_type": "monster",
    "mana_cost": 5,
    "attack": 5,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-m6",
    "name": "Grossanza Boss 6",
    "card_type": "monster",
    "mana_cost": 6,
    "attack": 6,
    "hp": 7,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": true,
    "rarity": "legendary",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-mx2",
    "name": "Grossanza Recluta 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-mx3",
    "name": "Grossanza Recluta 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-mx4",
    "name": "Grossanza Recluta 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-trap",
    "name": "Trappola Grossanza",
    "card_type": "instant",
    "mana_cost": 1,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "A fine turno avversario: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self"
        }
      ],
      "reaction_trigger": {
        "event": "opponent_turn_end"
      }
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-aura",
    "name": "Aura Grossanza",
    "card_type": "aura",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando la creatura equipaggiata attacca: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "equipped_creature_attacks"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-terra",
    "name": "Terraforma Grossanza",
    "card_type": "terraforma",
    "mana_cost": 3,
    "attack": null,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra una creatura alleata: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "own_monster_summoned"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-gro-mal",
    "name": "Maledizione Grossanza",
    "card_type": "maledizione",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "GRO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-m1",
    "name": "Clownerie Mostro 1",
    "card_type": "monster",
    "mana_cost": 1,
    "attack": 1,
    "hp": 1,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-m2",
    "name": "Clownerie Mostro 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 2,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-m3",
    "name": "Clownerie Mostro 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-m4",
    "name": "Clownerie Mostro 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-m5",
    "name": "Clownerie Mostro 5",
    "card_type": "monster",
    "mana_cost": 5,
    "attack": 5,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-m6",
    "name": "Clownerie Boss 6",
    "card_type": "monster",
    "mana_cost": 6,
    "attack": 6,
    "hp": 7,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": true,
    "rarity": "legendary",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-mx2",
    "name": "Clownerie Recluta 2",
    "card_type": "monster",
    "mana_cost": 2,
    "attack": 2,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-mx3",
    "name": "Clownerie Recluta 3",
    "card_type": "monster",
    "mana_cost": 3,
    "attack": 3,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-mx4",
    "name": "Clownerie Recluta 4",
    "card_type": "monster",
    "mana_cost": 4,
    "attack": 4,
    "hp": 5,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-trap",
    "name": "Trappola Clownerie",
    "card_type": "instant",
    "mana_cost": 1,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "A fine turno avversario: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self"
        }
      ],
      "reaction_trigger": {
        "event": "opponent_turn_end"
      }
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-aura",
    "name": "Aura Clownerie",
    "card_type": "aura",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando la creatura equipaggiata attacca: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "equipped_creature_attacks"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-terra",
    "name": "Terraforma Clownerie",
    "card_type": "terraforma",
    "mana_cost": 3,
    "attack": null,
    "hp": 3,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra una creatura alleata: cura 1 PV a te.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "trigger": "own_monster_summoned"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-clo-mal",
    "name": "Maledizione Clownerie",
    "card_type": "maledizione",
    "mana_cost": 2,
    "attack": null,
    "hp": null,
    "sacrifice_cost": 0,
    "faction_code": "CLO",
    "is_boss": false,
    "rarity": "common",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-mostrissimo-1",
    "name": "Mostrissimo Lab 1",
    "card_type": "mostrissimo",
    "mana_cost": 0,
    "attack": 3,
    "hp": 4,
    "sacrifice_cost": 0,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "rare",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-mostrissimo-2",
    "name": "Mostrissimo Lab 2",
    "card_type": "mostrissimo",
    "mana_cost": 0,
    "attack": 4,
    "hp": 5,
    "sacrifice_cost": 1,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "rare",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  },
  {
    "id": "seed-mostrissimo-3",
    "name": "Mostrissimo Lab 3",
    "card_type": "mostrissimo",
    "mana_cost": 0,
    "attack": 5,
    "hp": 6,
    "sacrifice_cost": 2,
    "faction_code": "CHI",
    "is_boss": false,
    "rarity": "rare",
    "effect_text": "Quando entra: cura 1 PV a te stesso.",
    "effect_json": {
      "effects": [
        {
          "type": "heal",
          "amount": 1,
          "target": "self",
          "timing": "on_play"
        }
      ]
    },
    "effect_on_death_json": null,
    "image_url": null
  }
];

const byId = new Map(CATALOG_SEED.map(c => [c.id, c]));
export function seedCard(id: string): SeedCard | undefined { return byId.get(id); }
export function allSeedCards(): SeedCard[] { return CATALOG_SEED.slice(); }