import { Building } from '../entities/Building.js';

export class EnemyAI {
  constructor(game) {
    this.game = game;

    this.difficulty = 'NORMAL'; // 'EASY' | 'NORMAL' | 'HARD'

    this.trainTimer = 0;
    this.raidTimer = 0;
    this.raidCount = 0;
    this.hasAlertedRaid = false;

    // AI Base expansion state
    this.hasBuiltTower = false;
    this.towerBuildTimer = 0;
  }

  setDifficulty(level) {
    this.difficulty = level;
    console.log(`⚔️ AI Difficulty changed to: ${level}`);
  }

  getDifficultyConfig() {
    switch (this.difficulty) {
      case 'EASY':
        return {
          firstRaid: 80.0,
          raidInterval: 60.0,
          trainInterval: 22.0,
          composition: ['SWORDSMAN', 'ARCHER'],
          buildTower: false
        };
      case 'HARD':
        return {
          firstRaid: 45.0,
          raidInterval: 34.0,
          trainInterval: 12.0,
          composition: ['SWORDSMAN', 'ARCHER', 'KNIGHT', 'KNIGHT'],
          buildTower: true
        };
      case 'NORMAL':
      default:
        return {
          firstRaid: 60.0,
          raidInterval: 46.0,
          trainInterval: 17.0,
          composition: ['SWORDSMAN', 'SWORDSMAN', 'ARCHER', 'KNIGHT'],
          buildTower: true
        };
    }
  }

  update(dt) {
    const enemyTC = this.game.buildings.find(b => b.faction === 'ENEMY' && b.buildingType === 'TOWN_CENTER' && !b.isDead);
    if (!enemyTC) return; // Enemy headquarters destroyed!

    const config = this.getDifficultyConfig();
    const enemyBarracks = this.game.buildings.find(b => b.faction === 'ENEMY' && b.buildingType === 'BARRACKS' && !b.isDead);

    // 1. Train Reinforcements
    this.trainTimer += dt;
    if (this.trainTimer >= config.trainInterval && enemyBarracks && enemyBarracks.queue.length === 0) {
      this.trainTimer = 0;
      const choices = config.composition;
      const unitToTrain = choices[Math.floor(Math.random() * choices.length)];
      enemyBarracks.queue.push({
        type: 'UNIT',
        id: unitToTrain,
        duration: 8,
        name: unitToTrain
      });
    }

    // 2. Base Defense Tower construction (Normal/Hard)
    if (config.buildTower && !this.hasBuiltTower) {
      this.towerBuildTimer += dt;
      if (this.towerBuildTimer >= 35.0) {
        this.hasBuiltTower = true;
        // Build a defensive watch tower guarding the approach
        const tower = new Building(1620, 1680, 'WATCH_TOWER', 'ENEMY', true);
        this.game.buildings.push(tower);
      }
    }

    // 3. Mobilize Raid Waves
    this.raidTimer += dt;
    const currentRaidThreshold = this.raidCount === 0 ? config.firstRaid : config.raidInterval;

    // Warning alert 6 seconds before raid
    if (this.raidTimer >= currentRaidThreshold - 6 && !this.hasAlertedRaid) {
      this.hasAlertedRaid = true;
      this.game.hud.showAlert('⚠️ ENEMY SCOUTS SPOTTED! Prepare your defenses for an incoming invasion!');
      if (this.game.sound) this.game.sound.playAlarm();
      this.game.hud.addMinimapPing(enemyTC.x, enemyTC.y, '#ef4444');
    }

    if (this.raidTimer >= currentRaidThreshold) {
      this.raidTimer = 0;
      this.hasAlertedRaid = false;
      this.raidCount++;

      this.launchRaid();
    }

    // 4. Base Defense: Rally defenders when base is under attack
    this.rallyDefendersIfAttacked();
  }

  launchRaid() {
    const playerTC = this.game.buildings.find(b => b.faction === 'PLAYER' && b.buildingType === 'TOWN_CENTER' && !b.isDead);
    if (!playerTC) return;

    // Gather idle enemy military units
    const enemyWarriors = this.game.units.filter(u => u.faction === 'ENEMY' && !u.isDead && !u.isDying);

    if (enemyWarriors.length > 0) {
      this.game.hud.showAlert(`⚔️ INCOMING RAID! ${enemyWarriors.length} Enemy troops are marching on your realm!`);
      if (this.game.sound) this.game.sound.playAlarm();
      this.game.hud.addMinimapPing(enemyWarriors[0].x, enemyWarriors[0].y, '#ef4444');

      // Pick high-value targets: player towers, resource-gathering villagers, or town center
      const playerTowers = this.game.buildings.filter(b => b.faction === 'PLAYER' && b.buildingType === 'WATCH_TOWER' && !b.isDead);
      const playerVillagers = this.game.units.filter(u => u.faction === 'PLAYER' && u.unitType === 'VILLAGER' && !u.isDead);

      enemyWarriors.forEach((warrior, idx) => {
        let primaryTarget = playerTC;

        // Knights attack exposed villagers or flank around
        if (warrior.unitType === 'KNIGHT' && playerVillagers.length > 0 && Math.random() > 0.4) {
          primaryTarget = playerVillagers[Math.floor(Math.random() * playerVillagers.length)];
        } else if (playerTowers.length > 0 && Math.random() > 0.5) {
          primaryTarget = playerTowers[0];
        }

        warrior.orderAttack(primaryTarget);
      });
    }
  }

  rallyDefendersIfAttacked() {
    const enemyUnits = this.game.units.filter(u => u.faction === 'ENEMY' && !u.isDead && !u.isDying);
    const enemyBuildings = this.game.buildings.filter(b => b.faction === 'ENEMY' && !b.isDead);

    for (const b of enemyBuildings) {
      if (b.hp < b.maxHp) {
        const attacker = this.findNearestPlayerUnit(b.x, b.y);
        if (attacker) {
          for (const u of enemyUnits) {
            if (u.state !== 'ATTACKING') {
              u.orderAttack(attacker);
            }
          }
        }
      }
    }
  }

  findNearestPlayerUnit(x, y) {
    let nearest = null;
    let minDist = 380;
    for (const u of this.game.units) {
      if (u.faction === 'PLAYER' && !u.isDead && !u.isDying) {
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
