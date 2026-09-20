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
    this.activeFactions = [];
    this.factionStates = {};
  }

  setDifficulty(level) {
    this.difficulty = level;
    console.log(`⚔️ AI Difficulty set to: ${level}`);
  }

  initFactions(factionsList = []) {
    this.activeFactions = factionsList;
    this.factionStates = {};

    for (let i = 0; i < this.activeFactions.length; i++) {
      const f = this.activeFactions[i];
      const stagger = i * 14.0;
      this.factionStates[f.id] = {
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
          firstRaid: 80.0,
          raidInterval: 60.0,
          trainInterval: 20.0,
          composition: ['SWORDSMAN', 'ARCHER'],
          buildTower: false
        };
      case 'HARD':
        return {
          firstRaid: 40.0,
          raidInterval: 30.0,
          trainInterval: 10.0,
          composition: ['SWORDSMAN', 'ARCHER', 'KNIGHT', 'KNIGHT'],
          buildTower: true
        };
      case 'NORMAL':
      default:
        return {
          firstRaid: 60.0,
          raidInterval: 42.0,
          trainInterval: 15.0,
          composition: ['SWORDSMAN', 'SWORDSMAN', 'ARCHER', 'KNIGHT'],
          buildTower: true
        };
    }
  }

  update(dt) {
    const config = this.getDifficultyConfig();

    for (const factionInfo of this.activeFactions) {
      const factionId = factionInfo.id;
      const state = this.factionStates[factionId];
      if (!state) continue;

      // Check if this faction's Town Center is still standing
      const tc = this.game.buildings.find(
        b => b.faction === factionId && b.buildingType === 'TOWN_CENTER' && !b.isDead
      );
      if (!tc) continue; // Conquered!

      const barracks = this.game.buildings.find(
        b => b.faction === factionId && b.buildingType === 'BARRACKS' && !b.isDead
      );

      // 1. Train Reinforcements
      state.trainTimer += dt;
      if (state.trainTimer >= config.trainInterval && barracks && barracks.queue.length === 0) {
        state.trainTimer = 0;
        const choices = config.composition;
        const unitToTrain = choices[Math.floor(Math.random() * choices.length)];
        barracks.queue.push({
          type: 'UNIT',
          id: unitToTrain,
          duration: 7,
          name: unitToTrain
        });
      }

      // 2. Base Defense Tower construction
      if (config.buildTower && !state.hasBuiltTower) {
        state.towerTimer += dt;
        if (state.towerTimer >= 28.0) {
          state.hasBuiltTower = true;
          const offsetX = (tc.x > this.game.map.width * 0.5) ? -90 : 90;
          const offsetY = (tc.y > this.game.map.height * 0.5) ? -90 : 90;
          const tower = new Building(tc.x + offsetX, tc.y + offsetY, 'WATCH_TOWER', factionId, true);
          tower.customColor = factionInfo.color;
          tower.isAlly = (factionInfo.diplomacy === 'ALLY');
          this.game.buildings.push(tower);
        }
      }

      // 3. Mobilize Strikes & Raids
      state.raidTimer += dt;
      const threshold = state.raidCount === 0 ? config.firstRaid : config.raidInterval;

      // Warning alert 5 seconds before hostile raid
      if (factionInfo.diplomacy === 'ENEMY' && state.raidTimer >= threshold - 5 && !state.hasAlertedRaid) {
        state.hasAlertedRaid = true;
        this.game.hud.showAlert(`⚠️ INCOMING RAID: ${factionInfo.name} scouts spotted marching across the bridges!`);
        if (this.game.sound) this.game.sound.playAlarm();
        this.game.hud.addMinimapPing(tc.x, tc.y, factionInfo.color);
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
    // Gather idle military troops of this faction
    const warriors = this.game.units.filter(
      u => u.faction === factionId && !u.isDead && !u.isDying
    );
    if (warriors.length === 0) return;

    // Determine target based on diplomacy
    if (factionInfo.diplomacy === 'ALLY') {
      // Allied kingdom attacks an Enemy stronghold!
      const enemyTCs = this.game.buildings.filter(
        b => this.game.isHostile({ faction: factionId }, b) && b.buildingType === 'TOWN_CENTER' && !b.isDead
      );
      if (enemyTCs.length === 0) return;

      const targetTC = enemyTCs[Math.floor(Math.random() * enemyTCs.length)];
      this.game.hud.showAlert(`🤝 Your ally, the ${factionInfo.name}, has mobilized ${warriors.length} warriors to assault the enemy!`);
      this.game.hud.addMinimapPing(warriors[0].x, warriors[0].y, factionInfo.color);

      for (const warrior of warriors) {
        warrior.orderAttack(targetTC);
      }
    } else {
      // Enemy kingdom targets Player or Allied bases
      const hostileTCs = this.game.buildings.filter(
        b => this.game.isHostile({ faction: factionId }, b) && b.buildingType === 'TOWN_CENTER' && !b.isDead
      );
      if (hostileTCs.length === 0) return;

      const primaryTC = hostileTCs[Math.floor(Math.random() * hostileTCs.length)];

      this.game.hud.showAlert(`⚔️ ${factionInfo.name} has launched a war party of ${warriors.length} troops!`);
      if (this.game.sound) this.game.sound.playAlarm();
      this.game.hud.addMinimapPing(warriors[0].x, warriors[0].y, factionInfo.color);

      // Pick targets: villagers, towers, or town center
      const hostileVillagers = this.game.units.filter(
        u => this.game.isHostile({ faction: factionId }, u) && u.unitType === 'VILLAGER' && !u.isDead
      );
      const hostileTowers = this.game.buildings.filter(
        b => this.game.isHostile({ faction: factionId }, b) && b.buildingType === 'WATCH_TOWER' && !b.isDead
      );

      for (const warrior of warriors) {
        let chosenTarget = primaryTC;
        if (warrior.unitType === 'KNIGHT' && hostileVillagers.length > 0 && Math.random() > 0.4) {
          chosenTarget = hostileVillagers[Math.floor(Math.random() * hostileVillagers.length)];
        } else if (hostileTowers.length > 0 && Math.random() > 0.5) {
          chosenTarget = hostileTowers[0];
        }
        warrior.orderAttack(chosenTarget);
      }
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
      if (this.game.isHostile({ faction: factionId }, u) && !u.isDead && !u.isDying) {
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
