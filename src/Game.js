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
import { EnemyAI } from './ai/EnemyAI.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Audio, AI & Effects
    this.sound = new SoundFX();
    this.enemyAI = new EnemyAI(this);
    this.effects = new Effects();

    // Player State & Tech
    this.player = {
      food: 260,
      wood: 220,
      gold: 140,
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
    this.lastAlertPos = { x: 550, y: 500 };

    // World & Systems
    this.map = new TileMap(50, 50, 48);
    this.fog = new FogOfWar(50, 50, 48);
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

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.setupInputHandlers();
    this.spawnWorld();

    this.camera.x = 550;
    this.camera.y = 500;
    this.camera.clamp();

    // Initialize Fog of War
    const friendlyUnits = this.units.filter(u => u.faction === 'PLAYER');
    const friendlyBuildings = this.buildings.filter(b => b.faction === 'PLAYER');
    this.fog.update(friendlyUnits, friendlyBuildings);

    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  spawnWorld() {
    // 1. Player Realm: Town Center
    const playerTC = new Building(550, 500, 'TOWN_CENTER', 'PLAYER', true);
    this.buildings.push(playerTC);

    // Player Starting Troops: 3 Villagers & 2 Swordsmen
    this.units.push(new Unit(470, 560, 'VILLAGER', 'PLAYER'));
    this.units.push(new Unit(500, 590, 'VILLAGER', 'PLAYER'));
    this.units.push(new Unit(460, 610, 'VILLAGER', 'PLAYER'));

    this.units.push(new Unit(580, 580, 'SWORDSMAN', 'PLAYER'));
    this.units.push(new Unit(610, 610, 'SWORDSMAN', 'PLAYER'));

    // 2. Enemy Realm: Town Center, Barracks & Garrison
    const enemyTC = new Building(1850, 1820, 'TOWN_CENTER', 'ENEMY', true);
    const enemyBarracks = new Building(1720, 1740, 'BARRACKS', 'ENEMY', true);
    this.buildings.push(enemyTC);
    this.buildings.push(enemyBarracks);

    // Enemy Starting Garrison
    this.units.push(new Unit(1780, 1760, 'SWORDSMAN', 'ENEMY'));
    this.units.push(new Unit(1820, 1720, 'SWORDSMAN', 'ENEMY'));
    this.units.push(new Unit(1730, 1800, 'ARCHER', 'ENEMY'));
    this.units.push(new Unit(1790, 1850, 'ARCHER', 'ENEMY'));

    // 3. Resource Nodes near Player Territory
    const treeCoords = [
      [360, 440], [400, 420], [440, 400], [480, 390],
      [330, 500], [360, 530], [340, 570], [380, 590]
    ];
    for (const [tx, ty] of treeCoords) {
      this.resources.push(new ResourceNode(tx, ty, 'WOOD', 180));
    }

    // Gold Mines
    this.resources.push(new ResourceNode(720, 420, 'GOLD', 550));
    this.resources.push(new ResourceNode(770, 450, 'GOLD', 450));

    // Berry Bushes
    this.resources.push(new ResourceNode(660, 600, 'FOOD', 260));
    this.resources.push(new ResourceNode(700, 630, 'FOOD', 260));

    // Neutral Shallows Grove
    this.resources.push(new ResourceNode(1050, 950, 'WOOD', 200));
    this.resources.push(new ResourceNode(1100, 920, 'WOOD', 200));
    this.resources.push(new ResourceNode(1150, 960, 'GOLD', 400));

    // Enemy Territory Resources
    this.resources.push(new ResourceNode(1950, 1750, 'WOOD', 220));
    this.resources.push(new ResourceNode(1980, 1800, 'WOOD', 220));
    this.resources.push(new ResourceNode(1680, 1920, 'GOLD', 550));
  }

  startPlacement(buildingType) {
    const config = BUILDING_TYPES[buildingType];
    if (!config) return;

    if (config.cost.wood && this.player.wood < config.cost.wood) {
      this.hud.addFloatingText(this.camera.x, this.camera.y, `Need ${config.cost.wood} Wood!`, '#ef4444');
      return;
    }
    if (config.cost.gold && this.player.gold < config.cost.gold) {
      this.hud.addFloatingText(this.camera.x, this.camera.y, `Need ${config.cost.gold} Gold!`, '#ef4444');
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
    if (config.cost.wood && this.player.wood < config.cost.wood) return false;
    if (config.cost.gold && this.player.gold < config.cost.gold) return false;

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
  }

  onUpgradeCompleted(upgradeId, faction) {
    if (faction === 'PLAYER') {
      this.playerUpgrades.add(upgradeId);
      const info = UPGRADE_CONFIG[upgradeId];
      this.hud.showAlert(`✨ UPGRADE COMPLETE: ${info.name}! ${info.desc}`);
      if (this.sound) this.sound.playUpgradeComplete();

      // Refresh stats for all existing player units
      for (const unit of this.units) {
        if (unit.faction === 'PLAYER') {
          unit.applyUpgrades(this.playerUpgrades);
        }
      }
    }
  }

  spawnTrainedUnit(building, unitType) {
    const rx = building.rallyPoint.x + (Math.random() - 0.5) * 16;
    const ry = building.rallyPoint.y + (Math.random() - 0.5) * 16;

    const unit = new Unit(building.x, building.y + building.radius + 8, unitType, building.faction);

    // Apply active player upgrades immediately
    if (building.faction === 'PLAYER') {
      unit.applyUpgrades(this.playerUpgrades);
      this.stats.trained++;
      this.hud.addFloatingText(building.x, building.y - 36, `+1 ${unit.name} ⚔️`, '#38bdf8');

      // March to rally point if outside building
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
    if (type === 'WOOD') {
      this.player.wood += amount;
      this.hud.addFloatingText(dropoffX, dropoffY - 30, `+${amount} Wood 🪵`, '#81c784');
    } else if (type === 'GOLD') {
      this.player.gold += amount;
      this.hud.addFloatingText(dropoffX, dropoffY - 30, `+${amount} Gold 🪙`, '#ffd54f');
    } else if (type === 'FOOD') {
      this.player.food += amount;
      this.hud.addFloatingText(dropoffX, dropoffY - 30, `+${amount} Food 🌾`, '#facc15');
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
    // 1. Single Click Selection & Placement Confirmation
    this.input.onSingleSelect = (worldX, worldY) => {
      if (this.placementMode.active) {
        if (this.placementMode.isValid) {
          const type = this.placementMode.buildingType;
          const config = BUILDING_TYPES[type];

          if (config.cost.wood) this.player.wood -= config.cost.wood;
          if (config.cost.gold) this.player.gold -= config.cost.gold;

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

          // Assign selected or nearest villager to construct
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
        // Hostile units under fog of war cannot be clicked
        if (unit.faction === 'ENEMY' && this.fog && !this.fog.isVisible(unit.x, unit.y)) {
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
        if (b.faction === 'ENEMY' && this.fog && !this.fog.isExplored(b.x, b.y)) {
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

    // 2. Drag Box Selection
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

    // 3. Right-Click Context Orders & Rally Points
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

      // Check Attack Hostile Unit
      for (const u of this.units) {
        if (u.faction === 'ENEMY' && !u.isDead && !u.isDying) {
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

      // Check Attack Hostile Building
      for (const b of this.buildings) {
        if (b.faction === 'ENEMY' && !b.isDead) {
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

      // Check Build Structure under construction
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

      // Check Farm Harvesting
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

      // Check Resource Gathering
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

      // Default Ground Move with Formations
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

    // 4. Control Groups (Ctrl+1-9, 1-9)
    this.input.onControlGroup = (digit, isAssign, isDoubleTap) => {
      if (isAssign) {
        // Save selection to group
        const group = this.selectedEntities.filter(e => e instanceof Unit && !e.isDead && !e.isDying);
        this.input.controlGroups[digit] = group;
        this.hud.addFloatingText(this.camera.x, this.camera.y - 30, `Assigned Control Group ${digit} (${group.length} troops)`, '#38bdf8');
      } else {
        // Recall group
        const group = (this.input.controlGroups[digit] || []).filter(e => !e.isDead && !e.isDying);
        this.input.controlGroups[digit] = group;

        if (group.length > 0) {
          for (const ent of this.selectedEntities) {
            ent.isSelected = false;
          }
          this.selectedEntities = [...group];
          for (const ent of this.selectedEntities) {
            ent.isSelected = true;
          }

          if (isDoubleTap) {
            // Center camera on group center
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

    // 5. Town Center Hotkey (H)
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

    // 6. Idle Villager Hotkey (.)
    this.input.onCycleIdleVillager = () => {
      this.cycleIdleVillager();
    };

    // 7. Jump to Alert (Spacebar)
    this.input.onJumpToAlert = () => {
      this.camera.x = this.lastAlertPos.x;
      this.camera.y = this.lastAlertPos.y;
      this.camera.clamp();
      this.hud.addPing(this.lastAlertPos.x, this.lastAlertPos.y, '#ef4444');
    };

    // 8. Escape Toggle Pause
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

    // Update Placement Mode preview
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

    // Update Enemy AI
    this.enemyAI.update(dt);

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
        if (unit.faction === 'ENEMY') {
          this.stats.vanquished++;
        }
        this.units.splice(i, 1);
      }
    }

    // Adjust Ambient Music based on Combat tension
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
      const enemyTC = this.buildings.find(b => b.faction === 'ENEMY' && b.buildingType === 'TOWN_CENTER' && !b.isDead);
      const playerTC = this.buildings.find(b => b.faction === 'PLAYER' && b.buildingType === 'TOWN_CENTER' && !b.isDead);

      if (!enemyTC) {
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

    // Render TileMap terrain
    this.map.render(this.ctx, this.camera);

    // Render sorted entities (Gaia, Friendly, and Visible Enemies)
    const renderList = [...this.resources, ...this.buildings, ...this.units].sort((a, b) => a.y - b.y);
    for (const ent of renderList) {
      // Gaia resources: render if explored
      if (ent.faction === 'GAIA') {
        if (this.fog && !this.fog.isExplored(ent.x, ent.y)) continue;
        ent.render(this.ctx);
      }
      // Enemy entities: hide if unrevealed
      else if (ent.faction === 'ENEMY') {
        if (ent instanceof Unit) {
          // Enemy units only visible if within active sight radius
          if (this.fog && !this.fog.isVisible(ent.x, ent.y)) continue;
          ent.render(this.ctx);
        } else if (ent instanceof Building) {
          // Enemy buildings visible if explored
          if (this.fog && !this.fog.isExplored(ent.x, ent.y)) continue;
          ent.render(this.ctx);
        }
      }
      // Friendly player entities: always render
      else {
        ent.render(this.ctx);
      }
    }

    // Render Projectiles
    for (const p of this.projectiles) {
      if (this.fog && !this.fog.isVisible(p.x, p.y)) continue;
      p.render(this.ctx);
    }

    // Render Particle Effects (Ripples, Dust, Sparks, Fireworks)
    this.effects.render(this.ctx);

    // Render Fog of War world shroud
    this.fog.renderWorld(this.ctx);

    // Render World Overlays (Pings, Blueprint Preview, Floating Combat Text)
    this.hud.renderWorldOverlays(this.ctx);

    this.ctx.restore();

    // 2. Screen UI Layer
    this.hud.renderScreenOverlays(this.ctx, this.input);
    this.hud.renderMinimap();
  }
}
