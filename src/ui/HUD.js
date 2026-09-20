import { BUILDING_TYPES, TRAINING_CONFIG, UPGRADE_CONFIG } from '../entities/Building.js';
import { Unit } from '../entities/Unit.js';
import { ENEMY_FACTIONS } from '../ai/EnemyAI.js';

export const KINGDOMS = {
  JAPANESE: { id: 'JAPANESE', name: 'Japanese Shogunate', icon: '🌸', crest: '🌸', color: '#dc2626', trait: 'Bushido Discipline', desc: '+15% Swordsman & Knight attack damage, faster strike rate.' },
  KOREAN: { id: 'KOREAN', name: 'Korean Joseon', icon: '🏯', crest: '🏯', color: '#2563eb', trait: 'Divine Artillery', desc: 'Fortress fires +2 extra arrows. Towers & Fortress have +25% range.' },
  CHINESE: { id: 'CHINESE', name: 'Chinese Empire', icon: '🐉', crest: '🐉', color: '#ea580c', trait: 'Imperial Dynasty', desc: '+3 Starting Villagers, -20% building wood cost, faster research.' },
  INDIAN: { id: 'INDIAN', name: 'Indian Maurya', icon: '🐘', crest: '🐘', color: '#16a34a', trait: 'Armored Cavalry', desc: '+30% Knight cavalry HP, farms provide +30% more food reserve.' }
};

export class HUD {
  constructor(game) {
    this.game = game;

    // Top Bar DOM Elements
    this.civBanner = document.getElementById('civ-banner');
    this.civIcon = document.getElementById('civ-icon');
    this.civName = document.getElementById('civ-name');
    this.valFood = document.getElementById('val-food');
    this.valWood = document.getElementById('val-wood');
    this.valGold = document.getElementById('val-gold');
    this.valPop = document.getElementById('val-pop');
    this.gameTimer = document.getElementById('game-timer');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.btnMusicToggle = document.getElementById('btn-music-toggle');
    this.btnIdleVil = document.getElementById('btn-idle-vil');
    this.valIdleCount = document.getElementById('val-idle-count');
    this.btnMenuToggle = document.getElementById('btn-menu-toggle');
    this.btnReturnLobby = document.getElementById('btn-return-lobby');

    // Quest Tracker
    this.questText = document.getElementById('quest-text');

    // Raid Alert Banner
    this.alertBanner = document.getElementById('alert-banner');
    this.alertText = document.getElementById('alert-text');
    this.alertTimeout = null;

    // Selection Panel DOM Elements
    this.selectionCard = document.getElementById('selection-card');
    this.emptyMsg = this.selectionCard.querySelector('.empty-selection-msg');
    this.detailsContent = this.selectionCard.querySelector('.unit-details-content');
    this.unitAvatar = document.getElementById('unit-avatar');
    this.unitName = document.getElementById('unit-name');
    this.unitHpFill = document.getElementById('unit-hp-fill');
    this.unitHpText = document.getElementById('unit-hp-text');
    this.unitStatsGrid = document.getElementById('unit-stats-grid');
    this.statAtk = document.getElementById('stat-atk');
    this.statSpd = document.getElementById('stat-spd');
    this.statState = document.getElementById('stat-state');

    // Action Grid
    this.actionGrid = document.getElementById('action-grid');

    // Minimap Canvas
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    // Standalone Main Menu & Match Setup Page
    this.mainMenuPage = document.getElementById('main-menu-page');
    this.mainCivGrid = document.getElementById('main-civ-grid');
    this.diplomacyGrid = document.getElementById('diplomacy-grid');
    this.diplomacyBadge = document.getElementById('diplomacy-badge');
    this.mainMapGrid = document.getElementById('main-map-grid');
    this.mapScaleBadge = document.getElementById('map-scale-badge');
    this.mainDifficulty = document.getElementById('main-difficulty');
    this.mainMatchSummary = document.getElementById('main-match-summary');
    this.btnCommenceBattle = document.getElementById('btn-commence-battle');

    // Pause / Settings Modal
    this.pauseModal = document.getElementById('pause-modal');
    this.btnClosePause = document.getElementById('btn-close-pause');
    this.btnResumeGame = document.getElementById('btn-resume-game');
    this.btnRestartGame = document.getElementById('btn-restart-game');
    this.btnPauseLobby = document.getElementById('btn-pause-lobby');
    this.selectDifficulty = document.getElementById('select-difficulty');
    this.btnToggleFog = document.getElementById('btn-toggle-fog');
    this.btnSettingsMusic = document.getElementById('btn-settings-music');
    this.btnSettingsSound = document.getElementById('btn-settings-sound');

    // Game Over Modal
    this.gameOverModal = document.getElementById('game-over-modal');
    this.gameOverCard = document.getElementById('game-over-card');
    this.gameOverTitle = document.getElementById('game-over-title');
    this.gameOverSubtitle = document.getElementById('game-over-subtitle');
    this.statTime = document.getElementById('stat-time');
    this.statTrained = document.getElementById('stat-trained');
    this.statVanquished = document.getElementById('stat-vanquished');
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.btnGameOverSetup = document.getElementById('btn-game-over-setup');

    // Modals
    this.controlsModal = document.getElementById('controls-modal');
    this.btnHelp = document.getElementById('btn-controls-help');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnModalStart = document.getElementById('btn-modal-start');

    // Lobby State
    this.selectedCiv = 'JAPANESE';
    this.selectedMap = 'RIVER_VALLEY';
    this.opponentStates = {
      KOREAN: { enabled: true, stance: 'ENEMY' },
      CHINESE: { enabled: true, stance: 'ENEMY' },
      INDIAN: { enabled: true, stance: 'ENEMY' }
    };

    // Visual FX
    this.pings = [];
    this.floatingTexts = [];
    this.sparkles = [];
    this.minimapPings = [];
    this.particles = [];

    this.currentContextEntity = null;
    this.isPaused = false;
    this.lastSelectionKey = '';

    this.setupEventListeners();
    this.initLobby();
  }

  setupEventListeners() {
    // Sound & Music Toggles
    if (this.btnSoundToggle) {
      this.btnSoundToggle.addEventListener('click', () => {
        if (!this.game.sound) return;
        const enabled = this.game.sound.toggleSound();
        this.btnSoundToggle.textContent = enabled ? '🔊 Sound' : '🔇 Sound';
        if (this.btnSettingsSound) this.btnSettingsSound.textContent = enabled ? '🔊 On' : '🔇 Off';
      });
    }

    if (this.btnMusicToggle) {
      this.btnMusicToggle.addEventListener('click', () => {
        if (!this.game.sound) return;
        const enabled = this.game.sound.toggleMusic();
        this.btnMusicToggle.textContent = enabled ? '🎵 Music' : '🔇 Music';
        if (this.btnSettingsMusic) this.btnSettingsMusic.textContent = enabled ? '🎵 Playing' : '🔇 Muted';
      });
    }

    // Idle Villager Button
    if (this.btnIdleVil) {
      this.btnIdleVil.addEventListener('click', () => {
        this.game.cycleIdleVillager();
      });
    }

    // Menu / Pause Modal
    const togglePause = () => {
      this.isPaused = !this.isPaused;
      if (this.isPaused) {
        this.pauseModal.classList.remove('hidden');
      } else {
        this.pauseModal.classList.add('hidden');
      }
    };

    if (this.btnMenuToggle) this.btnMenuToggle.addEventListener('click', togglePause);
    if (this.btnClosePause) this.btnClosePause.addEventListener('click', togglePause);
    if (this.btnResumeGame) this.btnResumeGame.addEventListener('click', togglePause);

    // Restart Current Match
    if (this.btnRestartGame) {
      this.btnRestartGame.addEventListener('click', () => {
        this.pauseModal.classList.add('hidden');
        this.isPaused = false;
        this.launchBattle();
      });
    }

    if (this.btnPlayAgain) {
      this.btnPlayAgain.addEventListener('click', () => {
        this.gameOverModal.classList.add('hidden');
        this.launchBattle();
      });
    }

    // Return to Lobby / Main Menu Buttons
    const openMainMenu = () => {
      if (this.pauseModal) this.pauseModal.classList.add('hidden');
      if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
      if (this.controlsModal) this.controlsModal.classList.add('hidden');
      this.isPaused = true;
      if (this.mainMenuPage) {
        this.mainMenuPage.classList.remove('hidden');
      }
    };

    if (this.btnReturnLobby) this.btnReturnLobby.addEventListener('click', openMainMenu);
    if (this.btnPauseLobby) this.btnPauseLobby.addEventListener('click', openMainMenu);
    if (this.btnGameOverSetup) this.btnGameOverSetup.addEventListener('click', openMainMenu);

    // Settings adjustments
    if (this.selectDifficulty) {
      this.selectDifficulty.addEventListener('change', (e) => {
        if (this.game.enemyAI) {
          this.game.enemyAI.setDifficulty(e.target.value);
        }
      });
    }

    if (this.btnToggleFog) {
      this.btnToggleFog.addEventListener('click', () => {
        if (this.game.fog) {
          this.game.fog.enabled = !this.game.fog.enabled;
          this.btnToggleFog.textContent = this.game.fog.enabled ? '👁️ Enabled' : '👁️ Disabled';
        }
      });
    }

    // Help Modal
    if (this.btnHelp) {
      this.btnHelp.addEventListener('click', () => {
        this.controlsModal.classList.remove('hidden');
      });
    }

    const closeModal = () => this.controlsModal.classList.add('hidden');
    if (this.btnCloseModal) this.btnCloseModal.addEventListener('click', closeModal);
    if (this.btnModalStart) this.btnModalStart.addEventListener('click', closeModal);

    // Minimap navigation
    const handleMinimapInteraction = (e) => {
      const rect = this.minimapCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const normX = Math.max(0, Math.min(1, clickX / rect.width));
      const normY = Math.max(0, Math.min(1, clickY / rect.height));

      this.game.camera.x = normX * this.game.map.width;
      this.game.camera.y = normY * this.game.map.height;
      this.game.camera.clamp();
    };

    let minimapDragging = false;
    this.minimapCanvas.addEventListener('mousedown', (e) => {
      minimapDragging = true;
      handleMinimapInteraction(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (minimapDragging) {
        handleMinimapInteraction(e);
      }
    });

    window.addEventListener('mouseup', () => {
      minimapDragging = false;
    });
  }

  initLobby() {
    // 1. Kingdom Card Selection in Main Menu
    const civCards = document.querySelectorAll('#main-civ-grid .civ-card');
    civCards.forEach(card => {
      card.addEventListener('click', () => {
        civCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedCiv = card.dataset.civ;
        this.refreshOpponentsGrid();
        this.updateLobbySummary();
      });
    });

    // 2. Map Card Selection in Main Menu
    const mapCards = document.querySelectorAll('#main-map-grid .map-card');
    mapCards.forEach(card => {
      card.addEventListener('click', () => {
        mapCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedMap = card.dataset.map;
        this.updateLobbySummary();
      });
    });

    // 3. Difficulty Change
    if (this.mainDifficulty) {
      this.mainDifficulty.addEventListener('change', () => this.updateLobbySummary());
    }

    // 4. Commence Battle Button
    if (this.btnCommenceBattle) {
      this.btnCommenceBattle.addEventListener('click', () => {
        this.launchBattle();
      });
    }

    // Initialize opponents and summary
    this.refreshOpponentsGrid();
    this.updateLobbySummary();
  }

  refreshOpponentsGrid() {
    if (!this.diplomacyGrid) return;
    this.diplomacyGrid.innerHTML = '';

    const allCivKeys = Object.keys(KINGDOMS);
    const opponentCivs = allCivKeys.filter(k => k !== this.selectedCiv);

    // Initialize opponent states if missing
    for (const civKey of opponentCivs) {
      if (!this.opponentStates[civKey]) {
        this.opponentStates[civKey] = { enabled: true, stance: 'ENEMY' };
      }
    }

    for (const civKey of opponentCivs) {
      const info = KINGDOMS[civKey];
      const state = this.opponentStates[civKey];

      const card = document.createElement('div');
      card.className = `diplomacy-card ${state.enabled ? 'active-opponent' : 'disabled-opponent'}`;
      card.dataset.civ = civKey;

      card.innerHTML = `
        <div class="diplomacy-card-header">
          <div class="opponent-info">
            <span class="opponent-crest">${info.crest}</span>
            <span class="opponent-name">${info.name}</span>
          </div>
          <label class="opponent-toggle" title="Include or exclude this kingdom">
            <input type="checkbox" class="chk-opponent-enable" ${state.enabled ? 'checked' : ''}>
            <span>In Battle</span>
          </label>
        </div>
        <div class="stance-selector" style="${state.enabled ? '' : 'pointer-events: none; opacity: 0.35;'}">
          <button type="button" class="btn-stance stance-enemy ${state.stance === 'ENEMY' ? 'active' : ''}" data-stance="ENEMY">
            ⚔️ Enemy Rival
          </button>
          <button type="button" class="btn-stance stance-ally ${state.stance === 'ALLY' ? 'active' : ''}" data-stance="ALLY">
            🤝 Allied Kingdom
          </button>
        </div>
      `;

      // Checkbox event
      const chk = card.querySelector('.chk-opponent-enable');
      chk.addEventListener('change', (e) => {
        // Enforce at least 1 opponent enabled
        const otherEnabled = opponentCivs.filter(k => k !== civKey && this.opponentStates[k].enabled);
        if (!e.target.checked && otherEnabled.length === 0) {
          e.target.checked = true;
          this.showAlert('⚠️ At least one opponent kingdom must participate in the battle!');
          return;
        }

        state.enabled = e.target.checked;
        card.className = `diplomacy-card ${state.enabled ? 'active-opponent' : 'disabled-opponent'}`;
        const sel = card.querySelector('.stance-selector');
        sel.style.pointerEvents = state.enabled ? 'auto' : 'none';
        sel.style.opacity = state.enabled ? '1' : '0.35';
        this.updateLobbySummary();
      });

      // Stance buttons event
      const btnEnemy = card.querySelector('.stance-enemy');
      const btnAlly = card.querySelector('.stance-ally');

      btnEnemy.addEventListener('click', () => {
        state.stance = 'ENEMY';
        btnEnemy.classList.add('active');
        btnAlly.classList.remove('active');
        this.updateLobbySummary();
      });

      btnAlly.addEventListener('click', () => {
        state.stance = 'ALLY';
        btnAlly.classList.add('active');
        btnEnemy.classList.remove('active');
        this.updateLobbySummary();
      });

      this.diplomacyGrid.appendChild(card);
    }
  }

  updateLobbySummary() {
    const allCivKeys = Object.keys(KINGDOMS);
    const opponentCivs = allCivKeys.filter(k => k !== this.selectedCiv);

    const activeOpponents = opponentCivs.filter(k => this.opponentStates[k]?.enabled);
    const allies = activeOpponents.filter(k => this.opponentStates[k]?.stance === 'ALLY');
    const enemies = activeOpponents.filter(k => this.opponentStates[k]?.stance === 'ENEMY');

    const totalNations = 1 + activeOpponents.length;

    // 1. Diplomacy Badge text
    let badgeText = '⚔️ 1 vs 3 Total War';
    let isAllied = allies.length > 0;

    if (allies.length === 0) {
      if (enemies.length === 1) badgeText = '⚔️ 1 vs 1 Historic Duel';
      else if (enemies.length === 2) badgeText = '⚔️ 1 vs 2 Asymmetrical War';
      else badgeText = '⚔️ 1 vs 3 Total War';
    } else if (allies.length === 1) {
      if (enemies.length === 1) badgeText = '🤝 2 vs 1 Decisive Strike';
      else if (enemies.length === 2) badgeText = '🤝 2 vs 2 Grand Alliance';
      else badgeText = '🤝 Allied Coalition';
    } else {
      badgeText = '🤝 Allied Coalition';
    }

    if (this.diplomacyBadge) {
      this.diplomacyBadge.textContent = badgeText;
      if (isAllied) {
        this.diplomacyBadge.classList.add('allied');
      } else {
        this.diplomacyBadge.classList.remove('allied');
      }
    }

    // 2. Map Scaling Badge text
    let scaleText = '80×80 (4 Kingdoms)';
    if (totalNations === 2) {
      scaleText = '50×50 Compact Skirmish (2 Kingdoms)';
    } else if (totalNations === 3) {
      scaleText = '65×65 Expanded Realm (3 Kingdoms)';
    } else {
      scaleText = '80×80 Colossal Empire (4 Kingdoms)';
    }

    if (this.mapScaleBadge) {
      this.mapScaleBadge.textContent = `🗺️ Dynamic Realm: ${scaleText}`;
    }

    // 3. Match Configuration preview string
    const civName = KINGDOMS[this.selectedCiv]?.name || 'Japanese';
    const mapName = this.selectedMap.replace('_', ' ');
    if (this.mainMatchSummary) {
      this.mainMatchSummary.textContent = `${civName} • ${badgeText} • ${mapName} (${scaleText.split(' ')[0]})`;
    }
  }

  launchBattle() {
    if (this.mainMenuPage) {
      this.mainMenuPage.classList.add('hidden');
    }
    this.isPaused = false;

    // Resume Web Audio on user gesture
    if (this.game.sound) {
      this.game.sound.initAudio();
    }

    const allCivKeys = Object.keys(KINGDOMS);
    const opponentCivs = allCivKeys.filter(k => k !== this.selectedCiv);

    const activeOpponents = opponentCivs
      .filter(k => this.opponentStates[k]?.enabled)
      .map(k => ({
        civId: k,
        stance: this.opponentStates[k].stance
      }));

    const difficulty = this.mainDifficulty ? this.mainDifficulty.value : 'NORMAL';

    this.game.startNewMatch({
      playerCiv: this.selectedCiv,
      mapType: this.selectedMap,
      opponents: activeOpponents,
      difficulty: difficulty
    });
  }

  setCivilizationBanner(civId) {
    const civ = KINGDOMS[civId] || KINGDOMS.JAPANESE;
    if (this.civIcon) this.civIcon.textContent = civ.icon;
    if (this.civName) this.civName.textContent = civ.name;
  }

  showAlert(message, duration = 4500) {
    if (!this.alertBanner) return;
    this.alertText.textContent = message;
    this.alertBanner.classList.remove('hidden');

    if (this.alertTimeout) clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => {
      this.alertBanner.classList.add('hidden');
    }, duration);
  }

  showGameOver(isVictory, stats) {
    if (!this.gameOverModal) return;

    if (isVictory) {
      this.gameOverTitle.textContent = '🏆 VICTORY!';
      this.gameOverTitle.className = 'victory-title';
      this.gameOverSubtitle.textContent = 'All rival kingdoms have been conquered! Your dynasty reigns supreme!';

      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          if (this.game.effects) {
            this.game.effects.addFirework(
              this.game.camera.x + (Math.random() - 0.5) * 650,
              this.game.camera.y + (Math.random() - 0.5) * 450
            );
          }
        }, i * 320);
      }
    } else {
      this.gameOverTitle.textContent = '💀 DEFEAT!';
      this.gameOverTitle.className = 'defeat-title';
      this.gameOverSubtitle.textContent = 'Your Fortress Town Center has fallen to rival invaders.';
    }

    const mins = Math.floor(stats.time / 60).toString().padStart(2, '0');
    const secs = Math.floor(stats.time % 60).toString().padStart(2, '0');
    this.statTime.textContent = `${mins}:${secs}`;
    this.statTrained.textContent = stats.trained || 0;
    this.statVanquished.textContent = stats.vanquished || 0;

    this.gameOverModal.classList.remove('hidden');
  }

  addPing(worldX, worldY, color = '#2ecc71') {
    this.pings.push({
      x: worldX,
      y: worldY,
      radius: 4,
      maxRadius: 26,
      opacity: 1.0,
      color: color
    });
  }

  addMinimapPing(worldX, worldY, color = '#ef4444') {
    this.minimapPings.push({
      x: worldX,
      y: worldY,
      radius: 2,
      maxRadius: 18,
      opacity: 1.0,
      color: color
    });
  }

  addFloatingText(worldX, worldY, text, color = '#ffd700') {
    this.floatingTexts.push({
      x: worldX,
      y: worldY,
      text: text,
      color: color,
      opacity: 1.0,
      vy: -28
    });
  }

  addSparkle(worldX, worldY, color = '#ffffff') {
    for (let i = 0; i < 3; i++) {
      this.sparkles.push({
        x: worldX + (Math.random() - 0.5) * 16,
        y: worldY + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 30,
        vy: -Math.random() * 35,
        color: color,
        opacity: 1.0,
        size: 2 + Math.random() * 2
      });
    }
  }

  update(dt, elapsedSeconds) {
    const mins = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(elapsedSeconds % 60).toString().padStart(2, '0');
    this.gameTimer.textContent = `${mins}:${secs}`;

    this.valFood.textContent = this.game.player.food;
    this.valWood.textContent = this.game.player.wood;
    this.valGold.textContent = this.game.player.gold;
    this.valPop.textContent = `${this.game.player.pop} / ${this.game.player.maxPop}`;

    // Update Idle Villagers badge
    const idleCount = this.game.units.filter(
      u => u.faction === 'PLAYER' && u.unitType === 'VILLAGER' && u.state === 'IDLE' && !u.isDead && !u.isDying
    ).length;
    this.valIdleCount.textContent = idleCount;
    if (idleCount > 0) {
      this.btnIdleVil.style.borderColor = '#f59e0b';
    } else {
      this.btnIdleVil.style.borderColor = 'var(--gold-dark)';
    }

    this.updateMissionObjectives();

    // Update Selection Info
    const selected = this.game.selectedEntities;
    if (selected.length === 0) {
      this.emptyMsg.style.display = 'block';
      this.emptyMsg.textContent = 'No unit, building or resource selected';
      this.detailsContent.style.display = 'none';
      this.updateActionButtons(null);
    } else if (selected.length === 1) {
      const ent = selected[0];
      this.emptyMsg.style.display = 'none';
      this.detailsContent.style.display = 'flex';

      this.unitAvatar.textContent = ent.avatar || ent.icon || '🛡️';
      this.unitName.textContent = ent.name || 'Entity';

      if (ent.farmFood !== undefined) {
        const pct = Math.max(0, Math.min(100, (ent.farmFood / ent.maxFarmFood) * 100));
        this.unitHpFill.style.width = `${pct}%`;
        this.unitHpFill.style.background = '#eab308';
        this.unitHpText.textContent = `Crop Reserve: ${ent.farmFood} / ${ent.maxFarmFood}`;
        this.statAtk.textContent = '-';
        this.statSpd.textContent = '-';
        this.statState.textContent = 'Renewable Food';
        this.updateActionButtons(ent);
      } else if (ent.amount !== undefined) {
        const pct = Math.max(0, Math.min(100, (ent.amount / ent.maxAmount) * 100));
        this.unitHpFill.style.width = `${pct}%`;
        this.unitHpFill.style.background = ent.config ? ent.config.color : '#ffd700';
        this.unitHpText.textContent = `Remaining: ${ent.amount} / ${ent.maxAmount}`;
        this.statAtk.textContent = '-';
        this.statSpd.textContent = '-';
        this.statState.textContent = 'Harvestable';
        this.updateActionButtons(null);
      } else {
        const hpPct = Math.max(0, Math.min(100, (ent.hp / ent.maxHp) * 100));
        this.unitHpFill.style.width = `${hpPct}%`;
        this.unitHpFill.style.background = ent.faction === 'PLAYER'
          ? 'linear-gradient(90deg, #2ecc71, #27ae60)'
          : 'linear-gradient(90deg, #ef4444, #b91c1c)';
        this.unitHpText.textContent = `HP: ${Math.ceil(ent.hp)} / ${ent.maxHp}`;
        this.statAtk.textContent = ent.attackDamage || '-';
        this.statSpd.textContent = ent.speed || '-';
        this.statState.textContent = ent.state || ent.role || 'Ready';
        this.updateActionButtons(ent);
      }
    } else {
      this.emptyMsg.style.display = 'block';
      this.emptyMsg.textContent = `🛡️ Group Selected: ${selected.length} Troops`;
      this.detailsContent.style.display = 'none';

      const hasVillagers = selected.some(e => e instanceof Unit && e.unitType === 'VILLAGER');
      if (hasVillagers) {
        this.updateActionButtons({ isVillagerGroup: true });
      } else {
        this.updateActionButtons({ isMilitaryGroup: true });
      }
    }

    // Update Pings
    for (let i = this.pings.length - 1; i >= 0; i--) {
      const p = this.pings[i];
      p.radius += dt * 45;
      p.opacity -= dt * 2.2;
      if (p.opacity <= 0 || p.radius >= p.maxRadius) {
        this.pings.splice(i, 1);
      }
    }

    for (let i = this.minimapPings.length - 1; i >= 0; i--) {
      const mp = this.minimapPings[i];
      mp.radius += dt * 25;
      mp.opacity -= dt * 1.8;
      if (mp.opacity <= 0 || mp.radius >= mp.maxRadius) {
        this.minimapPings.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.opacity -= dt * 0.9;
      if (ft.opacity <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.opacity -= dt * 2.0;
      if (sp.opacity <= 0) {
        this.sparkles.splice(i, 1);
      }
    }
  }

  updateMissionObjectives() {
    if (!this.questText) return;

    const remainingEnemyTCs = this.game.buildings.filter(
      b => b.faction !== 'PLAYER' && b.buildingType === 'TOWN_CENTER' && !b.isDead
    ).length;
    const hasBarracks = this.game.buildings.some(b => b.faction === 'PLAYER' && b.buildingType === 'BARRACKS' && b.isConstructed);
    const militaryCount = this.game.units.filter(u => u.faction === 'PLAYER' && u.unitType !== 'VILLAGER' && !u.isDead).length;

    if (!hasBarracks) {
      this.questText.textContent = 'Construct a Barracks (100 Wood, 20 Gold) to recruit military forces!';
    } else if (militaryCount < 5) {
      this.questText.textContent = `Recruit soldiers at the Barracks (${militaryCount}/5 ready) and protect your borders!`;
    } else {
      this.questText.textContent = `Destroy the rival strongholds across the bridges (${remainingEnemyTCs} Enemy Fortresses remaining)!`;
    }
  }

  // Helper to create spacious viewable action button
  createActionButton(icon, title, costText, onClick, isResearch = false) {
    const btn = document.createElement('button');
    btn.className = `action-btn ${isResearch ? 'btn-research' : ''}`;
    btn.innerHTML = `
      <span class="btn-icon">${icon}</span>
      <span class="btn-title">${title}</span>
      <span class="btn-cost-row">${costText}</span>
    `;
    btn.onclick = onClick;
    return btn;
  }

  updateActionButtons(context) {
    if (this.currentContextEntity === context) return;
    this.currentContextEntity = context;
    this.actionGrid.innerHTML = '';

    if (!context) return;

    // 1. Villager Selected -> Build Menu
    if ((context instanceof Unit && context.unitType === 'VILLAGER' && context.faction === 'PLAYER') || context.isVillagerGroup) {
      this.actionGrid.appendChild(
        this.createActionButton('🏠', 'House', '🪵 30', () => this.game.startPlacement('HOUSE'))
      );
      this.actionGrid.appendChild(
        this.createActionButton('🌾', 'Farm', '🪵 60', () => this.game.startPlacement('FARM'))
      );
      this.actionGrid.appendChild(
        this.createActionButton('🛡️', 'Barracks', '🪵 100 🪙 20', () => this.game.startPlacement('BARRACKS'))
      );
      this.actionGrid.appendChild(
        this.createActionButton('🗼', 'Tower', '🪵 80 🪙 25', () => this.game.startPlacement('WATCH_TOWER'))
      );
      this.actionGrid.appendChild(
        this.createActionButton('⚒️', 'Blacksmith', '🪵 120 🪙 40', () => this.game.startPlacement('BLACKSMITH'))
      );
      this.actionGrid.appendChild(
        this.createActionButton('🛑', 'Stop', 'Hotkey S', () => this.game.stopSelected())
      );
    }
    // 2. Town Center Selected -> Train Villager
    else if (context.buildingType === 'TOWN_CENTER' && context.faction === 'PLAYER') {
      this.actionGrid.appendChild(
        this.createActionButton('👨‍🌾', 'Villager', '🌾 50', () => {
          const res = context.queueUnit('VILLAGER', this.game.player);
          if (!res.success) {
            this.addFloatingText(context.x, context.y - 40, res.reason, '#ef4444');
          } else {
            this.addFloatingText(context.x, context.y - 40, 'Queue: Villager 👨‍🌾', '#38bdf8');
          }
        })
      );
    }
    // 3. Barracks Selected -> Train Swordsman / Archer / Knight
    else if (context.buildingType === 'BARRACKS' && context.faction === 'PLAYER') {
      this.actionGrid.appendChild(
        this.createActionButton('⚔️', 'Swordsman', '🌾 60 🪙 20', () => {
          const res = context.queueUnit('SWORDSMAN', this.game.player);
          if (!res.success) {
            this.addFloatingText(context.x, context.y - 40, res.reason, '#ef4444');
          } else {
            this.addFloatingText(context.x, context.y - 40, 'Queue: Swordsman ⚔️', '#38bdf8');
          }
        })
      );
      this.actionGrid.appendChild(
        this.createActionButton('🏹', 'Archer', '🌾 40 🪵 45', () => {
          const res = context.queueUnit('ARCHER', this.game.player);
          if (!res.success) {
            this.addFloatingText(context.x, context.y - 40, res.reason, '#ef4444');
          } else {
            this.addFloatingText(context.x, context.y - 40, 'Queue: Archer 🏹', '#38bdf8');
          }
        })
      );
      this.actionGrid.appendChild(
        this.createActionButton('🏇', 'Knight', '🌾 85 🪙 60', () => {
          const res = context.queueUnit('KNIGHT', this.game.player);
          if (!res.success) {
            this.addFloatingText(context.x, context.y - 40, res.reason, '#ef4444');
          } else {
            this.addFloatingText(context.x, context.y - 40, 'Queue: Knight 🏇', '#38bdf8');
          }
        })
      );
    }
    // 4. Blacksmith Selected -> Research Tech Tree
    else if (context.buildingType === 'BLACKSMITH' && context.faction === 'PLAYER') {
      const upgrades = ['FORGED_BLADES', 'SCALE_ARMOR', 'BODKIN_ARROWS', 'ARROW_SLITS', 'WHEELBARROW'];
      for (const upId of upgrades) {
        const up = UPGRADE_CONFIG[upId];
        const isDone = this.game.playerUpgrades.has(upId);
        let costStr = '';
        if (up.cost.food) costStr += `🌾${up.cost.food} `;
        if (up.cost.wood) costStr += `🪵${up.cost.wood} `;
        if (up.cost.gold) costStr += `🪙${up.cost.gold}`;

        if (isDone) {
          const btn = this.createActionButton(up.avatar, up.name, '✓ Researched', () => {}, true);
          btn.style.opacity = '0.55';
          btn.disabled = true;
          this.actionGrid.appendChild(btn);
        } else {
          const btn = this.createActionButton(up.avatar, up.name, costStr, () => {
            const res = context.queueResearch(upId, this.game.player, this.game.playerUpgrades);
            if (!res.success) {
              this.addFloatingText(context.x, context.y - 40, res.reason, '#ef4444');
            } else {
              this.addFloatingText(context.x, context.y - 40, `Researching ${up.name}! ⚒️`, '#c084fc');
              if (this.game.sound) this.game.sound.playHammer();
            }
          }, true);
          this.actionGrid.appendChild(btn);
        }
      }
    }
    // 5. Default Military / Units -> Stop
    else if (context.faction === 'PLAYER') {
      this.actionGrid.appendChild(
        this.createActionButton('🛑', 'Stop', 'Hotkey S', () => this.game.stopSelected())
      );
    }
  }

  renderWorldOverlays(ctx) {
    for (const p of this.pings) {
      ctx.save();
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const sp of this.sparkles) {
      ctx.save();
      ctx.fillStyle = sp.color;
      ctx.globalAlpha = Math.max(0, sp.opacity);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.font = 'bold 15px "Outfit", sans-serif';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.opacity);
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // Building Placement Blueprint Preview
    if (this.game.placementMode && this.game.placementMode.active) {
      const { buildingType, snappedX, snappedY, isValid } = this.game.placementMode;
      const bConfig = BUILDING_TYPES[buildingType];
      if (bConfig) {
        ctx.save();
        ctx.translate(snappedX, snappedY);

        ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        ctx.strokeStyle = isValid ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        const size = bConfig.radius * 2;
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.strokeRect(-size / 2, -size / 2, size, size);

        if (bConfig.attackRange) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, bConfig.attackRange, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bConfig.avatar, 0, 10);

        ctx.restore();
      }
    }
  }

  renderScreenOverlays(ctx, input) {
    if (input.mouse.isBoxSelecting) {
      const x = Math.min(input.mouse.dragStartX, input.mouse.screenX);
      const y = Math.min(input.mouse.dragStartY, input.mouse.screenY);
      const w = Math.abs(input.mouse.screenX - input.mouse.dragStartX);
      const h = Math.abs(input.mouse.screenY - input.mouse.dragStartY);

      ctx.save();
      ctx.fillStyle = 'rgba(46, 204, 113, 0.22)';
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  }

  renderMinimap() {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const map = this.game.map;
    const camera = this.game.camera;

    ctx.clearRect(0, 0, w, h);

    const scaleX = w / map.cols;
    const scaleY = h / map.rows;

    for (let c = 0; c < map.cols; c++) {
      for (let r = 0; r < map.rows; r++) {
        const type = map.getTile(c, r);
        if (type === 2) ctx.fillStyle = '#1e4875'; // Water
        else if (type === 4) ctx.fillStyle = '#94a3b8'; // Stone Bridge
        else if (type === 6) ctx.fillStyle = '#18181b'; // Mountain Cliff
        else if (type === 5) ctx.fillStyle = '#d4a373'; // Desert Sand
        else if (type === 1) ctx.fillStyle = '#65533b'; // Dirt
        else if (type === 3) ctx.fillStyle = '#4b5563'; // Cobblestone
        else ctx.fillStyle = '#2f5523'; // Grass
        ctx.fillRect(c * scaleX, r * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
      }
    }

    // Minimap Radar Pings
    for (const mp of this.minimapPings) {
      ctx.save();
      ctx.strokeStyle = mp.color;
      ctx.globalAlpha = Math.max(0, mp.opacity);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc((mp.x / map.width) * w, (mp.y / map.height) * h, mp.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Buildings
    for (const b of this.game.buildings) {
      if (b.isDead) continue;
      if (b.faction !== 'PLAYER' && this.game.fog && !this.game.fog.isExplored(b.x, b.y)) {
        continue;
      }
      const bX = (b.x / map.width) * w;
      const bY = (b.y / map.height) * h;

      if (b.faction === 'PLAYER') ctx.fillStyle = '#3b82f6';
      else if (b.isAlly) ctx.fillStyle = '#06b6d4';
      else ctx.fillStyle = b.customColor || '#ef4444';

      const sz = b.buildingType === 'TOWN_CENTER' ? 8 : 5;
      ctx.fillRect(bX - sz / 2, bY - sz / 2, sz, sz);
    }

    // Units
    for (const unit of this.game.units) {
      if (unit.isDead || unit.isDying) continue;
      if (unit.faction !== 'PLAYER' && this.game.fog && !this.game.fog.isVisible(unit.x, unit.y)) {
        continue;
      }
      const unitNormX = unit.x / map.width;
      const unitNormY = unit.y / map.height;

      if (unit.faction === 'PLAYER') ctx.fillStyle = '#67e8f9';
      else if (unit.isAlly) ctx.fillStyle = '#22d3ee';
      else ctx.fillStyle = unit.customColor || '#f87171';

      ctx.beginPath();
      ctx.arc(unitNormX * w, unitNormY * h, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Apply Fog of War onto Minimap
    if (this.game.fog) {
      this.game.fog.renderMinimapFog(ctx, w, h);
    }

    // Camera Viewport Box
    const camTopLeft = camera.screenToWorld(0, 0);
    const camBottomRight = camera.screenToWorld(camera.canvas.width, camera.canvas.height);

    const vpX = (camTopLeft.x / map.width) * w;
    const vpY = (camTopLeft.y / map.height) * h;
    const vpW = ((camBottomRight.x - camTopLeft.x) / map.width) * w;
    const vpH = ((camBottomRight.y - camTopLeft.y) / map.height) * h;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
  }
}
