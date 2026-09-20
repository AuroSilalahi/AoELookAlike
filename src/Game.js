import { Camera } from './engine/Camera.js';
import { Input } from './engine/Input.js';
import { TileMap } from './map/TileMap.js';
import { Pathfinder } from './map/Pathfinder.js';
import { FogOfWar } from './map/FogOfWar.js';
import { Effects } from './engine/Effects.js';
import { Unit } from './entities/Unit.js';
import { Building, BUILDING_TYPES, UPGRADE_CONFIG } from './entities/Building.js';
import { ResourceNode } from './entities/ResourceNode.js';
import { HUD, KINGDOMS } from './ui/HUD.js';
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

    // Match Config & Diplomacy
    this.playerCiv = 'JAPANESE';
    this.mapType = 'RIVER_VALLEY';
    this.enemyCount = 4;
    this.factions = {};
    this.hasStarted = false;

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

    // World & Systems
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

    // Standby: Wait for player to configure and launch in Main Menu
    this.hasStarted = false;

    requestAnimationFrame((t) => this.loop(t));
  }

  isHostile(entityA, entityB) {
    if (!entityA || !entityB) return false;
    const fA = entityA.faction;
    const fB = entityB.faction;
    if (fA === fB) return false;

    const infoA = this.factions[fA];
    const infoB = this.factions[fB];
    if (!infoA || !infoB) return fA !== fB;

    // Both belong to player team (Player & Allies)
    if (infoA.team === 'TEAM_PLAYER' && infoB.team === 'TEAM_PLAYER') {
      return false;
    }

    // One is on player team and other is not
    if (infoA.team === 'TEAM_PLAYER' || infoB.team === 'TEAM_PLAYER') {
      return true;
    }

    // Both are enemy AIs (cooperate against player & allies)
    return false;
  }

  isAllied(entityA, entityB) {
    if (!entityA || !entityB) return false;
    const fA = entityA.faction;
    const fB = entityB.faction;
    if (fA === fB) return true;

    const infoA = this.factions[fA];
    const infoB = this.factions[fB];
    if (!infoA || !infoB) return false;

    return infoA.team === 'TEAM_PLAYER' && infoB.team === 'TEAM_PLAYER';
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  startNewMatch(configOrCiv = 'JAPANESE', mapType = 'RIVER_VALLEY', enemyCount = 4, difficulty = 'NORMAL') {
    let civId = 'JAPANESE';
    let opponents = [];
    let diff = 'NORMAL';
    let mType = 'RIVER_VALLEY';

    if (typeof configOrCiv === 'object' && configOrCiv !== null) {
      civId = configOrCiv.playerCiv || 'JAPANESE';
      mType = configOrCiv.mapType || 'RIVER_VALLEY';
      diff = configOrCiv.difficulty || 'NORMAL';
      opponents = configOrCiv.opponents || [];
    } else {
      civId = configOrCiv;
      mType = mapType;
      diff = difficulty;
      const allCivs = ['JAPANESE', 'KOREAN', 'CHINESE', 'INDIAN'];
      const otherCivs = allCivs.filter(c => c !== civId);
      const count = Math.min(otherCivs.length, enemyCount);
      opponents = otherCivs.slice(0, count).map(c => ({ civId: c, stance: 'ENEMY' }));
    }

    this.playerCiv = civId;
    this.mapType = mType;
    this.isGameOver = false;
    this.elapsedSeconds = 0;
    this.stats = { time: 0, trained: 5, vanquished: 0 };
    this.playerUpgrades.clear();

    // 1. Dynamic Map Sizing based on nation count
    // 2 Nations = 50x50, 3 Nations = 65x65, 4 Nations = 80x80
    const totalNations = 1 + opponents.length;
    let cols = 80;
    let rows = 80;
    if (totalNations <= 2) {
      cols = 50;
      rows = 50;
    } else if (totalNations === 3) {
      cols = 65;
      rows = 65;
    } else {
      cols = 80;
      rows = 80;
    }

    // 2. Procedural Candidate Base Sectors with random jitter and shuffling
    const candidateSectors = [
      { col: Math.floor(cols * 0.18), row: Math.floor(rows * 0.82) }, // SW
      { col: Math.floor(cols * 0.82), row: Math.floor(rows * 0.18) }, // NE
      { col: Math.floor(cols * 0.18), row: Math.floor(rows * 0.18) }, // NW
      { col: Math.floor(cols * 0.82), row: Math.floor(rows * 0.82) }  // SE
    ];

    for (const s of candidateSectors) {
      s.col += Math.floor((Math.random() - 0.5) * 4);
      s.row += Math.floor((Math.random() - 0.5) * 4);
      s.col = Math.max(8, Math.min(cols - 9, s.col));
      s.row = Math.max(8, Math.min(rows - 9, s.row));
    }

    const shuffledSectors = [...candidateSectors].sort(() => Math.random() - 0.5);

    const playerBasePoint = {
      col: shuffledSectors[0].col,
      row: shuffledSectors[0].row,
      x: shuffledSectors[0].col * 48,
      y: shuffledSectors[0].row * 48
    };

    const opponentBasePoints = opponents.map((opp, idx) => ({
      ...opp,
      factionId: 'AI_' + opp.civId,
      col: shuffledSectors[idx + 1].col,
      row: shuffledSectors[idx + 1].row,
      x: shuffledSectors[idx + 1].col * 48,
      y: shuffledSectors[idx + 1].row * 48
    }));

    const allBasePoints = [playerBasePoint, ...opponentBasePoints];

    // 3. Rebuild Map & World Systems
    this.map.generateMap(mType, cols, rows, allBasePoints);
    this.fog = new FogOfWar(cols, rows, 48);
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

    // 4. Initialize Resources with Civ bonuses
    this.player = {
      food: civId === 'CHINESE' ? 320 : 300,
      wood: civId === 'CHINESE' ? 280 : 250,
      gold: 150,
      pop: 5,
      maxPop: 10
    };

    // 5. Build Diplomacy Dictionary
    this.factions = {
      PLAYER: {
        id: 'PLAYER',
        civ: civId,
        team: 'TEAM_PLAYER',
        diplomacy: 'PLAYER',
        isPlayer: true,
        color: '#2563eb',
        name: KINGDOMS[civId]?.name || 'Player'
      }
    };

    for (const opp of opponentBasePoints) {
      const isAlly = (opp.stance === 'ALLY');
      this.factions[opp.factionId] = {
        id: opp.factionId,
        civ: opp.civId,
        team: isAlly ? 'TEAM_PLAYER' : 'TEAM_ENEMY',
        diplomacy: opp.stance,
        isPlayer: false,
        color: isAlly ? '#06b6d4' : (KINGDOMS[opp.civId]?.color || '#dc2626'),
        name: KINGDOMS[opp.civId]?.name || opp.civId
      };
    }

    // 6. Initialize AI
    this.enemyAI.setDifficulty(diff);
    this.enemyAI.initFactions(opponentBasePoints.map(opp => ({
      id: opp.factionId,
      civ: opp.civId,
      name: this.factions[opp.factionId].name,
      color: this.factions[opp.factionId].color,
      diplomacy: opp.stance
    })));

    // 7. Spawn Player & Opponent Kingdoms
    this.spawnKingdomsAndResources(playerBasePoint, opponentBasePoints, cols, rows);

    // 8. Update HUD Banner
    this.hud.setCivilizationBanner(civId);
    this.hud.showAlert(`⚔️ Campaign started as ${KINGDOMS[civId]?.name} on ${mType.replace('_', ' ')}!`);

    // Focus Camera on Player Town Center
    this.camera.x = playerBasePoint.x;
    this.camera.y = playerBasePoint.y;
    this.camera.clamp();

    // Initial Fog of War calculation (Shared vision with Allies)
    const friendlyUnits = this.units.filter(u => this.isAllied(u, { faction: 'PLAYER' }));
    const friendlyBuildings = this.buildings.filter(b => this.isAllied(b, { faction: 'PLAYER' }));
    this.fog.update(friendlyUnits, friendlyBuildings);

    this.hasStarted = true;
  }

  spawnKingdomsAndResources(playerBase, opponentBases = [], cols = 80, rows = 80) {
    const pX = playerBase.x;
    const pY = playerBase.y;

    // ==========================================
    // 1. PLAYER BASE (Randomized Quadrant)
    // ==========================================
    const playerTC = new Building(pX, pY, 'TOWN_CENTER', 'PLAYER', true);
    this.buildings.push(playerTC);

    // Starting Units (Chinese gets +3 starting villagers!)
    const vilCount = this.playerCiv === 'CHINESE' ? 6 : 3;
    for (let i = 0; i < vilCount; i++) {
      const v = new Unit(pX - 50 + i * 26, pY + 60 + (i % 2) * 20, 'VILLAGER', 'PLAYER');
      v.applyCivBonuses(this.playerCiv);
      this.units.push(v);
    }
    const s1 = new Unit(pX + 50, pY + 70, 'SWORDSMAN', 'PLAYER');
    const s2 = new Unit(pX + 80, pY + 85, 'SWORDSMAN', 'PLAYER');
    s1.applyCivBonuses(this.playerCiv);
    s2.applyCivBonuses(this.playerCiv);
    this.units.push(s1);
    this.units.push(s2);

    // Surrounding Player Starter Resources
    this.spawnForestGrove(pX - 140, pY - 70, 9, 240);
    this.resources.push(new ResourceNode(pX + 140, pY - 70, 'GOLD', 650));
    this.resources.push(new ResourceNode(pX + 180, pY - 40, 'GOLD', 600));
    this.resources.push(new ResourceNode(pX + 130, pY + 110, 'FOOD', 320));
    this.resources.push(new ResourceNode(pX + 165, pY + 135, 'FOOD', 320));

    // ==========================================
    // 2. OPPONENT BASES (Allies & Enemies in other quadrants)
    // ==========================================
    for (const opp of opponentBases) {
      const factionId = opp.factionId;
      const isAlly = (opp.stance === 'ALLY');
      const color = isAlly ? '#06b6d4' : (KINGDOMS[opp.civId]?.color || '#dc2626');

      // Fortress & Barracks
      const oTC = new Building(opp.x, opp.y, 'TOWN_CENTER', factionId, true);
      oTC.customColor = color;
      oTC.isAlly = isAlly;

      const oBarracks = new Building(opp.x - 90, opp.y + 50, 'BARRACKS', factionId, true);
      oBarracks.customColor = color;
      oBarracks.isAlly = isAlly;

      this.buildings.push(oTC);
      this.buildings.push(oBarracks);

      // Starting Units with Civ Bonuses
      const vilC = (opp.civId === 'CHINESE') ? 5 : 3;
      for (let i = 0; i < vilC; i++) {
        const v = new Unit(opp.x - 45 + i * 24, opp.y + 55 + (i % 2) * 18, 'VILLAGER', factionId);
        v.customColor = color;
        v.isAlly = isAlly;
        v.applyCivBonuses(opp.civId);
        this.units.push(v);
      }

      const mil1 = new Unit(opp.x + 45, opp.y + 65, 'SWORDSMAN', factionId);
      const mil2 = new Unit(opp.x + 75, opp.y + 80, 'ARCHER', factionId);
      mil1.customColor = color;
      mil2.customColor = color;
      mil1.isAlly = isAlly;
      mil2.isAlly = isAlly;
      mil1.applyCivBonuses(opp.civId);
      mil2.applyCivBonuses(opp.civId);
      this.units.push(mil1);
      this.units.push(mil2);

      // Opponent territory resources
      this.spawnForestGrove(opp.x + 130, opp.y - 60, 8, 220);
      this.resources.push(new ResourceNode(opp.x - 140, opp.y - 60, 'GOLD', 650));
      this.resources.push(new ResourceNode(opp.x + 110, opp.y + 120, 'FOOD', 300));
    }

    // ==========================================
    // 3. PROCEDURAL FRONTIER RESOURCES (Scaled to realm dimensions)
    // ==========================================
    const mapW = cols * 48;
    const mapH = rows * 48;
    const groveCount = (cols >= 75) ? 24 : ((cols >= 60) ? 16 : 10);
    const goldCount = (cols >= 75) ? 14 : ((cols >= 60) ? 10 : 6);
    const berryCount = (cols >= 75) ? 14 : ((cols >= 60) ? 10 : 6);

    // Scatter Neutral Forests
    for (let i = 0; i < groveCount; i++) {
      const gx = 250 + Math.random() * (mapW - 500);
      const gy = 250 + Math.random() * (mapH - 500);
      if (this.map.isWalkable(gx, gy)) {
        this.spawnForestGrove(gx, gy, 7 + Math.floor(Math.random() * 4), 220);
      }
    }

    // Scatter Neutral Gold Veins
    for (let i = 0; i < goldCount; i++) {
      const mx = 250 + Math.random() * (mapW - 500);
      const my = 250 + Math.random() * (mapH - 500);
      if (this.map.isWalkable(mx, my)) {
        this.resources.push(new ResourceNode(mx, my, 'GOLD', 650));
      }
    }

    // Scatter Neutral Berry Groves
    for (let i = 0; i < berryCount; i++) {
      const bx = 250 + Math.random() * (mapW - 500);
      const by = 250 + Math.random() * (mapH - 500);
      if (this.map.isWalkable(bx, by)) {
        this.resources.push(new ResourceNode(bx, by, 'FOOD', 320));
      }
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

    if (this.hasStarted && !this.hud.isPaused) {
      this.elapsedSeconds += dt;
      this.stats.time = this.elapsedSeconds;
      this.update(dt);
    }

    if (this.hasStarted) {
      this.render();
    }
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
        if (unit.faction !== 'PLAYER' && !unit.isAlly) {
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

    // Update Fog of War (Player & Allies share vision)
    const friendlyUnits = this.units.filter(u => this.isAllied(u, { faction: 'PLAYER' }));
    const friendlyBuildings = this.buildings.filter(b => this.isAllied(b, { faction: 'PLAYER' }));
    this.fog.update(friendlyUnits, friendlyBuildings);

    // Check Victory & Defeat Conditions
    if (!this.isGameOver && this.hasStarted) {
      const enemyTCs = this.buildings.filter(
        b => this.isHostile({ faction: 'PLAYER' }, b) && b.buildingType === 'TOWN_CENTER' && !b.isDead
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
      } else if (!this.isAllied(ent, { faction: 'PLAYER' })) {
        if (ent instanceof Unit) {
          if (this.fog && !this.fog.isVisible(ent.x, ent.y)) continue;
          ent.render(this.ctx);
        } else if (ent instanceof Building) {
          if (this.fog && !this.fog.isExplored(ent.x, ent.y)) continue;
          ent.render(this.ctx);
        }
      } else {
        // Player and Allied entities
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
