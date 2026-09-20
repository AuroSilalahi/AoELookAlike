import { Game } from './src/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.__RTS_GAME__ = game; // Exposed for debugging / testing
  console.log('⚔️ Empires of the Web initialized successfully!');
});
