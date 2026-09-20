import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';

export const BUILDING_TYPES = {
  TOWN_CENTER: {
    name: 'Town Center',
    hp: 1500,
    radius: 46,
    isDropoff: true,
    avatar: '🏰',
    cost: { wood: 350 },
    role: 'Base HQ & Dropoff',
    trainable: ['VILLAGER'],
    researches: []
  },
  BARRACKS: {
    name: 'Barracks',
    hp: 800,
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
    hp: 650,
    radius: 24,
    isDropoff: false,
    avatar: '🗼',
    cost: { wood: 80, gold: 25 },
    role: 'Defensive Turret (Shoots Arrows)',
    trainable: [],
    researches: [],
    attackDamage: 13,
    attackRange: 210,
    attackCooldown: 1.4
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
    researches: ['FORGED_BLADES', 'SCALE_ARMOR', 'BODKIN_ARROWS', 'WHEELBARROW']
  },
  FARM: {
    name: 'Farm',
    hp: 350,
    radius: 26,
    isDropoff: false,
    avatar: '🌾',
    cost: { wood: 60 },
    role: 'Renewable Food Field (350 Food)',
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
    time: 7,
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
    desc: '+3 Damage to Melee Infantry & Knights',
    cost: { food: 60, gold: 50 },
    time: 10,
    avatar: '🗡️'
  },
  SCALE_ARMOR: {
    name: 'Scale Armor',
    desc: '+25 Max HP to all military troops',
    cost: { food: 70, gold: 40 },
    time: 10,
    avatar: '🛡️'
  },
  BODKIN_ARROWS: {
    name: 'Bodkin Arrows',
    desc: '+35 Attack Range & +2 Damage to Archers',
    cost: { wood: 70, gold: 50 },
    time: 10,
    avatar: '🎯'
  },
  WHEELBARROW: {
    name: 'Wheelbarrow',
    desc: '+5 Villager carry capacity & +15% speed',
    cost: { food: 50, wood: 60 },
    time: 9,
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
    this.queue = []; // Array of unitTypes or researchIds
    this.currentTrainTimer = 0;

    // Defense Tower parameters
    this.attackDamage = config.attackDamage || 0;
    this.attackRange = config.attackRange || 0;
    this.attackCooldown = config.attackCooldown || 1.5;
    this.attackTimer = 0;

    // Farm Food Reserve
    if (type === 'FARM') {
      this.maxFarmFood = 350;
      this.farmFood = this.maxFarmFood;
    }

    // Fire / Damage FX
    this.fireTimer = 0;
  }

  setRallyPoint(worldX, worldY) {
    this.rallyPoint = { x: worldX, y: worldY };
    this.hasCustomRallyPoint = true;
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

    // Check if already in queue
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

    // WATCH TOWER: Auto-defense arrow firing
    if (this.isConstructed && this.buildingType === 'WATCH_TOWER' && !this.isDead && game) {
      if (this.attackTimer > 0) {
        this.attackTimer -= dt;
      } else {
        const hostileFaction = this.faction === 'PLAYER' ? 'ENEMY' : 'PLAYER';
        let target = null;
        let minDist = this.attackRange;

        for (const unit of game.units) {
          if (unit.faction === hostileFaction && !unit.isDead && !unit.isDying) {
            // Fog of war check: towers only target visible enemies
            if (this.faction === 'PLAYER' && game.fog && !game.fog.isVisible(unit.x, unit.y)) {
              continue;
            }
            const d = Math.hypot(unit.x - this.x, unit.y - this.y);
            if (d <= minDist) {
              minDist = d;
              target = unit;
            }
          }
        }

        if (target) {
          this.attackTimer = this.attackCooldown;
          const arrow = new Projectile(this.x, this.y - 20, target, this.attackDamage, this.faction);
          game.projectiles.push(arrow);
          if (game.sound) game.sound.playTowerShot();
          if (game.effects) game.effects.addDust(this.x, this.y + 10);
        }
      }
    }

    // Training / Research Queue Progress
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

    const isPlayer = this.faction === 'PLAYER';
    const flagColor = isPlayer ? '#2563eb' : '#dc2626';

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

      ctx.beginPath();
      ctx.moveTo(-scaffoldW / 2 + 3, -scaffoldH / 2 + 3);
      ctx.lineTo(scaffoldW / 2 - 3, scaffoldH / 2 - 3);
      ctx.moveTo(scaffoldW / 2 - 3, -scaffoldH / 2 + 3);
      ctx.lineTo(-scaffoldW / 2 + 3, scaffoldH / 2 - 3);
      ctx.stroke();

      const barW = 56;
      const barH = 7;
      const barY = -scaffoldH / 2 - 16;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

      ctx.fillStyle = '#f59e0b';
      const pct = Math.max(0, Math.min(1, this.buildProgress / 100));
      ctx.fillRect(-barW / 2, barY, barW * pct, barH);

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`🔨 ${Math.floor(this.buildProgress)}%`, 0, barY - 3);

      ctx.restore();
      return;
    }

    // COMPLETED BUILDINGS
    if (this.buildingType === 'TOWN_CENTER') {
      const w = 76;
      const h = 64;

      ctx.fillStyle = isPlayer ? '#4b5563' : '#524343';
      ctx.fillRect(-w / 2, -h / 2, w, h);

      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      for (let y = -h / 2 + 10; y < h / 2; y += 10) {
        ctx.beginPath();
        ctx.moveTo(-w / 2, y);
        ctx.lineTo(w / 2, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#1e1b18';
      ctx.beginPath();
      ctx.arc(0, h / 2 - 14, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-12, h / 2 - 14, 24, 14);

      const tw = 18;
      const th = 26;
      const towers = [
        [-w / 2 - 2, -h / 2 - 4],
        [w / 2 - tw + 2, -h / 2 - 4],
        [-w / 2 - 2, h / 2 - th + 4],
        [w / 2 - tw + 2, h / 2 - th + 4]
      ];
      for (const [tx, ty] of towers) {
        ctx.fillStyle = isPlayer ? '#374151' : '#3d3030';
        ctx.fillRect(tx, ty, tw, th);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(tx + 2, ty - 4, 4, 4);
        ctx.fillRect(tx + tw - 6, ty - 4, 4, 4);
      }

      ctx.fillStyle = isPlayer ? '#a93226' : '#991b1b';
      ctx.beginPath();
      ctx.moveTo(-22, -h / 2);
      ctx.lineTo(0, -h / 2 - 20);
      ctx.lineTo(22, -h / 2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 - 20);
      ctx.lineTo(0, -h / 2 - 36);
      ctx.stroke();

      const wave = Math.sin(Date.now() * 0.005) * 3;
      ctx.fillStyle = flagColor;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 - 36);
      ctx.lineTo(16, -h / 2 - 31 + wave);
      ctx.lineTo(0, -h / 2 - 26);
      ctx.closePath();
      ctx.fill();
    } else if (this.buildingType === 'BARRACKS') {
      const bw = 60;
      const bh = 50;

      ctx.fillStyle = isPlayer ? '#3f2e20' : '#452a2a';
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);

      ctx.fillStyle = isPlayer ? '#1e293b' : '#331919';
      ctx.beginPath();
      ctx.moveTo(-bw / 2 - 4, -bh / 2);
      ctx.lineTo(0, -bh / 2 - 16);
      ctx.lineTo(bw / 2 + 4, -bh / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isPlayer ? '#d4af37' : '#ef4444';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚔️', 0, -bh / 2 + 16);

      ctx.fillStyle = '#111827';
      ctx.fillRect(-8, bh / 2 - 16, 16, 16);
    } else if (this.buildingType === 'WATCH_TOWER') {
      // Tall defensive stone tower
      const tw = 28;
      const th = 48;

      ctx.fillStyle = isPlayer ? '#475569' : '#574141';
      ctx.fillRect(-tw / 2, -th / 2, tw, th);

      // Wooden battlement rim
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-tw / 2 - 4, -th / 2 - 6, tw + 8, 8);

      // Crenelations
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-tw / 2 - 4, -th / 2 - 10, 6, 5);
      ctx.fillRect(-3, -th / 2 - 10, 6, 5);
      ctx.fillRect(tw / 2 - 2, -th / 2 - 10, 6, 5);

      // Arrow slits
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

      // Chimney & Smoke
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(w / 4, -h / 2 - 12, 10, 14);

      // Anvil Icon
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚒️', 0, 4);

      // Glowing Forge Opening
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-8, h / 2 - 12, 16, 12);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-5, h / 2 - 8, 10, 8);
    } else if (this.buildingType === 'FARM') {
      const fw = 48;
      const fh = 48;

      // Soil background
      ctx.fillStyle = '#543d2b';
      ctx.fillRect(-fw / 2, -fh / 2, fw, fh);

      // Wheat crop rows
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

      // Wooden fence border
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

      // Flag pole
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(this.rallyPoint.x - 1, this.rallyPoint.y - 18, 2, 18);

      // Flag pennant
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(this.rallyPoint.x + 1, this.rallyPoint.y - 18);
      ctx.lineTo(this.rallyPoint.x + 12, this.rallyPoint.y - 12);
      ctx.lineTo(this.rallyPoint.x + 1, this.rallyPoint.y - 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Production / Research Queue Progress Bar
    if (this.queue.length > 0) {
      const currentItem = this.queue[0];
      const prog = Math.min(1, this.currentTrainTimer / currentItem.duration);

      const pbW = 38;
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
