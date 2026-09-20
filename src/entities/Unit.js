import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';

export const UNIT_TYPES = {
  VILLAGER: {
    name: 'Villager',
    hp: 80,
    speed: 120,
    radius: 12,
    attack: 5,
    range: 22,
    cooldown: 1.4,
    avatar: '👨‍🌾',
    role: 'Worker / Builder / Farmer',
    maxCarry: 10
  },
  SWORDSMAN: {
    name: 'Swordsman',
    hp: 140,
    speed: 130,
    radius: 14,
    attack: 16,
    range: 26,
    cooldown: 1.1,
    avatar: '⚔️',
    role: 'Melee Infantry',
    maxCarry: 0
  },
  ARCHER: {
    name: 'Archer',
    hp: 85,
    speed: 125,
    radius: 12,
    attack: 11,
    range: 160,
    cooldown: 1.4,
    avatar: '🏹',
    role: 'Ranged Scout',
    maxCarry: 0
  },
  KNIGHT: {
    name: 'Knight',
    hp: 210,
    speed: 175,
    radius: 15,
    attack: 22,
    range: 28,
    cooldown: 1.0,
    avatar: '🏇',
    role: 'Heavy Cavalry / Flanker',
    maxCarry: 0
  }
};

export class Unit extends Entity {
  constructor(x, y, type = 'SWORDSMAN', faction = 'PLAYER') {
    const config = UNIT_TYPES[type] || UNIT_TYPES.SWORDSMAN;
    super(x, y, config.radius, faction, config.hp);

    this.unitType = type;
    this.name = config.name;
    this.baseSpeed = config.speed;
    this.speed = config.speed;
    this.baseAttack = config.attack;
    this.attackDamage = config.attack;
    this.baseRange = config.range;
    this.attackRange = config.range;
    this.attackCooldown = config.cooldown;
    this.avatar = config.avatar;
    this.role = config.role;

    // Movement & Waypoints
    this.targetX = null;
    this.targetY = null;
    this.waypoints = [];
    this.state = 'IDLE'; // 'IDLE' | 'MOVING' | 'MOVING_TO_RESOURCE' | 'GATHERING' | 'RETURNING_TO_DROPOFF' | 'BUILDING' | 'ATTACKING' | 'FARMING'
    this.angle = 0;

    // Combat & Aggro
    this.targetEnemy = null;
    this.attackCooldownTimer = 0;
    this.sightRadius = type === 'ARCHER' ? 220 : type === 'KNIGHT' ? 200 : 185;
    this.isDying = false;
    this.deathFade = 1.0;

    // Villager Economy & Construction
    this.baseCarry = config.maxCarry || 0;
    this.maxCarry = this.baseCarry;
    this.carriedType = null;
    this.carriedAmount = 0;
    this.targetResource = null;
    this.targetFarm = null;
    this.targetDropoff = null;
    this.targetBuilding = null;
    this.gatherTimer = 0;
    this.gatherInterval = 1.0;

    // Animations & Juice
    this.walkTimer = 0;
    this.toolSwing = 0;
    this.dustTimer = 0;
  }

  applyUpgrades(upgradesSet) {
    if (!upgradesSet) return;

    // Reset to base
    this.speed = this.baseSpeed;
    this.attackDamage = this.baseAttack;
    this.attackRange = this.baseRange;
    this.maxCarry = this.baseCarry;

    // 1. Wheelbarrow (Villager speed & carry)
    if (this.unitType === 'VILLAGER' && upgradesSet.has('WHEELBARROW')) {
      this.speed = Math.floor(this.baseSpeed * 1.15);
      this.maxCarry = this.baseCarry + 5;
    }

    // 2. Forged Steel (Melee & Knight attack)
    if ((this.unitType === 'SWORDSMAN' || this.unitType === 'KNIGHT') && upgradesSet.has('FORGED_BLADES')) {
      this.attackDamage = this.baseAttack + 3;
    }

    // 3. Bodkin Arrows (Archer range & attack)
    if (this.unitType === 'ARCHER' && upgradesSet.has('BODKIN_ARROWS')) {
      this.attackRange = this.baseRange + 35;
      this.attackDamage = this.baseAttack + 2;
    }

    // 4. Scale Armor (HP bonus)
    if (this.unitType !== 'VILLAGER' && upgradesSet.has('SCALE_ARMOR')) {
      const bonusHp = 25;
      if (this.maxHp === UNIT_TYPES[this.unitType].hp) {
        this.maxHp += bonusHp;
        this.hp += bonusHp;
      }
    }
  }

  setPath(waypoints) {
    if (!waypoints || waypoints.length === 0) return;
    this.waypoints = [...waypoints];
    const next = this.waypoints.shift();
    this.targetX = next.x;
    this.targetY = next.y;
    this.state = 'MOVING';
    this.targetResource = null;
    this.targetFarm = null;
    this.targetBuilding = null;
    this.targetEnemy = null;
  }

  moveTo(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.waypoints = [];
    this.state = 'MOVING';
    this.targetResource = null;
    this.targetFarm = null;
    this.targetBuilding = null;
    this.targetEnemy = null;
  }

  orderAttack(enemyEntity) {
    this.targetEnemy = enemyEntity;
    this.targetResource = null;
    this.targetFarm = null;
    this.targetBuilding = null;
    this.waypoints = [];
    this.state = 'ATTACKING';
  }

  orderHarvest(resourceNode, dropoffBuilding) {
    if (this.unitType !== 'VILLAGER') {
      this.moveTo(resourceNode.x, resourceNode.y);
      return;
    }

    this.targetResource = resourceNode;
    this.targetFarm = null;
    this.targetDropoff = dropoffBuilding;
    this.targetBuilding = null;
    this.targetEnemy = null;

    if (this.carriedAmount >= this.maxCarry) {
      this.state = 'RETURNING_TO_DROPOFF';
    } else {
      this.state = 'MOVING_TO_RESOURCE';
    }
  }

  orderFarm(farmBuilding, dropoffBuilding) {
    if (this.unitType !== 'VILLAGER') {
      this.moveTo(farmBuilding.x, farmBuilding.y);
      return;
    }

    this.targetFarm = farmBuilding;
    this.targetResource = null;
    this.targetDropoff = dropoffBuilding;
    this.targetBuilding = null;
    this.targetEnemy = null;

    if (this.carriedAmount >= this.maxCarry) {
      this.state = 'RETURNING_TO_DROPOFF';
    } else {
      this.state = 'FARMING';
    }
  }

  orderBuild(building) {
    if (this.unitType !== 'VILLAGER') {
      this.moveTo(building.x, building.y);
      return;
    }

    this.targetBuilding = building;
    this.targetResource = null;
    this.targetFarm = null;
    this.targetEnemy = null;
    this.state = 'BUILDING';
  }

  stop() {
    this.targetX = null;
    this.targetY = null;
    this.waypoints = [];
    this.state = 'IDLE';
    this.targetResource = null;
    this.targetFarm = null;
    this.targetDropoff = null;
    this.targetBuilding = null;
    this.targetEnemy = null;
  }

  update(dt, map, allUnits = [], game = null) {
    // 0. Handle Death Fadeout
    if (this.isDying) {
      this.deathFade -= dt * 0.8;
      if (this.deathFade <= 0) {
        this.isDead = true;
      }
      return;
    }

    if (this.hp <= 0 && !this.isDying) {
      this.isDying = true;
      if (game && game.hud) {
        game.hud.addFloatingText(this.x, this.y - 20, 'Fallen! 💀', '#ef4444');
      }
      if (game && game.effects) {
        game.effects.addCombatSparks(this.x, this.y, '#991b1b');
      }
      return;
    }

    super.update(dt);

    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= dt;
    }

    // ==========================================
    // 1. COMBAT & AGGRO LOGIC
    // ==========================================
    if (this.state === 'IDLE' && game) {
      const nearestEnemy = this.findNearestHostile(game);
      if (nearestEnemy) {
        this.orderAttack(nearestEnemy);
      }
    }

    if (this.state === 'ATTACKING') {
      if (!this.targetEnemy || this.targetEnemy.isDead || this.targetEnemy.isDying) {
        const nextEnemy = game ? this.findNearestHostile(game) : null;
        if (nextEnemy) {
          this.orderAttack(nextEnemy);
        } else {
          this.stop();
        }
        return;
      }

      const dist = Math.hypot(this.targetEnemy.x - this.x, this.targetEnemy.y - this.y);
      const effectiveRange = this.radius + this.targetEnemy.radius + this.attackRange;

      if (dist > effectiveRange) {
        this.stepTowards(this.targetEnemy.x, this.targetEnemy.y, dt, map, game);
      } else {
        this.walkTimer = 0;
        this.angle = Math.atan2(this.targetEnemy.y - this.y, this.targetEnemy.x - this.x);

        if (this.attackCooldownTimer <= 0) {
          this.attackCooldownTimer = this.attackCooldown;
          this.toolSwing = 1.0;

          // Compute damage (Rock-Paper-Scissors bonuses: Knight vs Archer)
          let finalDamage = this.attackDamage;
          if (this.unitType === 'KNIGHT' && this.targetEnemy instanceof Unit && this.targetEnemy.unitType === 'ARCHER') {
            finalDamage = Math.round(finalDamage * 1.5); // 50% bonus vs archers!
          }

          if (this.unitType === 'ARCHER') {
            if (game) {
              const arrow = new Projectile(this.x, this.y, this.targetEnemy, finalDamage, this.faction);
              game.projectiles.push(arrow);
              if (game.sound) game.sound.playBow();
            }
          } else {
            // Melee Attack
            this.targetEnemy.takeDamage(finalDamage);

            if (game) {
              const isCrit = this.unitType === 'KNIGHT' && this.targetEnemy instanceof Unit && this.targetEnemy.unitType === 'ARCHER';
              const textCol = isCrit ? '#f59e0b' : '#ef4444';
              const textPrefix = isCrit ? '💥 ' : '-';
              game.hud.addFloatingText(this.targetEnemy.x, this.targetEnemy.y - 18, `${textPrefix}${finalDamage}`, textCol);

              if (game.effects) {
                game.effects.addCombatSparks(this.targetEnemy.x, this.targetEnemy.y, isCrit ? '#f59e0b' : '#dc2626');
                if (this.unitType === 'KNIGHT') {
                  game.effects.triggerShake(3, 0.15);
                }
              }

              if (game.sound) {
                if (this.unitType === 'KNIGHT') game.sound.playKnightHit();
                else game.sound.playSword();
              }

              if (this.targetEnemy.hp <= 0 && this.faction === 'PLAYER') {
                game.hud.addFloatingText(this.targetEnemy.x, this.targetEnemy.y - 32, 'Vanquished! ⚔️', '#ffd700');
              }
            }
          }
        }
      }
      return;
    }

    // ==========================================
    // 2. VILLAGER SPECIFIC STATES (Build/Gather/Farm)
    // ==========================================
    if (this.unitType === 'VILLAGER') {
      if (this.state === 'BUILDING') {
        if (!this.targetBuilding || this.targetBuilding.isDead) {
          this.stop();
          return;
        }

        const dist = Math.hypot(this.targetBuilding.x - this.x, this.targetBuilding.y - this.y);
        const buildReach = this.radius + this.targetBuilding.radius + 22;

        if (dist > buildReach) {
          this.stepTowards(this.targetBuilding.x, this.targetBuilding.y, dt, map, game);
        } else {
          this.walkTimer = 0;
          this.angle = Math.atan2(this.targetBuilding.y - this.y, this.targetBuilding.x - this.x);
          this.toolSwing = Math.sin(Date.now() * 0.015);

          this.targetBuilding.build(dt, 1);

          if (Math.random() < 0.25 && game && game.effects) {
            game.effects.addWoodChips(this.targetBuilding.x, this.targetBuilding.y);
          }

          if (this.targetBuilding.isConstructed) {
            if (game) game.onBuildingCompleted(this.targetBuilding);
            this.stop();
          }
        }
        return;
      }

      // Harvesting Natural Resource Nodes
      if (this.state === 'MOVING_TO_RESOURCE' || this.state === 'GATHERING') {
        if (!this.targetResource || this.targetResource.isDead) {
          this.findNearbyResource(game);
          return;
        }

        const dist = Math.hypot(this.targetResource.x - this.x, this.targetResource.y - this.y);
        const harvestReach = this.radius + this.targetResource.radius + 18;

        if (dist > harvestReach) {
          this.state = 'MOVING_TO_RESOURCE';
          this.stepTowards(this.targetResource.x, this.targetResource.y, dt, map, game);
        } else {
          this.state = 'GATHERING';
          this.walkTimer = 0;
          this.angle = Math.atan2(this.targetResource.y - this.y, this.targetResource.x - this.x);

          this.gatherTimer += dt;
          this.toolSwing = Math.sin(this.gatherTimer * 12);

          if (this.gatherTimer >= this.gatherInterval) {
            this.gatherTimer = 0;
            const harvested = this.targetResource.harvest(1);

            if (harvested > 0) {
              this.carriedType = this.targetResource.resourceType;
              this.carriedAmount += harvested;
              if (game && game.hud) {
                game.hud.addSparkle(this.targetResource.x, this.targetResource.y, this.targetResource.config.color);
              }
              if (game && game.sound) {
                if (this.carriedType === 'WOOD') game.sound.playChop();
                else if (this.carriedType === 'GOLD') game.sound.playMine();
              }
            }

            if (this.carriedAmount >= this.maxCarry || this.targetResource.isDead) {
              if (this.targetDropoff && !this.targetDropoff.isDead) {
                this.state = 'RETURNING_TO_DROPOFF';
              } else {
                this.stop();
              }
            }
          }
        }
        return;
      }

      // Harvesting Sustainable Farms
      if (this.state === 'FARMING') {
        if (!this.targetFarm || this.targetFarm.isDead || !this.targetFarm.isConstructed) {
          this.stop();
          return;
        }

        const dist = Math.hypot(this.targetFarm.x - this.x, this.targetFarm.y - this.y);
        const reach = this.radius + this.targetFarm.radius + 18;

        if (dist > reach) {
          this.stepTowards(this.targetFarm.x, this.targetFarm.y, dt, map, game);
        } else {
          this.walkTimer = 0;
          this.angle = Math.atan2(this.targetFarm.y - this.y, this.targetFarm.x - this.x);

          this.gatherTimer += dt;
          this.toolSwing = Math.sin(this.gatherTimer * 10);

          if (this.gatherTimer >= this.gatherInterval) {
            this.gatherTimer = 0;
            const harvested = this.targetFarm.harvestFarm(1);

            if (harvested > 0) {
              this.carriedType = 'FOOD';
              this.carriedAmount += harvested;
              if (game && game.hud) {
                game.hud.addSparkle(this.targetFarm.x, this.targetFarm.y, '#eab308');
              }
              if (game && game.sound) {
                game.sound.playChop();
              }
            }

            if (this.carriedAmount >= this.maxCarry || this.targetFarm.isDead) {
              if (this.targetDropoff && !this.targetDropoff.isDead) {
                this.state = 'RETURNING_TO_DROPOFF';
              } else {
                this.stop();
              }
            }
          }
        }
        return;
      }

      if (this.state === 'RETURNING_TO_DROPOFF') {
        if (!this.targetDropoff || this.targetDropoff.isDead) {
          const tc = game ? game.findNearestDropoff(this.x, this.y, this.faction) : null;
          if (tc) {
            this.targetDropoff = tc;
          } else {
            this.stop();
            return;
          }
        }

        const dist = Math.hypot(this.targetDropoff.x - this.x, this.targetDropoff.y - this.y);
        const dropoffReach = this.radius + this.targetDropoff.radius + 20;

        if (dist > dropoffReach) {
          this.stepTowards(this.targetDropoff.x, this.targetDropoff.y, dt, map, game);
        } else {
          if (game && this.carriedAmount > 0) {
            game.depositResource(this.carriedType, this.carriedAmount, this.targetDropoff.x, this.targetDropoff.y);
          }
          this.carriedAmount = 0;
          this.carriedType = null;

          if (this.targetFarm && !this.targetFarm.isDead) {
            this.state = 'FARMING';
          } else if (this.targetResource && !this.targetResource.isDead) {
            this.state = 'MOVING_TO_RESOURCE';
          } else {
            this.findNearbyResource(game);
          }
        }
        return;
      }
    }

    // ==========================================
    // 3. REGULAR GROUND MOVEMENT
    // ==========================================
    if (this.state === 'MOVING' && this.targetX !== null && this.targetY !== null) {
      const dist = Math.hypot(this.targetX - this.x, this.targetY - this.y);

      if (dist <= 6) {
        if (this.waypoints.length > 0) {
          const next = this.waypoints.shift();
          this.targetX = next.x;
          this.targetY = next.y;
        } else {
          this.x = this.targetX;
          this.y = this.targetY;
          this.stop();
        }
      } else {
        this.stepTowards(this.targetX, this.targetY, dt, map, game);
      }
    } else {
      this.walkTimer = 0;
    }

    // Soft separation
    for (const other of allUnits) {
      if (other !== this && !other.isDead && !other.isDying) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dist = Math.hypot(dx, dy);
        const minDist = this.radius + other.radius;

        if (dist > 0 && dist < minDist) {
          const pushForce = (minDist - dist) * 0.35;
          this.x += (dx / dist) * pushForce;
          this.y += (dy / dist) * pushForce;
        }
      }
    }
  }

  findNearestHostile(game) {
    const hostileFaction = this.faction === 'PLAYER' ? 'ENEMY' : 'PLAYER';
    let nearest = null;
    let minDist = this.sightRadius;

    // Check hostile units
    for (const u of game.units) {
      if (u.faction === hostileFaction && !u.isDead && !u.isDying) {
        // Respect Fog of War for Player units
        if (this.faction === 'PLAYER' && game.fog && !game.fog.isVisible(u.x, u.y)) {
          continue;
        }
        const d = Math.hypot(u.x - this.x, u.y - this.y);
        if (d < minDist) {
          minDist = d;
          nearest = u;
        }
      }
    }

    // Check hostile buildings if no units nearby
    if (!nearest) {
      for (const b of game.buildings) {
        if (b.faction === hostileFaction && !b.isDead) {
          if (this.faction === 'PLAYER' && game.fog && !game.fog.isVisible(b.x, b.y)) {
            continue;
          }
          const d = Math.hypot(b.x - this.x, b.y - this.y);
          if (d < minDist + 60) {
            minDist = d;
            nearest = b;
          }
        }
      }
    }

    return nearest;
  }

  stepTowards(tx, ty, dt, map, game = null) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    this.angle = Math.atan2(dy, dx);
    const step = this.speed * dt;
    const nextX = this.x + (dx / dist) * step;
    const nextY = this.y + (dy / dist) * step;

    if (map.isWalkable(nextX, nextY)) {
      this.x = nextX;
      this.y = nextY;
    } else if (map.isWalkable(nextX, this.y)) {
      this.x = nextX;
    } else if (map.isWalkable(this.x, nextY)) {
      this.y = nextY;
    }

    this.walkTimer += dt * (this.speed / 12);

    // Dust and water ripple juice
    this.dustTimer += dt;
    if (this.dustTimer >= 0.2 && game && game.effects) {
      this.dustTimer = 0;
      const tile = map.getTile(Math.floor(this.x / map.tileSize), Math.floor(this.y / map.tileSize));
      if (tile === 1) {
        game.effects.addWaterRipple(this.x, this.y);
      } else {
        game.effects.addDust(this.x, this.y);
      }
    }
  }

  findNearbyResource(game) {
    if (!game) {
      this.stop();
      return;
    }
    const resType = this.targetResource ? this.targetResource.resourceType : 'WOOD';
    const nearest = game.findNearestResource(this.x, this.y, resType);
    if (nearest) {
      this.targetResource = nearest;
      this.state = 'MOVING_TO_RESOURCE';
    } else {
      this.stop();
    }
  }

  render(ctx) {
    if (this.isDead) return;

    ctx.save();
    if (this.isDying) {
      ctx.globalAlpha = Math.max(0, this.deathFade);
      ctx.translate(this.x, this.y);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-2, -8, 4, 16);
      ctx.fillRect(-6, -4, 12, 4);
      ctx.restore();
      return;
    }

    // Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 4, this.radius, this.radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    this.renderSelectionRing(ctx);

    ctx.translate(this.x, this.y);
    const bob = Math.sin(this.walkTimer) * 2.2;
    ctx.translate(0, -bob);
    ctx.rotate(this.angle);

    const isPlayer = this.faction === 'PLAYER';
    const primaryColor = isPlayer ? '#2563eb' : '#dc2626';
    const secondaryColor = isPlayer ? '#1d4ed8' : '#b91c1c';

    if (this.unitType === 'KNIGHT') {
      // HORSE MOUNT
      ctx.fillStyle = '#78350f'; // Chestnut horse body
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Horse Head & Mane
      ctx.fillStyle = '#5c2b09';
      ctx.beginPath();
      ctx.ellipse(14, 0, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Horse Saddle
      ctx.fillStyle = primaryColor;
      ctx.fillRect(-5, -7, 10, 14);

      // Knight Rider Torso
      ctx.fillStyle = '#94a3b8'; // Steel armor
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Great Helm
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-2, -3, 6, 6);

      // Long Lance / Spear
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(4, 7, 24, 3);
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(28, 6);
      ctx.lineTo(34, 8.5);
      ctx.lineTo(28, 11);
      ctx.closePath();
      ctx.fill();

      // Shield
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(-2, -8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f3e5ab';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // Standard Infantry & Worker
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Helmet / Cap
      ctx.fillStyle = this.unitType === 'VILLAGER' ? '#d97706' : '#9ca3af';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      if (this.unitType === 'SWORDSMAN') {
        const slashAngle = this.state === 'ATTACKING' ? Math.sin(Date.now() * 0.02) * 0.8 : 0;
        ctx.save();
        ctx.rotate(slashAngle);
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(4, 6, 14, 3.5);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(4, 4, 2.5, 8);
        ctx.restore();

        // Shield
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.arc(0, -8, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f3e5ab';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (this.unitType === 'VILLAGER') {
        const swingAngle = (this.state === 'GATHERING' || this.state === 'BUILDING' || this.state === 'FARMING' || this.state === 'ATTACKING') ? this.toolSwing * 0.6 : 0;
        ctx.save();
        ctx.rotate(swingAngle);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(2, 5, 11, 2.5);
        ctx.fillStyle = this.state === 'BUILDING' ? '#fbbf24' : this.state === 'FARMING' ? '#eab308' : '#94a3b8';
        ctx.fillRect(10, 3, 4, 6);
        ctx.restore();

        if (this.carriedAmount > 0) {
          ctx.save();
          const packColor = this.carriedType === 'WOOD' ? '#78350f' : this.carriedType === 'GOLD' ? '#eab308' : '#16a34a';
          ctx.fillStyle = packColor;
          ctx.beginPath();
          ctx.arc(-this.radius * 0.7, 0, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
      } else if (this.unitType === 'ARCHER') {
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(6, 0, 8, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        ctx.fillStyle = '#78350f';
        ctx.fillRect(-this.radius * 0.6, -3, 5, 8);
      }
    }

    ctx.restore();

    if (this.unitType === 'VILLAGER' && this.carriedAmount > 0) {
      const resIcon = this.carriedType === 'WOOD' ? '🪵' : this.carriedType === 'GOLD' ? '🪙' : '🌾';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(this.x - 14, this.y - this.radius - 20, 28, 14);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - 14, this.y - this.radius - 20, 28, 14);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`${resIcon}${this.carriedAmount}`, this.x, this.y - this.radius - 9);
    }

    this.renderHealthBar(ctx, this.radius + 14);
  }
}
