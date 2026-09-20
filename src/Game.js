import { Camera } from './engine/Camera.js';
import { Input } from './engine/Input.js';
import { TileMap } from './map/TileMap.js';
import { Pathfinder } from './map/Pathfinder.js';
import { FogOfWar } from './map/FogOfWar.js';
import { Effects } from './engine/Effects.js';
import { Unit } from './entities/Unit.js';
import { Building, BUILDING_TYPES, UPGRADE_CONFIG } from './entities/Building.js';
import { ResourceNode } from './entities/ResourceNode.js';
import { HUD } from './ui/HUD.js';
import { SoundFX } from './audio/SoundFX.js';
import { EnemyAI, ENEMY_FACTIONS } from './ai/EnemyAI.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Audio, AI & Effects
    this.sound = new SoundFX();
    this.enemyAI = new EnemyAI(this);
    this.effects = new Effects();

    // Match Config
    this.playerCiv = 'JAPANESE';
    this.mapType = 'RIVER_VALLEY';
    this.enemyCount = 4;

    // Player State & Tech
    this.player = {
      food: 300,
      wood: 250,
      gold: 150,
      pop: 5,
      maxPop: 10
    };
    this.playerUpgrades = new Set();

    // Game Statistics
    this.stats = {
      time: 0,
      trained: 5,
      vanquished: 0
    };

    this.isGameOver = false;
    this.lastAlertPos = { x: 650, y: 3150 };

    // World & Systems (80x80 tiles = 3840 x 3840 px)
    this.map = new TileMap(80, 80, 48, this.mapType);
    this.fog = new FogOfWar(80, 80, 48);
    this.pathfinder = new Pathfinder(this.map);
    this.camera = new Camera(this.canvas, this.map.width, this.map.height);
    this.input = new Input(this.canvas, this.camera);
    this.hud = new HUD(this);

    // Collections
    this.units = [];
    this.buildings = [];
    this.resources = [];
    this.projectiles = [];
    this.selectedEntities = [];

    // Placement Mode
    this.placementMode = {
      active: false,
      buildingType: null,
      snappedX: 0,
      snappedY: 0,
      isValid: false
    };

    this.lastTime = 0;
    this.elapsedSeconds = 0;
    this.idleVillagerIndex = 0;
    this.resourceRegrowthTimer = 0;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.setupInputHandlers();

    // Start default match
    this.startNewMatch(this.playerCiv, this.mapType, this.enemyCount, 'NORMAL');

    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  startNewMatch(civId = 'JAPANESE', mapType = 'RIVER_VALLEY', enemyCount = 4, difficulty = 'NORMAL') {
    this.playerCiv = civId;
    this.mapType = mapType;
    this.enemyCount = Math.max(1, Math.min(4, enemyCount));
    this.isGameOver = false;
    this.elapsedSeconds = 0;
    this.stats = { time: 0, trained: 5, vanquished: 0 };
    this.playerUpgrades.clear();

    // 1. Rebuild Map & World Systems
    this.map.generateMap(mapType);
    this.fog = new FogOfWar(80, 80, 48);
    this.pathfinder = new Pathfinder(this.map);
    this.camera = new Camera(this.canvas, this.map.width, this.map.height);
    this.input.camera = this.camera;

    // Reset collections
    this.units = [];
    this.buildings = [];
    this.resources = [];
    this.projectiles = [];
    this.selectedEntities = [];
    this.cancelPlacement();

    // 2. Initialize Resources with Civ bonuses
    this.player = {
      food: civId === 'CHINESE' ? 320 : 300,
      wood: civId === 'CHINESE' ? 280 : 250,
      gold: 150,
      pop: 5,
      maxPop: 10
    };

    // 3. Initialize AI
    this.enemyAI.setDifficulty(difficulty);
    this.enemyAI.initFactions(this.enemyCount);

    // 4. Spawn Player & Enemy Kingdoms
    this.spawnKingdomsAndResources();

    // 5. Update HUD Banner
    this.hud.setCivilizationBanner(civId);
    this.hud.showAlert(`⚔️ Campaign started as ${this.hud.civName.textContent} on ${mapType.replace('_', ' ')}!`);

    // Focus Camera on Player Town Center
    this.camera.x = 650;
    this.camera.y = 3150;
    this.camera.clamp();

    // Initial Fog of War calculation
    const friendlyUnits = this.units.filter(u => u.faction === 'PLAYER');
    const friendlyBuildings = this.buildings.filter(b => b.faction === 'PLAYER');
    this.fog.update(friendlyUnits, friendlyBuildings);
  }

  spawnKingdomsAndResources() {
    // ==========================================
    // 1. PLAYER BASE (Bottom-Left Sector: 650, 3150)
    // ==========================================
    const pX = 650;
    const pY = 3150;
    const playerTC = new Building(pX, pY, 'TOWN_CENTER', 'PLAYER', true);
    this.buildings.push(playerTC);

    // Starting Units (Chinese gets +3 starting villagers!)
    const vilCount = this.playerCiv === 'CHINESE' ? 6 : 3;
    for (let i = 0; i < vilCount; i++) {
      const v = new Unit(pX - 60 + i * 26, pY + 70 + (i % 2) * 20, 'VILLAGER', 'PLAYER');
      v.applyCivBonuses(this.playerCiv);
      this.units.push(v);
    }
    const s1 = new Unit(pX + 60, pY + 80, 'SWORDSMAN', 'PLAYER');
    const s2 = new Unit(pX + 90, pY + 95, 'SWORDSMAN', 'PLAYER');
    s1.applyCivBonuses(this.playerCiv);
    s2.applyCivBonuses(this.playerCiv);
    this.units.push(s1);
    this.units.push(s2);

    // Surrounding Player Forests (Abundant 220 Wood trees!)
    this.spawnForestGrove(pX - 180, pY - 80, 10, 220);
    this.spawnForestGrove(pX - 80, pY - 180, 10, 220);
    // Player Gold Mines (600 Gold each)
    this.resources.push(new ResourceNode(pX + 180, pY - 80, 'GOLD', 600));
    this.resources.push(new ResourceNode(pX + 230, pY - 50, 'GOLD', 550));
    // Berry Bushes
    this.resources.push(new ResourceNode(pX + 160, pY + 120, 'FOOD', 300));
    this.resources.push(new ResourceNode(pX + 200, pY + 150, 'FOOD', 300));

    // ==========================================
    // 2. ENEMY BASES (Up to 4 Factions in other quadrants)
    // ==========================================
    const enemySpawns = [
      { id: 'ENEMY_1', x: 3150, y: 650 },  // Top-Right
      { id: 'ENEMY_2', x: 650, y: 650 },   // Top-Left
      { id: 'ENEMY_3', x: 3150, y: 3150 }, // Bottom-Right
      { id: 'ENEMY_4', x: 1900, y: 650 }   // Top-Center
    ];

    for (let i = 0; i < this.enemyCount; i++) {
      const spawn = enemySpawns[i];
      const faction = spawn.id;

      // Enemy Fortress & Barracks
      const eTC = new Building(spawn.x, spawn.y, 'TOWN_CENTER', faction, true);
      const eBarracks = new Building(spawn.x - 100, spawn.y + 60, 'BARRACKS', faction, true);
      this.buildings.push(eTC);
      this.buildings.push(eBarracks);

      // Enemy Starting Garrison
      this.units.push(new Unit(spawn.x + 50, spawn.y + 70, 'SWORDSMAN', faction));
      this.units.push(new Unit(spawn.x + 80, spawn.y + 85, 'SWORDSMAN', faction));
      this.units.push(new Unit(spawn.x - 40, spawn.y + 90, 'ARCHER', faction));
      this.units.push(new Unit(spawn.x + 20, spawn.y + 110, 'ARCHER', faction));

      // Enemy territory resources
      this.spawnForestGrove(spawn.x + 150, spawn.y - 60, 8, 200);
      this.resources.push(new ResourceNode(spawn.x - 160, spawn.y - 60, 'GOLD', 600));
      this.resources.push(new ResourceNode(spawn.x + 120, spawn.y + 140, 'FOOD', 300));
    }

    // ==========================================
    // 3. EXPANSIVE CENTRAL RESOURCES (Wild forests & gold seams)
    // ==========================================
    const neutralGroves = [
      [1400, 1500], [1800, 1400], [2200, 1600],
      [1300, 2300], [1900, 2400], [2500, 2200],
      [1900, 1900], [900, 1900], [2900, 1900]
    ];
    for (const [gx, gy] of neutralGroves) {
      this.spawnForestGrove(gx, gy, 8, 220);
    }

    // High yield gold outcrops
    const neutralGold = [
      [1600, 1600], [2200, 1400], [1600, 2200],
      [2200, 2300], [1900, 1750], [1900, 2050]
    ];
    for (const [mx, my] of neutralGold) {
      this.resources.push(new ResourceNode(mx, my, 'GOLD', 650));
    }

    // Forage berry groves
    const neutralBerries = [
      [1700, 1850], [2100, 1950], [1400, 1900], [2400, 1900]
    ];
    for (const [bx, by] of neutralBerries) {
      this.resources.push(new ResourceNode(bx, by, 'FOOD', 300));
    }
  }

  spawnForestGrove(centerX, centerY, count = 8, woodPerTree = 200) {
    for (let i = 0; i < count; i++) {
      const ox = (Math.random() - 0.5) * 120;
      const oy = (Math.random() - 0.5) * 120;
      const tx = Math.max(100, Math.min(this.map.width - 100, centerX + ox));
      const ty = Math.max(100, Math.min(this.map.height - 100, centerY + oy));
      if (this.map.isWalkable(tx, ty)) {
        this.resources.push(new ResourceNode(tx, ty, 'WOOD', woodPerTree));
      }
    }
  }

  startPlacement(buildingType) {
    const config = BUILDING_TYPES[buildingType];
    if (!config) return;

    let woodCost = config.cost.wood || 0;
    let goldCost = config.cost.gold || 0;
    if (this.playerCiv === 'CHINESE' && woodCost > 0) {
      woodCost = Math.round(woodCost * 0.8); // 20% cheaper wood
    }

    if (woodCost && this.player.wood < woodCost) {
      this.hud.addFloatingText(this.camera.x, this.camera.y, `Need ${woodCost} Wood!`, '#ef4444');
      return;
    }
    if (goldCost && this.player.gold < goldCost) {
      this.hud.addFloatingText(this.camera.x, this.camera.y, `Need ${goldCost} Gold!`, '#ef4444');
      return;
    }

    this.placementMode.active = true;
    this.placementMode.buildingType = buildingType;
  }

  cancelPlacement() {
    this.placementMode.active = false;
    this.placementMode.buildingType = null;
  }

  checkPlacementValidity(x, y, radius) {
    const step = 16;
    for (let ox = -radius; ox <= radius; ox += step) {
      for (let oy = -radius; oy <= radius; oy += step) {
        if (!this.map.isWalkable(x + ox, y + oy)) return false;
      }
    }

    for (const b of this.buildings) {
      if (!b.isDead && Math.hypot(b.x - x, b.y - y) < b.radius + radius + 10) return false;
    }
    for (const r of this.resources) {
      if (!r.isDead && Math.hypot(r.x - x, r.y - y) < r.radius + radius + 8) return false;
    }

    const config = BUILDING_TYPES[this.placementMode.buildingType];
    let woodCost = config.cost.wood || 0;
    let goldCost = config.cost.gold || 0;
    if (this.playerCiv === 'CHINESE' && woodCost > 0) {
      woodCost = Math.round(woodCost * 0.8);
    }
    if (woodCost && this.player.wood < woodCost) return false;
    if (goldCost && this.player.gold < goldCost) return false;

    return true;
  }

  onBuildingCompleted(building) {
    this.hud.addFloatingText(building.x, building.y - 30, `${building.name} Completed! 🔨`, '#38bdf8');
    if (this.sound) this.sound.playBuildingComplete();
    if (this.effects) this.effects.addWoodChips(building.x, building.y);

    if (building.buildingType === 'HOUSE') {
      this.player.maxPop += building.config.popProvided || 5;
      this.hud.addFloatingText(building.x, building.y - 48, `+5 Max Pop! 👥`, '#22c55e');
    }

    // Apply active upgrades to newly completed building (e.g. towers get Arrow Slits)
    if (building.faction === 'PLAYER') {
      building.applyUpgrades(this.playerUpgrades);
      if (this.playerCiv === 'KOREAN' && (building.isFortress || building.buildingType === 'WATCH_TOWER')) {
        building.volleyArrows += 2;
        building.attackRange = Math.round(building.attackRange * 1.25);
      }
    }
  }

  onUpgradeCompleted(upgradeId, faction) {
    if (faction === 'PLAYER') {
      this.playerUpgrades.add(upgradeId);
      const info = UPGRADE_CONFIG[upgradeId];
      this.hud.showAlert(`✨ UPGRADE COMPLETE: ${info.name}! ${info.desc}`);
      if (this.sound) this.sound.playUpgradeComplete();

      // Refresh units
      for (const unit of this.units) {
        if (unit.faction === 'PLAYER') {
          unit.applyUpgrades(this.playerUpgrades);
        }
      }

      // Refresh buildings (Arrow Slits, Ballistics)
      for (const b of this.buildings) {
        if (b.faction === 'PLAYER') {
          b.applyUpgrades(this.playerUpgrades);
        }
      }
    }
  }

  spawnTrainedUnit(building, unitType) {
    const rx = building.rallyPoint.x + (Math.random() - 0.5) * 16;
    const ry = building.rallyPoint.y + (Math.random() - 0.5) * 16;

    const unit = new Unit(building.x, building.y + building.radius + 8, unitType, building.faction);

    if (building.faction === 'PLAYER') {
      unit.applyCivBonuses(this.playerCiv);
      unit.applyUpgrades(this.playerUpgrades);
      this.stats.trained++;
      this.hud.addFloatingText(building.x, building.y - 36, `+1 ${unit.name} ⚔️`, '#38bdf8');

      if (building.hasCustomRallyPoint) {
        unit.moveTo(rx, ry);
      }
    } else {
      unit.moveTo(rx, ry);
    }

    this.units.push(unit);
  }

  stopSelected() {
    for (const ent of this.selectedEntities) {
      if (ent.stop) ent.stop();
    }
  }

  findNearestDropoff(x, y, faction = 'PLAYER') {
    let nearest = null;
    let minDist = Infinity;

    for (const b of this.buildings) {
      if (b.faction === faction && b.isDropoff && b.isConstructed && !b.isDead) {
        const dist = Math.hypot(b.x - x, b.y - y);
        if (dist < minDist) {
          minDist = dist;
          nearest = b;
        }
      }
    }
    return nearest;
  }

  findNearestResource(x, y, resourceType) {
    let nearest = null;
    let minDist = Infinity;

    for (const r of this.resources) {
      if (r.resourceType === resourceType && !r.isDead && r.amount > 0) {
        const dist = Math.hypot(r.x - x, r.y - y);
        if (dist < minDist) {
          minDist = dist;
          nearest = r;
        }
      }
    }
    return nearest;
  }

  depositResource(type, amount, dropoffX, dropoffY) {
    let bonus = 0;
    if (this.playerCiv === 'INDIAN' && (type === 'GOLD' || type === 'FOOD')) {
      bonus = 2; // Extra resource yield
    }
    const total = amount + bonus;

    if (type === 'WOOD') {
      this.player.wood += total;
      this.hud.addFloatingText(dropoffX, dropoffY - 30, `+${total} Wood 🪵`, '#81c784');
    } else if (type === 'GOLD') {
      this.player.gold += total;
      this.hud.addFloatingText(dropoffX, dropoffY - 30, `+${total} Gold 🪙`, '#ffd54f');
    } else if (type === 'FOOD') {
      this.player.food += total;
      this.hud.addFloatingText(dropoffX, dropoffY - 30, `+${total} Food 🌾`, '#facc15');
    }
  }

  cycleIdleVillager() {
    const idleVillagers = this.units.filter(
      u => u.faction === 'PLAYER' && u.unitType === 'VILLAGER' && u.state === 'IDLE' && !u.isDead && !u.isDying
    );

    if (idleVillagers.length === 0) {
      this.hud.addFloatingText(this.camera.x, this.camera.y - 30, 'No idle villagers! All workers are busy.', '#94a3b8');
      return;
    }

    this.idleVillagerIndex = (this.idleVillagerIndex + 1) % idleVillagers.length;
    const vil = idleVillagers[this.idleVillagerIndex];

    for (const ent of this.selectedEntities) {
      ent.isSelected = false;
    }
    vil.isSelected = true;
    this.selectedEntities = [vil];

    this.camera.x = vil.x;
    this.camera.y = vil.y;
    this.camera.clamp();

    this.hud.addPing(vil.x, vil.y, '#f59e0b');
    if (this.sound) this.sound.playSelect();
  }

  setupInputHandlers() {
    this.input.onSingleSelect = (worldX, worldY) => {
      if (this.placementMode.active) {
        if (this.placementMode.isValid) {
          const type = this.placementMode.buildingType;
          const config = BUILDING_TYPES[type];

          let woodCost = config.cost.wood || 0;
          let goldCost = config.cost.gold || 0;
          if (this.playerCiv === 'CHINESE' && woodCost > 0) {
            woodCost = Math.round(woodCost * 0.8);
          }

          if (woodCost) this.player.wood -= woodCost;
          if (goldCost) this.player.gold -= goldCost;

          const newBuilding = new Building(
            this.placementMode.snappedX,
            this.placementMode.snappedY,
            type,
            'PLAYER',
            false
          );
          this.buildings.push(newBuilding);

          this.hud.addFloatingText(newBuilding.x, newBuilding.y - 30, `Placed ${newBuilding.name}!`, '#fbbf24');
          this.hud.addPing(newBuilding.x, newBuilding.y, '#f59e0b');
          if (this.effects) this.effects.addWoodChips(newBuilding.x, newBuilding.y);

          const selectedVillagers = this.selectedEntities.filter(
            e => e instanceof Unit && e.unitType === 'VILLAGER' && e.faction === 'PLAYER'
          );

          if (selectedVillagers.length > 0) {
            for (const v of selectedVillagers) {
              v.orderBuild(newBuilding);
            }
          } else {
            let nearestVil = null;
            let minDist = Infinity;
            for (const u of this.units) {
              if (u.unitType === 'VILLAGER' && u.faction === 'PLAYER' && !u.isDead && !u.isDying) {
                const d = Math.hypot(u.x - newBuilding.x, u.y - newBuilding.y);
                if (d < minDist) {
                  minDist = d;
                  nearestVil = u;
                }
              }
            }
            if (nearestVil) nearestVil.orderBuild(newBuilding);
          }

          this.cancelPlacement();
          return;
        } else {
          this.hud.addFloatingText(worldX, worldY - 20, 'Invalid placement location!', '#ef4444');
          return;
        }
      }

      // Normal Selection
      for (const ent of this.selectedEntities) {
        ent.isSelected = false;
      }
      this.selectedEntities = [];

      // Check Units
      for (const unit of this.units) {
        if (unit.isDead || unit.isDying) continue;
        if (unit.faction !== 'PLAYER' && this.fog && !this.fog.isVisible(unit.x, unit.y)) {
          continue;
        }
        if (Math.hypot(unit.x - worldX, unit.y - worldY) <= unit.radius + 8) {
          unit.isSelected = true;
          this.selectedEntities = [unit];
          if (this.sound) this.sound.playSelect();
          return;
        }
      }

      // Check Buildings
      for (const b of this.buildings) {
        if (b.isDead) continue;
        if (b.faction !== 'PLAYER' && this.fog && !this.fog.isExplored(b.x, b.y)) {
          continue;
        }
        if (Math.hypot(b.x - worldX, b.y - worldY) <= b.radius + 12) {
          b.isSelected = true;
          this.selectedEntities = [b];
          if (this.sound) this.sound.playSelect();
          return;
        }
      }

      // Check Resources
      for (const res of this.resources) {
        if (res.isDead) continue;
        if (this.fog && !this.fog.isExplored(res.x, res.y)) continue;
        if (Math.hypot(res.x - worldX, res.y - worldY) <= res.radius + 8) {
          res.isSelected = true;
          this.selectedEntities = [res];
          if (this.sound) this.sound.playSelect();
          return;
        }
      }
    };

    // Box Drag Select
    this.input.onBoxSelect = (minX, minY, maxX, maxY) => {
      if (this.placementMode.active) return;

      for (const ent of this.selectedEntities) {
        ent.isSelected = false;
      }
      this.selectedEntities = [];

      for (const unit of this.units) {
        if (unit.isDead || unit.isDying) continue;
        if (unit.faction === 'PLAYER') {
          if (unit.x >= minX && unit.x <= maxX && unit.y >= minY && unit.y <= maxY) {
            unit.isSelected = true;
            this.selectedEntities.push(unit);
          }
        }
      }

      if (this.selectedEntities.length > 0 && this.sound) {
        this.sound.playSelect();
      }
    };

    // Right-Click Context Orders
    this.input.onRightClick = (worldX, worldY) => {
      if (this.placementMode.active) {
        this.cancelPlacement();
        return;
      }

      // If a single Player building is selected, right-click sets its rally point!
      if (this.selectedEntities.length === 1 && this.selectedEntities[0] instanceof Building && this.selectedEntities[0].faction === 'PLAYER') {
        const b = this.selectedEntities[0];
        b.setRallyPoint(worldX, worldY);
        this.hud.addPing(worldX, worldY, '#3b82f6');
        this.hud.addFloatingText(worldX, worldY - 24, 'Rally Point Set! 🚩', '#3b82f6');
        if (this.sound) this.sound.playSelect();
        return;
      }

      const selectedUnits = this.selectedEntities.filter(
        ent => ent instanceof Unit && ent.faction === 'PLAYER' && !ent.isDead && !ent.isDying
      );
      if (selectedUnits.length === 0) return;

      // Attack Hostile Unit
      for (const u of this.units) {
        if (u.faction !== 'PLAYER' && !u.isDead && !u.isDying) {
          if (this.fog && !this.fog.isVisible(u.x, u.y)) continue;
          if (Math.hypot(u.x - worldX, u.y - worldY) <= u.radius + 12) {
            for (const warrior of selectedUnits) {
              warrior.orderAttack(u);
            }
            this.hud.addPing(u.x, u.y, '#ef4444');
            this.hud.addFloatingText(u.x, u.y - 28, 'Attack Order! ⚔️', '#ef4444');
            return;
          }
        }
      }

      // Attack Hostile Building
      for (const b of this.buildings) {
        if (b.faction !== 'PLAYER' && !b.isDead) {
          if (this.fog && !this.fog.isExplored(b.x, b.y)) continue;
          if (Math.hypot(b.x - worldX, b.y - worldY) <= b.radius + 16) {
            for (const warrior of selectedUnits) {
              warrior.orderAttack(b);
            }
            this.hud.addPing(b.x, b.y, '#ef4444');
            this.hud.addFloatingText(b.x, b.y - 36, 'Raid Target! ⚔️', '#ef4444');
            return;
          }
        }
      }

      // Build Structure
      for (const b of this.buildings) {
        if (!b.isDead && !b.isConstructed && Math.hypot(b.x - worldX, b.y - worldY) <= b.radius + 24) {
          for (const u of selectedUnits) {
            if (u.unitType === 'VILLAGER') {
              u.orderBuild(b);
            }
          }
          this.hud.addPing(b.x, b.y, '#fbbf24');
          return;
        }
      }

      // Harvest Farm
      for (const b of this.buildings) {
        if (b.buildingType === 'FARM' && b.isConstructed && !b.isDead && Math.hypot(b.x - worldX, b.y - worldY) <= b.radius + 16) {
          const dropoff = this.findNearestDropoff(b.x, b.y, 'PLAYER');
          for (const u of selectedUnits) {
            if (u.unitType === 'VILLAGER' && dropoff) {
              u.orderFarm(b, dropoff);
            }
          }
          this.hud.addPing(b.x, b.y, '#eab308');
          this.hud.addFloatingText(b.x, b.y - 24, 'Harvesting Crops 🌾', '#eab308');
          return;
        }
      }

      // Gather Natural Resource
      let clickedResource = null;
      for (const res of this.resources) {
        if (!res.isDead && Math.hypot(res.x - worldX, res.y - worldY) <= res.radius + 14) {
          clickedResource = res;
          break;
        }
      }

      if (clickedResource) {
        const dropoff = this.findNearestDropoff(clickedResource.x, clickedResource.y, 'PLAYER');
        let assigned = false;

        for (const unit of selectedUnits) {
          if (unit.unitType === 'VILLAGER' && dropoff) {
            unit.orderHarvest(clickedResource, dropoff);
            assigned = true;
          } else {
            unit.moveTo(clickedResource.x + (Math.random() - 0.5) * 30, clickedResource.y + (Math.random() - 0.5) * 30);
          }
        }

        if (assigned) {
          this.hud.addPing(clickedResource.x, clickedResource.y, '#f59e0b');
          return;
        }
      }

      // Default Ground Move with Formations & Intelligent Bridge Pathing
      this.hud.addPing(worldX, worldY, '#2ecc71');
      const count = selectedUnits.length;
      const cols = Math.ceil(Math.sqrt(count));
      const spacing = 32;

      selectedUnits.forEach((unit, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const offsetX = (col - (cols - 1) / 2) * spacing;
        const offsetY = (row - (Math.ceil(count / cols) - 1) / 2) * spacing;

        const targetX = worldX + offsetX;
        const targetY = worldY + offsetY;

        const obstacles = [...this.buildings];
        const path = this.pathfinder.findPath(unit.x, unit.y, targetX, targetY, obstacles);

        if (path && path.length > 0) {
          unit.setPath(path);
        } else {
          unit.moveTo(targetX, targetY);
        }
      });
    };

    // Control Groups
    this.input.onControlGroup = (digit, isAssign, isDoubleTap) => {
      if (isAssign) {
        const group = this.selectedEntities.filter(e => e instanceof Unit && !e.isDead && !e.isDying);
        this.input.controlGroups[digit] = group;
        this.hud.addFloatingText(this.camera.x, this.camera.y - 30, `Assigned Group ${digit} (${group.length} troops)`, '#38bdf8');
      } else {
        const group = (this.input.controlGroups[digit] || []).filter(e => !e.isDead && !e.isDying);
        this.input.controlGroups[digit] = group;

        if (group.length > 0) {
          for (const ent of this.selectedEntities) ent.isSelected = false;
          this.selectedEntities = [...group];
          for (const ent of this.selectedEntities) ent.isSelected = true;

          if (isDoubleTap) {
            let avgX = 0, avgY = 0;
            for (const u of group) {
              avgX += u.x;
              avgY += u.y;
            }
            this.camera.x = avgX / group.length;
            this.camera.y = avgY / group.length;
            this.camera.clamp();
          }

          if (this.sound) this.sound.playSelect();
        }
      }
    };

    // Town Center Hotkey (H)
    this.input.onSelectTownCenter = () => {
      const tc = this.buildings.find(b => b.faction === 'PLAYER' && b.buildingType === 'TOWN_CENTER' && !b.isDead);
      if (tc) {
        for (const ent of this.selectedEntities) ent.isSelected = false;
        tc.isSelected = true;
        this.selectedEntities = [tc];
        this.camera.x = tc.x;
        this.camera.y = tc.y;
        this.camera.clamp();
        this.hud.addPing(tc.x, tc.y, '#3b82f6');
        if (this.sound) this.sound.playSelect();
      }
    };

    // Idle Villager Hotkey (.)
    this.input.onCycleIdleVillager = () => {
      this.cycleIdleVillager();
    };

    // Spacebar Jump to Alert
    this.input.onJumpToAlert = () => {
      this.camera.x = this.lastAlertPos.x;
      this.camera.y = this.lastAlertPos.y;
      this.camera.clamp();
      this.hud.addPing(this.lastAlertPos.x, this.lastAlertPos.y, '#ef4444');
    };

    // Escape Toggle Pause
    this.input.onTogglePause = () => {
      if (this.placementMode.active) {
        this.cancelPlacement();
      } else {
        this.hud.isPaused = !this.hud.isPaused;
        if (this.hud.isPaused) {
          this.hud.pauseModal.classList.remove('hidden');
        } else {
          this.hud.pauseModal.classList.add('hidden');
        }
      }
    };
  }

  loop(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;
    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    if (!this.hud.isPaused) {
      this.elapsedSeconds += dt;
      this.stats.time = this.elapsedSeconds;
      this.update(dt);
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.camera.update(dt, this.input);
    this.map.update(dt);
    this.effects.update(dt);

    // Placement Mode Preview
    if (this.placementMode.active) {
      const snapGrid = this.map.tileSize;
      this.placementMode.snappedX = Math.round(this.input.mouse.worldX / snapGrid) * snapGrid;
      this.placementMode.snappedY = Math.round(this.input.mouse.worldY / snapGrid) * snapGrid;

      const bConfig = BUILDING_TYPES[this.placementMode.buildingType];
      if (bConfig) {
        this.placementMode.isValid = this.checkPlacementValidity(
          this.placementMode.snappedX,
          this.placementMode.snappedY,
          bConfig.radius
        );
      }
    }

    // Update AI
    this.enemyAI.update(dt);

    // Resource Slow Regrowth
    this.resourceRegrowthTimer += dt;
    if (this.resourceRegrowthTimer >= 20.0) {
      this.resourceRegrowthTimer = 0;
      for (const res of this.resources) {
        if (!res.isDead && res.resourceType === 'WOOD' && res.amount < res.maxAmount) {
          res.amount = Math.min(res.maxAmount, res.amount + 2);
        }
      }
    }

    // Update Resources
    for (let i = this.resources.length - 1; i >= 0; i--) {
      const res = this.resources[i];
      res.update(dt);
      if (res.isDead) this.resources.splice(i, 1);
    }

    // Update Buildings
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      b.update(dt, this);
      if (b.isDead) {
        if (this.effects) {
          this.effects.addWoodChips(b.x, b.y);
          this.effects.triggerShake(8, 0.4);
        }
        this.buildings.splice(i, 1);
      }
    }

    // Update Units
    let inCombatCount = 0;
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i];
      unit.update(dt, this.map, this.units, this);

      if (unit.state === 'ATTACKING') {
        inCombatCount++;
      }

      if (unit.isDead) {
        if (unit.faction !== 'PLAYER') {
          this.stats.vanquished++;
        }
        this.units.splice(i, 1);
      }
    }

    // Dynamic Soundscape
    if (this.sound) {
      this.sound.setCombatState(inCombatCount > 0);
    }

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt, this);
      if (p.isDead) {
        this.projectiles.splice(i, 1);
      }
    }

    // Update Population
    this.player.pop = this.units.filter(u => u.faction === 'PLAYER' && !u.isDead && !u.isDying).length;

    // Update Fog of War
    const friendlyUnits = this.units.filter(u => u.faction === 'PLAYER');
    const friendlyBuildings = this.buildings.filter(b => b.faction === 'PLAYER');
    this.fog.update(friendlyUnits, friendlyBuildings);

    // Check Victory & Defeat Conditions
    if (!this.isGameOver) {
      const enemyTCs = this.buildings.filter(
        b => b.faction !== 'PLAYER' && b.buildingType === 'TOWN_CENTER' && !b.isDead
      );
      const playerTC = this.buildings.find(
        b => b.faction === 'PLAYER' && b.buildingType === 'TOWN_CENTER' && !b.isDead
      );

      if (enemyTCs.length === 0) {
        this.isGameOver = true;
        if (this.sound) this.sound.playVictory();
        this.hud.showGameOver(true, this.stats);
      } else if (!playerTC) {
        this.isGameOver = true;
        if (this.sound) this.sound.playDefeat();
        this.hud.showGameOver(false, this.stats);
      }
    }

    this.hud.update(dt, this.elapsedSeconds);
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. World Layer
    this.ctx.save();
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    this.ctx.translate(centerX + this.effects.screenShake.offsetX, centerY + this.effects.screenShake.offsetY);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    this.map.render(this.ctx, this.camera);

    const renderList = [...this.resources, ...this.buildings, ...this.units].sort((a, b) => a.y - b.y);
    for (const ent of renderList) {
      if (ent.faction === 'GAIA') {
        if (this.fog && !this.fog.isExplored(ent.x, ent.y)) continue;
        ent.render(this.ctx);
      } else if (ent.faction !== 'PLAYER') {
        if (ent instanceof Unit) {
          if (this.fog && !this.fog.isVisible(ent.x, ent.y)) continue;
          ent.render(this.ctx);
        } else if (ent instanceof Building) {
          if (this.fog && !this.fog.isExplored(ent.x, ent.y)) continue;
          ent.render(this.ctx);
        }
      } else {
        ent.render(this.ctx);
      }
    }

    for (const p of this.projectiles) {
      if (this.fog && !this.fog.isVisible(p.x, p.y)) continue;
      p.render(this.ctx);
    }

    this.effects.render(this.ctx);
    this.fog.renderWorld(this.ctx);
    this.hud.renderWorldOverlays(this.ctx);

    this.ctx.restore();

    // 2. Screen UI Layer
    this.hud.renderScreenOverlays(this.ctx, this.input);
    this.hud.renderMinimap();
  }
}
