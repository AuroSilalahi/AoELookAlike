import { Building } from '../entities/Building.js';

export const ENEMY_FACTIONS = [
  { id: 'ENEMY_1', name: 'Crimson Horde', color: '#dc2626', flag: '🚩' },
  { id: 'ENEMY_2', name: 'Amethyst Empire', color: '#9333ea', flag: '🟣' },
  { id: 'ENEMY_3', name: 'Solar Khanate', color: '#ea580c', flag: '☀️' },
  { id: 'ENEMY_4', name: 'Verdant Sultanate', color: '#0d9488', flag: '🟢' }
];

export class EnemyAI {
  constructor(game) {
    this.game = game;

    this.difficulty = 'NORMAL'; // 'EASY' | 'NORMAL' | 'HARD'
    this.activeEnemyCount = 1;

    // Track state per active enemy faction
    this.factionStates = {};
  }

  setDifficulty(level) {
    this.difficulty = level;
    console.log(`⚔️ AI Difficulty set to: ${level}`);
  }

  initFactions(count = 1) {
    this.activeEnemyCount = Math.max(1, Math.min(4, count));
    this.factionStates = {};

    for (let i = 0; i < this.activeEnemyCount; i++) {
      const faction = ENEMY_FACTIONS[i].id;
      // Stagger raid times so raids are dynamic and thrilling
      const stagger = i * 15.0;
      this.factionStates[faction] = {
        trainTimer: i * 3.0,
        raidTimer: -stagger,
        raidCount: 0,
        hasAlertedRaid: false,
        hasBuiltTower: false,
        towerTimer: 0
      };
    }
  }

  getDifficultyConfig() {
    switch (this.difficulty) {
      case 'EASY':
        return {
          firstRaid: 85.0,
          raidInterval: 65.0,
          trainInterval: 22.0,
          composition: ['SWORDSMAN', 'ARCHER'],
          buildTower: false
        };
      case 'HARD':
        return {
          firstRaid: 45.0,
          raidInterval: 32.0,
          trainInterval: 11.0,
          composition: ['SWORDSMAN', 'ARCHER', 'KNIGHT', 'KNIGHT'],
          buildTower: true
        };
      case 'NORMAL':
      default:
        return {
          firstRaid: 65.0,
          raidInterval: 45.0,
          trainInterval: 16.0,
          composition: ['SWORDSMAN', 'SWORDSMAN', 'ARCHER', 'KNIGHT'],
          buildTower: true
        };
    }
  }

  update(dt) {
    const config = this.getDifficultyConfig();

    for (let i = 0; i < this.activeEnemyCount; i++) {
      const factionInfo = ENEMY_FACTIONS[i];
      const factionId = factionInfo.id;
      const state = this.factionStates[factionId];
      if (!state) continue;

      // Check if this enemy's headquarters is still standing
      const enemyTC = this.game.buildings.find(
        b => b.faction === factionId && b.buildingType === 'TOWN_CENTER' && !b.isDead
      );
      if (!enemyTC) continue; // Conquered!

      const enemyBarracks = this.game.buildings.find(
        b => b.faction === factionId && b.buildingType === 'BARRACKS' && !b.isDead
      );

      // 1. Train Reinforcements
      state.trainTimer += dt;
      if (state.trainTimer >= config.trainInterval && enemyBarracks && enemyBarracks.queue.length === 0) {
        state.trainTimer = 0;
        const choices = config.composition;
        const unitToTrain = choices[Math.floor(Math.random() * choices.length)];
        enemyBarracks.queue.push({
          type: 'UNIT',
          id: unitToTrain,
          duration: 7,
          name: unitToTrain
        });
      }

      // 2. Base Defense Tower construction
      if (config.buildTower && !state.hasBuiltTower) {
        state.towerTimer += dt;
        if (state.towerTimer >= 30.0 + i * 10) {
          state.hasBuiltTower = true;
          const towerX = enemyTC.x + (enemyTC.x > 2000 ? -80 : 80);
          const towerY = enemyTC.y + (enemyTC.y > 2000 ? -80 : 80);
          const tower = new Building(towerX, towerY, 'WATCH_TOWER', factionId, true);
          this.game.buildings.push(tower);
        }
      }

      // 3. Mobilize Raids
      state.raidTimer += dt;
      const threshold = state.raidCount === 0 ? config.firstRaid : config.raidInterval;

      // Warning alert 6 seconds before raid
      if (state.raidTimer >= threshold - 6 && !state.hasAlertedRaid) {
        state.hasAlertedRaid = true;
        this.game.hud.showAlert(`⚠️ INCOMING RAID: ${factionInfo.name} scouts spotted marching across the bridges!`);
        if (this.game.sound) this.game.sound.playAlarm();
        this.game.hud.addMinimapPing(enemyTC.x, enemyTC.y, factionInfo.color);
      }

      if (state.raidTimer >= threshold) {
        state.raidTimer = 0;
        state.hasAlertedRaid = false;
        state.raidCount++;

        this.launchRaid(factionId, factionInfo);
      }

      // 4. Rally defenders if faction base is attacked
      this.rallyDefenders(factionId);
    }
  }

  launchRaid(factionId, factionInfo) {
    const playerTC = this.game.buildings.find(
      b => b.faction === 'PLAYER' && b.buildingType === 'TOWN_CENTER' && !b.isDead
    );
    if (!playerTC) return;

    // Gather idle military troops of this faction
    const warriors = this.game.units.filter(
      u => u.faction === factionId && !u.isDead && !u.isDying
    );

    if (warriors.length > 0) {
      this.game.hud.showAlert(`⚔️ ${factionInfo.name} has launched a war party of ${warriors.length} troops!`);
      if (this.game.sound) this.game.sound.playAlarm();
      this.game.hud.addMinimapPing(warriors[0].x, warriors[0].y, factionInfo.color);

      // Target selection: player towers, gather lines, or town center
      const playerTowers = this.game.buildings.filter(
        b => b.faction === 'PLAYER' && b.buildingType === 'WATCH_TOWER' && !b.isDead
      );
      const playerVillagers = this.game.units.filter(
        u => u.faction === 'PLAYER' && u.unitType === 'VILLAGER' && !u.isDead
      );

      warriors.forEach((warrior) => {
        let primaryTarget = playerTC;

        // Knights target vulnerable workers
        if (warrior.unitType === 'KNIGHT' && playerVillagers.length > 0 && Math.random() > 0.4) {
          primaryTarget = playerVillagers[Math.floor(Math.random() * playerVillagers.length)];
        } else if (playerTowers.length > 0 && Math.random() > 0.5) {
          primaryTarget = playerTowers[0];
        }

        warrior.orderAttack(primaryTarget);
      });
    }
  }

  rallyDefenders(factionId) {
    const units = this.game.units.filter(u => u.faction === factionId && !u.isDead && !u.isDying);
    const buildings = this.game.buildings.filter(b => b.faction === factionId && !b.isDead);

    for (const b of buildings) {
      if (b.hp < b.maxHp) {
        const attacker = this.findNearestHostileTo(b.x, b.y, factionId);
        if (attacker) {
          for (const u of units) {
            if (u.state !== 'ATTACKING') {
              u.orderAttack(attacker);
            }
          }
        }
      }
    }
  }

  findNearestHostileTo(x, y, factionId) {
    let nearest = null;
    let minDist = 400;
    for (const u of this.game.units) {
      if (u.faction !== factionId && !u.isDead && !u.isDying) {
        const d = Math.hypot(u.x - x, u.y - y);
        if (d < minDist) {
          minDist = d;
          nearest = u;
        }
      }
    }
    return nearest;
  }
}
