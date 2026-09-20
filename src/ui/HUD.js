import { BUILDING_TYPES, TRAINING_CONFIG, UPGRADE_CONFIG } from '../entities/Building.js';
import { Unit } from '../entities/Unit.js';

export class HUD {
  constructor(game) {
    this.game = game;

    // Top Bar DOM Elements
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
    this.statAtk = document.getElementById('stat-atk');
    this.statSpd = document.getElementById('stat-spd');
    this.statState = document.getElementById('stat-state');

    // Action Grid
    this.actionGrid = document.getElementById('action-grid');

    // Minimap Canvas
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    // Modals
    this.btnHelp = document.getElementById('btn-controls-help');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnModalStart = document.getElementById('btn-modal-start');
    this.controlsModal = document.getElementById('controls-modal');

    // Pause / Settings Modal
    this.pauseModal = document.getElementById('pause-modal');
    this.btnClosePause = document.getElementById('btn-close-pause');
    this.btnResumeGame = document.getElementById('btn-resume-game');
    this.btnRestartGame = document.getElementById('btn-restart-game');
    this.selectDifficulty = document.getElementById('select-difficulty');
    this.btnToggleFog = document.getElementById('btn-toggle-fog');
    this.btnSettingsMusic = document.getElementById('btn-settings-music');
    this.btnSettingsSound = document.getElementById('btn-settings-sound');

    // Game Over Modal
    this.gameOverModal = document.getElementById('game-over-modal');
    this.gameOverTitle = document.getElementById('game-over-title');
    this.gameOverSubtitle = document.getElementById('game-over-subtitle');
    this.statTime = document.getElementById('stat-time');
    this.statTrained = document.getElementById('stat-trained');
    this.statVanquished = document.getElementById('stat-vanquished');
    this.btnPlayAgain = document.getElementById('btn-play-again');

    // Visual FX
    this.pings = [];
    this.floatingTexts = [];
    this.sparkles = [];
    this.minimapPings = [];

    this.currentContextEntity = null;
    this.isPaused = false;

    this.setupEvents();
  }

  setupEvents() {
    // Sound toggle
    if (this.btnSoundToggle) {
      this.btnSoundToggle.addEventListener('click', () => {
        if (this.game.sound) {
          const isMuted = this.game.sound.toggleMute();
          const text = isMuted ? '🔇 Muted' : '🔊 Sound';
          this.btnSoundToggle.textContent = text;
          if (this.btnSettingsSound) this.btnSettingsSound.textContent = isMuted ? '🔇 Muted' : '🔊 On';
        }
      });
    }

    // Music toggle
    if (this.btnMusicToggle) {
      this.btnMusicToggle.addEventListener('click', () => {
        if (this.game.sound) {
          const enabled = this.game.sound.toggleMusic();
          const text = enabled ? '🎵 Music' : '🎵 Off';
          this.btnMusicToggle.textContent = text;
          if (this.btnSettingsMusic) this.btnSettingsMusic.textContent = enabled ? '🎵 Playing' : '🎵 Off';
        }
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

    if (this.btnRestartGame) {
      this.btnRestartGame.addEventListener('click', () => {
        window.location.reload();
      });
    }

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
    this.btnHelp.addEventListener('click', () => {
      this.controlsModal.classList.remove('hidden');
    });

    const closeModal = () => this.controlsModal.classList.add('hidden');
    this.btnCloseModal.addEventListener('click', closeModal);
    this.btnModalStart.addEventListener('click', closeModal);

    // Play Again button
    this.btnPlayAgain.addEventListener('click', () => {
      window.location.reload();
    });

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
      this.gameOverSubtitle.textContent = 'The enemy stronghold has been razed! Your kingdom reigns supreme!';

      // Trigger celebratory fireworks!
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          if (this.game.effects) {
            this.game.effects.addFirework(
              this.game.camera.x + (Math.random() - 0.5) * 600,
              this.game.camera.y + (Math.random() - 0.5) * 400
            );
          }
        }, i * 350);
      }
    } else {
      this.gameOverTitle.textContent = '💀 DEFEAT!';
      this.gameOverTitle.className = 'defeat-title';
      this.gameOverSubtitle.textContent = 'Your Town Center has fallen to the enemy raid.';
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
      maxRadius: 24,
      opacity: 1.0,
      color: color
    });
  }

  addMinimapPing(worldX, worldY, color = '#ef4444') {
    this.minimapPings.push({
      x: worldX,
      y: worldY,
      radius: 2,
      maxRadius: 16,
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

    // Update Objectives / Quest text based on state
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
        // Farm
        const pct = Math.max(0, Math.min(100, (ent.farmFood / ent.maxFarmFood) * 100));
        this.unitHpFill.style.width = `${pct}%`;
        this.unitHpFill.style.background = '#eab308';
        this.unitHpText.textContent = `Crop Reserve: ${ent.farmFood} / ${ent.maxFarmFood}`;
        this.statAtk.textContent = '-';
        this.statSpd.textContent = '-';
        this.statState.textContent = 'Renewable Food';
        this.updateActionButtons(ent);
      } else if (ent.amount !== undefined) {
        // Natural Resource Node
        const pct = Math.max(0, Math.min(100, (ent.amount / ent.maxAmount) * 100));
        this.unitHpFill.style.width = `${pct}%`;
        this.unitHpFill.style.background = ent.config ? ent.config.color : '#ffd700';
        this.unitHpText.textContent = `Remaining: ${ent.amount} / ${ent.maxAmount}`;
        this.statAtk.textContent = '-';
        this.statSpd.textContent = '-';
        this.statState.textContent = 'Harvestable';
        this.updateActionButtons(null);
      } else {
        // Units & Standard Buildings
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

    // Update Minimap Pings
    for (let i = this.minimapPings.length - 1; i >= 0; i--) {
      const mp = this.minimapPings[i];
      mp.radius += dt * 25;
      mp.opacity -= dt * 1.8;
      if (mp.opacity <= 0 || mp.radius >= mp.maxRadius) {
        this.minimapPings.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.opacity -= dt * 0.9;
      if (ft.opacity <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update Sparkles
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

    const hasBarracks = this.game.buildings.some(b => b.faction === 'PLAYER' && b.buildingType === 'BARRACKS' && b.isConstructed);
    const hasBlacksmith = this.game.buildings.some(b => b.faction === 'PLAYER' && b.buildingType === 'BLACKSMITH' && b.isConstructed);
    const hasTower = this.game.buildings.some(b => b.faction === 'PLAYER' && b.buildingType === 'WATCH_TOWER' && b.isConstructed);
    const militaryCount = this.game.units.filter(u => u.faction === 'PLAYER' && u.unitType !== 'VILLAGER' && !u.isDead).length;

    if (!hasBarracks) {
      this.questText.textContent = 'Construct a Barracks (100 Wood, 20 Gold) to begin training an army!';
    } else if (militaryCount < 5) {
      this.questText.textContent = `Train defensive military troops at the Barracks (${militaryCount}/5 ready).`;
    } else if (!hasTower && !hasBlacksmith) {
      this.questText.textContent = 'Build a Watch Tower to guard your resource lines, and a Blacksmith for tech upgrades!';
    } else if (militaryCount < 10) {
      this.questText.textContent = `Muster a formidable army (${militaryCount}/10 troops) including Knights to counter enemy archers!`;
    } else {
      this.questText.textContent = 'March across the river shallows and destroy the enemy Town Center to achieve victory!';
    }
  }

  updateActionButtons(context) {
    if (this.currentContextEntity === context) return;
    this.currentContextEntity = context;
    this.actionGrid.innerHTML = '';

    if (!context) return;

    // 1. Villager Selected -> Build Menu
    if ((context instanceof Unit && context.unitType === 'VILLAGER' && context.faction === 'PLAYER') || context.isVillagerGroup) {
      const btnHouse = document.createElement('button');
      btnHouse.className = 'action-btn';
      btnHouse.title = 'Build House (30 Wood) - Adds +5 Max Pop';
      btnHouse.innerHTML = `<span class="icon">🏠</span><span class="key-hint">House (30🪵)</span>`;
      btnHouse.onclick = () => this.game.startPlacement('HOUSE');
      this.actionGrid.appendChild(btnHouse);

      const btnFarm = document.createElement('button');
      btnFarm.className = 'action-btn';
      btnFarm.title = 'Build Farm (60 Wood) - Renewable Food Source';
      btnFarm.innerHTML = `<span class="icon">🌾</span><span class="key-hint">Farm (60🪵)</span>`;
      btnFarm.onclick = () => this.game.startPlacement('FARM');
      this.actionGrid.appendChild(btnFarm);

      const btnBarracks = document.createElement('button');
      btnBarracks.className = 'action-btn';
      btnBarracks.title = 'Build Barracks (100 Wood, 20 Gold) - Trains Military Units';
      btnBarracks.innerHTML = `<span class="icon">🛡️</span><span class="key-hint">Barracks (100🪵 20🪙)</span>`;
      btnBarracks.onclick = () => this.game.startPlacement('BARRACKS');
      this.actionGrid.appendChild(btnBarracks);

      const btnTower = document.createElement('button');
      btnTower.className = 'action-btn';
      btnTower.title = 'Build Watch Tower (80 Wood, 25 Gold) - Fires defensive arrows';
      btnTower.innerHTML = `<span class="icon">🗼</span><span class="key-hint">Tower (80🪵 25🪙)</span>`;
      btnTower.onclick = () => this.game.startPlacement('WATCH_TOWER');
      this.actionGrid.appendChild(btnTower);

      const btnSmith = document.createElement('button');
      btnSmith.className = 'action-btn';
      btnSmith.title = 'Build Blacksmith (120 Wood, 40 Gold) - Weapon & Armor Tech';
      btnSmith.innerHTML = `<span class="icon">⚒️</span><span class="key-hint">Forge (120🪵 40🪙)</span>`;
      btnSmith.onclick = () => this.game.startPlacement('BLACKSMITH');
      this.actionGrid.appendChild(btnSmith);

      const btnStop = document.createElement('button');
      btnStop.className = 'action-btn';
      btnStop.innerHTML = `<span class="icon">🛑</span><span class="key-hint">Stop (S)</span>`;
      btnStop.onclick = () => this.game.stopSelected();
      this.actionGrid.appendChild(btnStop);
    }
    // 2. Town Center Selected -> Train Villager
    else if (context.buildingType === 'TOWN_CENTER' && context.faction === 'PLAYER') {
      const btnTrainVil = document.createElement('button');
      btnTrainVil.className = 'action-btn';
      btnTrainVil.title = 'Train Villager (50 Food)';
      btnTrainVil.innerHTML = `<span class="icon">👨‍🌾</span><span class="key-hint">Villager (50🌾)</span>`;
      btnTrainVil.onclick = () => {
        const res = context.queueUnit('VILLAGER', this.game.player);
        if (!res.success) {
          this.addFloatingText(context.x, context.y - 40, res.reason, '#ef4444');
        } else {
          this.addFloatingText(context.x, context.y - 40, 'Queue: Villager 👨‍🌾', '#38bdf8');
        }
      };
      this.actionGrid.appendChild(btnTrainVil);
    }
    // 3. Barracks Selected -> Train Swordsman / Archer / Knight
    else if (context.buildingType === 'BARRACKS' && context.faction === 'PLAYER') {
      const btnTrainSword = document.createElement('button');
      btnTrainSword.className = 'action-btn';
      btnTrainSword.title = 'Train Swordsman (60 Food, 20 Gold) - Frontline infantry';
      btnTrainSword.innerHTML = `<span class="icon">⚔️</span><span class="key-hint">Sword (60🌾 20🪙)</span>`;
      btnTrainSword.onclick = () => {
        const res = context.queueUnit('SWORDSMAN', this.game.player);
        if (!res.success) {
          this.addFloatingText(context.x, context.y - 40, res.reason, '#ef4444');
        } else {
          this.addFloatingText(context.x, context.y - 40, 'Queue: Swordsman ⚔️', '#38bdf8');
        }
      };
      this.actionGrid.appendChild(btnTrainSword);

      const btnTrainArch = document.createElement('button');
      btnTrainArch.className = 'action-btn';
      btnTrainArch.title = 'Train Archer (40 Food, 45 Wood) - Long range scout';
      btnTrainArch.innerHTML = `<span class="icon">🏹</span><span class="key-hint">Archer (40🌾 45🪵)</span>`;
      btnTrainArch.onclick = () => {
        const res = context.queueUnit('ARCHER', this.game.player);
        if (!res.success) {
          this.addFloatingText(context.x, context.y - 40, res.reason, '#ef4444');
        } else {
          this.addFloatingText(context.x, context.y - 40, 'Queue: Archer 🏹', '#38bdf8');
        }
      };
      this.actionGrid.appendChild(btnTrainArch);

      const btnTrainKnight = document.createElement('button');
      btnTrainKnight.className = 'action-btn';
      btnTrainKnight.title = 'Train Knight (85 Food, 60 Gold) - Fast heavy cavalry, counters archers';
      btnTrainKnight.innerHTML = `<span class="icon">🏇</span><span class="key-hint">Knight (85🌾 60🪙)</span>`;
      btnTrainKnight.onclick = () => {
        const res = context.queueUnit('KNIGHT', this.game.player);
        if (!res.success) {
          this.addFloatingText(context.x, context.y - 40, res.reason, '#ef4444');
        } else {
          this.addFloatingText(context.x, context.y - 40, 'Queue: Knight 🏇', '#38bdf8');
        }
      };
      this.actionGrid.appendChild(btnTrainKnight);
    }
    // 4. Blacksmith Selected -> Research Tech Tree
    else if (context.buildingType === 'BLACKSMITH' && context.faction === 'PLAYER') {
      const upgrades = ['FORGED_BLADES', 'SCALE_ARMOR', 'BODKIN_ARROWS', 'WHEELBARROW'];
      for (const upId of upgrades) {
        const up = UPGRADE_CONFIG[upId];
        const isDone = this.game.playerUpgrades.has(upId);
        const btn = document.createElement('button');
        btn.className = 'action-btn btn-research';
        btn.title = `${up.name}: ${up.desc}`;

        if (isDone) {
          btn.innerHTML = `<span class="icon">${up.avatar}</span><span class="key-hint" style="color: #22c55e;">✓ Researched</span>`;
          btn.style.opacity = '0.6';
          btn.disabled = true;
        } else {
          btn.innerHTML = `<span class="icon">${up.avatar}</span><span class="key-hint">${up.name}</span>`;
          btn.onclick = () => {
            const res = context.queueResearch(upId, this.game.player, this.game.playerUpgrades);
            if (!res.success) {
              this.addFloatingText(context.x, context.y - 40, res.reason, '#ef4444');
            } else {
              this.addFloatingText(context.x, context.y - 40, `Researching ${up.name}! ⚒️`, '#c084fc');
              if (this.game.sound) this.game.sound.playHammer();
            }
          };
        }
        this.actionGrid.appendChild(btn);
      }
    }
    // 5. Default Military / Units -> Stop
    else if (context.faction === 'PLAYER') {
      const btnStop = document.createElement('button');
      btnStop.className = 'action-btn';
      btnStop.innerHTML = `<span class="icon">🛑</span><span class="key-hint">Stop (S)</span>`;
      btnStop.onclick = () => this.game.stopSelected();
      this.actionGrid.appendChild(btnStop);
    }
  }

  renderWorldOverlays(ctx) {
    // Pings
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

    // Sparkles
    for (const sp of this.sparkles) {
      ctx.save();
      ctx.fillStyle = sp.color;
      ctx.globalAlpha = Math.max(0, sp.opacity);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Floating text notifications
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

    // Building Placement Preview Blueprint
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

        // Tower attack range indicator ring preview
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
        if (type === 2) ctx.fillStyle = '#1e4875';
        else if (type === 1) ctx.fillStyle = '#65533b';
        else if (type === 3) ctx.fillStyle = '#4b5563';
        else ctx.fillStyle = '#2f5523';
        ctx.fillRect(c * scaleX, r * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
      }
    }

    // Minimap Radar Pings (Raids / Combat)
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
      // If enemy building, only render if explored
      if (b.faction === 'ENEMY' && this.game.fog && !this.game.fog.isExplored(b.x, b.y)) {
        continue;
      }
      const bX = (b.x / map.width) * w;
      const bY = (b.y / map.height) * h;
      ctx.fillStyle = b.faction === 'PLAYER' ? '#3b82f6' : '#ef4444';
      ctx.fillRect(bX - 3.5, bY - 3.5, 7, 7);
    }

    // Units
    for (const unit of this.game.units) {
      if (unit.isDead || unit.isDying) continue;
      // If enemy unit, ONLY render if currently visible under Fog of War!
      if (unit.faction === 'ENEMY' && this.game.fog && !this.game.fog.isVisible(unit.x, unit.y)) {
        continue;
      }
      const unitNormX = unit.x / map.width;
      const unitNormY = unit.y / map.height;

      ctx.fillStyle = unit.faction === 'PLAYER' ? '#67e8f9' : '#f87171';
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
