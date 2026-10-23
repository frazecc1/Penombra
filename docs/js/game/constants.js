// docs/js/game/constants.js — costanti UI / fazioni (lab Partita base)
export const FUNNY_BOOT = [
  'Collegando le bende…',
  'Rispolverando il regolamento…',
  'Mettendo in pausa il film «La Mummia»…',
  'Scuotendo la sabbia dalle scarpe…',
  'Srotolando le bende del salvataggio…',
  'Lucidando il sarcofago…',
];
export function funnyBootLine(i) { return FUNNY_BOOT[i % FUNNY_BOOT.length]; }

export const factions = ['','CHI','INF','PES','BUL','GRO','CLO','IND'];
export const deckFactionNames = {CHI:'Chiericanza',INF:'Infamia',PES:'Pestilenza',BUL:'Bullismo',GRO:'Grossanza',CLO:'Clownerie'};
export const types = {monster:'MOSTRO',mostrissimo:'MOSTRISSIMO',maledizione:'MALEDIZIONE',instant:'TRAPPOLA',terraforma:'TERRAFORMA',aura:'AURA'};
export const rarities = {common:'Comune',uncommon:'Non comune',rare:'Rara',ultra_rare:'Ultra rara',legendary:'Leggendaria'};

export const STAGE_W = 455;
export const STAGE_H = 768;
export const STAGE_MIN_ASPECT = 0.44;
export const STAGE_FRAME_MIN_W = 1100;
export const HAND_AREA = 403;
export const HAND_MIN_VISIBLE = 34;

export const OPPONENT_NAME = 'nomeavversario';
export const OPPONENT_IMG = 'img/png/domanda/domanda.webp';
export const AI_TARGET = 'player:0';
export const TOKEN_TTL_MS = 60_000;
export const CARD_TTL = 5 * 60 * 1000;
