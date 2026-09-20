import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';

export const BUILDING_TYPES = {
  TOWN_CENTER: {
    name: 'Town Center Fortress',
    hp: 1800,
    radius: 46,
    isDropoff: true,
    avatar: '🏰',
    cost: { wood: 350 },
    role: 'Fortress HQ, Defense & Sanctuary',
    trainable: ['VILLAGER'],
    researches: [],
    attackDamage: 15,
    attackRange: 240,
    attackCooldown: 1.2,
    baseArrows: 3
  },
  BARRACKS: {
    name: 'Barracks',
    hp: 850,
    radius: 36,
    isDropoff: false,
    avatar: '🛡️',
    cost: { wood: 100, gold: 20 },
    role: 'Military Training Facility',
    trainable: ['SWORDSMAN', 'ARCHER', 'KNIGHT'],
    researches: []
  },
  WATCH_TOWER: {
    name: 'Watch Tower',
    hp: 700,
    radius: 24,
    isDropoff: false,
    avatar: '🗼',
    cost: { wood: 80, gold: 25 },
    role: 'Defensive Turret',
    trainable: [],
    researches: [],
    attackDamage: 13,
    attackRange: 215,
    attackCooldown: 1.35,
    baseArrows: 1
  },
  BLACKSMITH: {
    name: 'Blacksmith',
    hp: 750,
    radius: 32,
    isDropoff: false,
    avatar: '⚒️',
    cost: { wood: 120, gold: 40 },
    role: 'Weapons & Armor Research',
    trainable: [],
    researches: ['FORGED_BLADES', 'SCALE_ARMOR', 'BODKIN_ARROWS', 'ARROW_SLITS', 'WHEELBARROW']
  },
  FARM: {
    name: 'Farm',
    hp: 350,
    radius: 26,
    isDropoff: false,
    avatar: '🌾',
    cost: { wood: 60 },
    role: 'Renewable Food Field (400 Food)',
    trainable: [],
    researches: []
  },
  HOUSE: {
    name: 'House',
    hp: 400,
    radius: 24,
    isDropoff: false,
    avatar: '🏠',
    cost: { wood: 30 },
    popProvided: 5,
    role: 'Expands Max Population (+5)',
    trainable: [],
    researches: []
  }
};

export const TRAINING_CONFIG = {
  VILLAGER: {
    name: 'Villager',
    cost: { food: 50 },
    time: 6,
    avatar: '👨‍🌾'
  },
  SWORDSMAN: {
    name: 'Swordsman',
    cost: { food: 60, gold: 20 },
    time: 8,
    avatar: '⚔️'
  },
  ARCHER: {
    name: 'Archer',
    cost: { food: 40, wood: 45 },
    time: 8,
    avatar: '🏹'
  },
  KNIGHT: {
    name: 'Knight',
    cost: { food: 85, gold: 60 },
    time: 11,
    avatar: '🏇'
  }
};

export const UPGRADE_CONFIG = {
  FORGED_BLADES: {
    name: 'Forged Steel',
    desc: '+3 Damage to Melee & Knights',
    cost: { food: 60, gold: 50 },
    time: 9,
    avatar: '🗡️'
  },
  SCALE_ARMOR: {
    name: 'Scale Armor',
    desc: '+25 Max HP to all military troops',
    cost: { food: 70, gold: 40 },
    time: 9,
    avatar: '🛡️'
  },
  BODKIN_ARROWS: {
    name: 'Bodkin Arrows',
    desc: '+35 Attack Range & +2 Damage to Archers',
    cost: { wood: 70, gold: 50 },
    time: 9,
    avatar: '🎯'
  },
  ARROW_SLITS: {
    name: 'Arrow Slits',
    desc: '+2 Arrows to Fortress & +1 Arrow to Towers',
    cost: { wood: 80, gold: 60 },
    time: 10,
    avatar: '🏹'
  },
  WHEELBARROW: {
    name: 'Wheelbarrow',
    desc: '+5 Villager carry capacity & +15% speed',
    cost: { food: 50, wood: 60 },
    time: 8,
    avatar: '🛒'
  }
};

export class Building extends Entity {
  constructor(x, y, type = 'TOWN_CENTER', faction = 'PLAYER', isConstructed = true) {
    const config = BUILDING_TYPES[type] || BUILDING_TYPES.TOWN_CENTER;
    super(x, y, config.radius, faction, config.hp);

    this.buildingType = type;
    this.name = config.name;
    this.avatar = config.avatar;
    this.role = config.role;
    this.config = config;
    this.isDropoff = config.isDropoff;

    this.isConstructed = isConstructed;
    this.buildProgress = isConstructed ? 100 : 0;
    this.maxBuildTime = 7.0;

    if (!isConstructed) {
      this.hp = Math.floor(config.hp * 0.1);
    }

    this.rallyPoint = { x: x + config.radius + 24, y: y + config.radius + 24 };
    this.hasCustomRallyPoint = false;

    // Production & Research Queues
    this.queue = [];
    this.currentTrainTimer = 0;

    // Fortress & Tower Combat Parameters
    this.attackDamage = config.attackDamage || 0;
    this.baseRange = config.attackRange || 0;
    this.attackRange = this.baseRange;
    this.attackCooldown = config.attackCooldown || 1.3;
    this.attackTimer = 0;
    this.baseArrows = config.baseArrows || 0;
    this.volleyArrows = this.baseArrows;

    // Fortress Healing Sanctuary parameters
    this.isFortress = (type === 'TOWN_CENTER');
    this.healingRadius = 160;
    this.healTimer = 0;

    // Farm Food Reserve
    if (type === 'FARM') {
      this.maxFarmFood = 400;
      this.farmFood = this.maxFarmFood;
    }

    this.fireTimer = 0;
  }

  setRallyPoint(worldX, worldY) {
    this.rallyPoint = { x: worldX, y: worldY };
    this.hasCustomRallyPoint = true;
  }

  applyUpgrades(upgradesSet) {
    if (!upgradesSet) return;

    if (this.isFortress || this.buildingType === 'WATCH_TOWER') {
      let extraArrows = 0;
      if (upgradesSet.has('ARROW_SLITS')) {
        extraArrows = this.isFortress ? 2 : 1;
      }
      this.volleyArrows = this.baseArrows + extraArrows;

      if (upgradesSet.has('BODKIN_ARROWS')) {
        this.attackRange = this.baseRange + 25;
      }
    }
  }

  build(dt, workerCount = 1) {
    if (this.isConstructed) return;

    const rate = (100 / this.maxBuildTime) * workerCount;
    this.buildProgress = Math.min(100, this.buildProgress + rate * dt);
    this.hp = Math.max(10, Math.floor((this.buildProgress / 100) * this.maxHp));

    if (this.buildProgress >= 100) {
      this.isConstructed = true;
      this.hp = this.maxHp;
    }
  }

  takeDamage(amount) {
    super.takeDamage(amount);
    if (this.hp <= 0) {
      this.isDead = true;
    }
  }

  harvestFarm(amount) {
    if (this.buildingType !== 'FARM' || !this.isConstructed) return 0;
    const harvested = Math.min(this.farmFood, amount);
    this.farmFood -= harvested;
    if (this.farmFood <= 0) {
      this.farmFood = 0;
      this.isDead = true; // Farm depleted
    }
    return harvested;
  }

  queueUnit(unitType, player) {
    if (!this.isConstructed) return { success: false, reason: 'Building under construction!' };
    const info = TRAINING_CONFIG[unitType];
    if (!info) return { success: false, reason: 'Unknown unit type!' };

    if (player.pop + this.queue.length >= player.maxPop) {
      return { success: false, reason: 'Population limit reached! Build more Houses.' };
    }

    if (info.cost.food && player.food < info.cost.food) {
      return { success: false, reason: `Need ${info.cost.food} Food!` };
    }
    if (info.cost.wood && player.wood < info.cost.wood) {
      return { success: false, reason: `Need ${info.cost.wood} Wood!` };
    }
    if (info.cost.gold && player.gold < info.cost.gold) {
      return { success: false, reason: `Need ${info.cost.gold} Gold!` };
    }

    if (info.cost.food) player.food -= info.cost.food;
    if (info.cost.wood) player.wood -= info.cost.wood;
    if (info.cost.gold) player.gold -= info.cost.gold;

    this.queue.push({ type: 'UNIT', id: unitType, duration: info.time, name: info.name });
    return { success: true };
  }

  queueResearch(upgradeId, player, researchedSet) {
    if (!this.isConstructed) return { success: false, reason: 'Building under construction!' };
    const info = UPGRADE_CONFIG[upgradeId];
    if (!info) return { success: false, reason: 'Unknown research!' };

    if (researchedSet && researchedSet.has(upgradeId)) {
      return { success: false, reason: 'Already researched!' };
    }

    if (this.queue.some(item => item.id === upgradeId)) {
      return { success: false, reason: 'Research already in queue!' };
    }

    if (info.cost.food && player.food < info.cost.food) {
      return { success: false, reason: `Need ${info.cost.food} Food!` };
    }
    if (info.cost.wood && player.wood < info.cost.wood) {
      return { success: false, reason: `Need ${info.cost.wood} Wood!` };
    }
    if (info.cost.gold && player.gold < info.cost.gold) {
      return { success: false, reason: `Need ${info.cost.gold} Gold!` };
    }

    if (info.cost.food) player.food -= info.cost.food;
    if (info.cost.wood) player.wood -= info.cost.wood;
    if (info.cost.gold) player.gold -= info.cost.gold;

    this.queue.push({ type: 'RESEARCH', id: upgradeId, duration: info.time, name: info.name });
    return { success: true };
  }

  update(dt, game = null) {
    super.update(dt);

    // Fire & Smoke Particles when badly damaged (< 50% HP)
    if (this.isConstructed && this.hp < this.maxHp * 0.5 && !this.isDead) {
      this.fireTimer += dt;
      if (this.fireTimer >= 0.15 && game && game.hud) {
        this.fireTimer = 0;
        const fx = this.x + (Math.random() - 0.5) * this.radius * 1.2;
        const fy = this.y - this.radius * 0.4 + (Math.random() - 0.5) * 12;
        game.hud.addSparkle(fx, fy, Math.random() > 0.5 ? '#f97316' : '#ef4444');
      }
    }

    // 1. FORTRESS HEALING SANCTUARY: Consumes food to heal nearby soldiers!
    if (this.isConstructed && this.isFortress && !this.isDead && game) {
      this.healTimer += dt;
      if (this.healTimer >= 1.0) {
        this.healTimer = 0;

        for (const unit of game.units) {
          if (unit.faction === this.faction && !unit.isDead && !unit.isDying) {
            if (unit.hp < unit.maxHp) {
              const d = Math.hypot(unit.x - this.x, unit.y - this.y);
              if (d <= this.healingRadius) {
                // Check if player has food to sustain healing
                if (this.faction === 'PLAYER') {
                  if (game.player.food >= 1) {
                    game.player.food -= 1;
                    unit.heal(8);
                    game.hud.addSparkle(unit.x, unit.y, '#22c55e');
                    game.hud.addFloatingText(unit.x, unit.y - 20, '+8 HP 💚', '#22c55e');
                  }
                } else {
                  // AI Fortress heal
                  unit.heal(6);
                }
              }
            }
          }
        }
      }
    }

    // 2. FORTRESS & WATCH TOWER MULTI-ARROW DEFENSIVE VOLLEY
    if (this.isConstructed && this.volleyArrows > 0 && !this.isDead && game) {
      if (this.attackTimer > 0) {
        this.attackTimer -= dt;
      } else {
        // Find all hostiles in range
        const hostiles = [];
        for (const unit of game.units) {
          if (unit.faction !== this.faction && !unit.isDead && !unit.isDying) {
            if (this.faction === 'PLAYER' && game.fog && !game.fog.isVisible(unit.x, unit.y)) {
              continue;
            }
            const d = Math.hypot(unit.x - this.x, unit.y - this.y);
            if (d <= this.attackRange) {
              hostiles.push(unit);
            }
          }
        }

        if (hostiles.length > 0) {
          this.attackTimer = this.attackCooldown;

          // Fire multiple arrows simultaneously (up to volleyArrows)
          const arrowCount = Math.min(this.volleyArrows, hostiles.length * 2);
          for (let i = 0; i < arrowCount; i++) {
            const target = hostiles[i % hostiles.length];
            const startX = this.x + (Math.random() - 0.5) * 16;
            const startY = this.y - 16 + (Math.random() - 0.5) * 8;
            const arrow = new Projectile(startX, startY, target, this.attackDamage, this.faction);
            game.projectiles.push(arrow);
          }

          if (game.sound) game.sound.playTowerShot();
          if (game.effects) game.effects.addDust(this.x, this.y + 10);
        }
      }
    }

    // 3. Training / Research Queue Progress
    if (this.isConstructed && this.queue.length > 0) {
      const activeItem = this.queue[0];
      this.currentTrainTimer += dt;

      if (this.currentTrainTimer >= activeItem.duration) {
        this.currentTrainTimer = 0;
        const finished = this.queue.shift();

        if (game) {
          if (finished.type === 'UNIT') {
            game.spawnTrainedUnit(this, finished.id);
            if (this.faction === 'PLAYER' && game.sound) {
              game.sound.playUnitTrained();
            }
          } else if (finished.type === 'RESEARCH') {
            game.onUpgradeCompleted(finished.id, this.faction);
          }
        }
      }
    }
  }

  render(ctx) {
    if (this.isDead) return;

    this.renderSelectionRing(ctx);

    ctx.save();
    ctx.translate(this.x, this.y);

    let flagColor = '#2563eb';
    let wallColor = '#4b5563';
    let roofColor = '#a93226';

    if (this.faction === 'ENEMY_1') {
      flagColor = '#dc2626';
      wallColor = '#524343';
      roofColor = '#991b1b';
    } else if (this.faction === 'ENEMY_2') {
      flagColor = '#9333ea';
      wallColor = '#483d52';
      roofColor = '#7e22ce';
    } else if (this.faction === 'ENEMY_3') {
      flagColor = '#ea580c';
      wallColor = '#52453d';
      roofColor = '#c2410c';
    } else if (this.faction === 'ENEMY_4') {
      flagColor = '#0d9488';
      wallColor = '#3d524f';
      roofColor = '#0f766e';
    }

    // Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(4, 8, this.radius * 1.1, this.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // RENDER UNDER CONSTRUCTION
    if (!this.isConstructed) {
      const scaffoldW = this.radius * 1.8;
      const scaffoldH = this.radius * 1.4;

      ctx.fillStyle = '#78350f';
      ctx.fillRect(-scaffoldW / 2, -scaffoldH / 2, scaffoldW, scaffoldH);

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.strokeRect(-scaffoldW / 2 + 3, -scaffoldH / 2 + 3, scaffoldW - 6, scaffoldH - 6);

      const barW = 56;
      const barH = 7;
      const barY = -scaffoldH / 2 - 16;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

      ctx.fillStyle = '#f59e0b';
      const pct = Math.max(0, Math.min(1, this.buildProgress / 100));
      ctx.fillRect(-barW / 2, barY, barW * pct, barH);

      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`🔨 ${Math.floor(this.buildProgress)}%`, 0, barY - 3);

      ctx.restore();
      return;
    }

    // COMPLETED BUILDINGS
    if (this.buildingType === 'TOWN_CENTER') {
      // Grand Fortress Bastion
      const w = 84;
      const h = 70;

      ctx.fillStyle = wallColor;
      ctx.fillRect(-w / 2, -h / 2, w, h);

      // Gatehouse Arch
      ctx.fillStyle = '#1e1b18';
      ctx.beginPath();
      ctx.arc(0, h / 2 - 16, 14, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-14, h / 2 - 16, 28, 16);

      // 4 Corner Fortress Towers
      const tw = 20;
      const th = 28;
      const towers = [
        [-w / 2 - 3, -h / 2 - 4],
        [w / 2 - tw + 3, -h / 2 - 4],
        [-w / 2 - 3, h / 2 - th + 4],
        [w / 2 - tw + 3, h / 2 - th + 4]
      ];
      for (const [tx, ty] of towers) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(tx, ty, tw, th);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(tx + 2, ty - 4, 5, 4);
        ctx.fillRect(tx + tw - 7, ty - 4, 5, 4);
      }

      // Pagoda / Asian Fortress Roof Trim
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(-w / 2 - 8, -h / 2 + 4);
      ctx.lineTo(0, -h / 2 - 24);
      ctx.lineTo(w / 2 + 8, -h / 2 + 4);
      ctx.closePath();
      ctx.fill();

      // Flagpole on Central Fortress Spire
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 - 24);
      ctx.lineTo(0, -h / 2 - 42);
      ctx.stroke();

      const wave = Math.sin(Date.now() * 0.005) * 3;
      ctx.fillStyle = flagColor;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 - 42);
      ctx.lineTo(18, -h / 2 - 36 + wave);
      ctx.lineTo(0, -h / 2 - 30);
      ctx.closePath();
      ctx.fill();

      // Fortress Arrow Volley Indicator Badge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(-22, -h / 2 - 14, 44, 14);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🏹 Volley: ${this.volleyArrows}`, 0, -h / 2 - 4);
    } else if (this.buildingType === 'BARRACKS') {
      const bw = 60;
      const bh = 50;

      ctx.fillStyle = wallColor;
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);

      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(-bw / 2 - 4, -bh / 2);
      ctx.lineTo(0, -bh / 2 - 16);
      ctx.lineTo(bw / 2 + 4, -bh / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#d4af37';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚔️', 0, -bh / 2 + 16);

      ctx.fillStyle = '#111827';
      ctx.fillRect(-8, bh / 2 - 16, 16, 16);
    } else if (this.buildingType === 'WATCH_TOWER') {
      const tw = 28;
      const th = 48;

      ctx.fillStyle = wallColor;
      ctx.fillRect(-tw / 2, -th / 2, tw, th);

      ctx.fillStyle = '#78350f';
      ctx.fillRect(-tw / 2 - 4, -th / 2 - 6, tw + 8, 8);

      ctx.fillStyle = '#451a03';
      ctx.fillRect(-tw / 2 - 4, -th / 2 - 10, 6, 5);
      ctx.fillRect(-3, -th / 2 - 10, 6, 5);
      ctx.fillRect(tw / 2 - 2, -th / 2 - 10, 6, 5);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-2, -th / 4, 4, 10);
      ctx.fillRect(-2, 4, 4, 10);

      // Flag on tower top
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tw / 2 + 2, -th / 2 - 6);
      ctx.lineTo(tw / 2 + 2, -th / 2 - 22);
      ctx.stroke();

      const wave = Math.sin(Date.now() * 0.006) * 2;
      ctx.fillStyle = flagColor;
      ctx.beginPath();
      ctx.moveTo(tw / 2 + 2, -th / 2 - 22);
      ctx.lineTo(tw / 2 + 14, -th / 2 - 18 + wave);
      ctx.lineTo(tw / 2 + 2, -th / 2 - 14);
      ctx.closePath();
      ctx.fill();
    } else if (this.buildingType === 'BLACKSMITH') {
      const w = 52;
      const h = 42;

      ctx.fillStyle = '#334155';
      ctx.fillRect(-w / 2, -h / 2, w, h);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(w / 4, -h / 2 - 12, 10, 14);

      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚒️', 0, 4);

      ctx.fillStyle = '#f97316';
      ctx.fillRect(-8, h / 2 - 12, 16, 12);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-5, h / 2 - 8, 10, 8);
    } else if (this.buildingType === 'FARM') {
      const fw = 48;
      const fh = 48;

      ctx.fillStyle = '#543d2b';
      ctx.fillRect(-fw / 2, -fh / 2, fw, fh);

      const pctFood = this.farmFood / this.maxFarmFood;
      const cropColor = pctFood > 0.3 ? '#eab308' : '#ca8a04';
      ctx.fillStyle = cropColor;

      for (let y = -fh / 2 + 6; y < fh / 2; y += 8) {
        for (let x = -fw / 2 + 6; x < fw / 2; x += 8) {
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 2;
      ctx.strokeRect(-fw / 2, -fh / 2, fw, fh);
    } else if (this.buildingType === 'HOUSE') {
      const hw = 42;
      const hh = 36;

      ctx.fillStyle = '#6b4f3b';
      ctx.fillRect(-hw / 2, -hh / 2, hw, hh);

      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-hw / 2 - 4, -hh / 2);
      ctx.lineTo(0, -hh / 2 - 14);
      ctx.lineTo(hw / 2 + 4, -hh / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#4b5563';
      ctx.fillRect(hw / 4, -hh / 2 - 12, 6, 8);

      ctx.fillStyle = '#291e16';
      ctx.fillRect(-5, hh / 2 - 12, 10, 12);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(8, -4, 6, 6);
    }

    // Burning Flames Icon on Roof if low HP
    if (this.hp < this.maxHp * 0.5) {
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔥', -8, -this.radius * 0.5);
      ctx.fillText('🔥', 8, -this.radius * 0.7);
    }

    ctx.restore();

    // RALLY POINT FLAG & LINE (If Selected)
    if (this.isSelected && this.faction === 'PLAYER' && (this.buildingType === 'TOWN_CENTER' || this.buildingType === 'BARRACKS')) {
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.rallyPoint.x, this.rallyPoint.y);
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(this.rallyPoint.x - 1, this.rallyPoint.y - 18, 2, 18);

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(this.rallyPoint.x + 1, this.rallyPoint.y - 18);
      ctx.lineTo(this.rallyPoint.x + 12, this.rallyPoint.y - 12);
      ctx.lineTo(this.rallyPoint.x + 1, this.rallyPoint.y - 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Fortress Healing Aura Ring (Gentle Green Pulse if Selected)
    if (this.isSelected && this.isFortress && this.faction === 'PLAYER') {
      ctx.save();
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.healingRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#22c55e';
      ctx.textAlign = 'center';
      ctx.fillText('Sanctuary Healing Zone (Uses Food) 💚', this.x, this.y - this.healingRadius - 6);
      ctx.restore();
    }

    // Production / Research Queue Progress Bar
    if (this.queue.length > 0) {
      const currentItem = this.queue[0];
      const prog = Math.min(1, this.currentTrainTimer / currentItem.duration);

      const pbW = 42;
      const pbH = 4;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(this.x - pbW / 2, this.y - this.radius - 22, pbW, pbH);

      ctx.fillStyle = currentItem.type === 'RESEARCH' ? '#a855f7' : '#38bdf8';
      ctx.fillRect(this.x - pbW / 2, this.y - this.radius - 22, pbW * prog, pbH);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(this.x + pbW / 2 + 6, this.y - this.radius - 20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '8px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(this.queue.length, this.x + pbW / 2 + 6, this.y - this.radius - 17);
    }

    // Farm Food remaining bar
    if (this.buildingType === 'FARM' && this.isConstructed) {
      const fPct = this.farmFood / this.maxFarmFood;
      const fbW = 32;
      const fbH = 3;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(this.x - fbW / 2, this.y + this.radius + 6, fbW, fbH);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(this.x - fbW / 2, this.y + this.radius + 6, fbW * fPct, fbH);
    }

    this.renderHealthBar(ctx, this.radius + 18);
  }
}
