// backend/engine.ts — API pubblica del motore Penombra (lab Partita base).
export {
  saveGameState,
  logMatchAction,
  getCardData,
  createNewMatch,
  forfeitMatch,
  getMatchState,
  playCard,
  moveCreature,
  attack,
  startMostrissimoSummon,
  payMostrissimoSacrifice,
  completeMostrissimoSummon,
  resolveTrapChoice,
  resolveDeathOrder,
  resolveTargetChoice,
  endHumanTurn,
} from './engine-core.js';
