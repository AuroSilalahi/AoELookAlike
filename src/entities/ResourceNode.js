import { Entity } from './Entity.js';

export const RESOURCE_TYPES = {
  WOOD: {
    name: 'Pine Tree',
    icon: '🪵',
    color: '#2d6a1e',
    accentColor: '#1d4813',
    maxAmount: 150,
    gatherSpeed: 2.0, // seconds per resource
    radius: 18
  },
  GOLD: {
    name: 'Gold Mine',
    icon: '🪙',
    color: '#d4af37',
    accentColor: '#8a7223',
    maxAmount: 400,
    gatherSpeed: 2.5,
    radius: 22
  },
  FOOD: {
    name: 'Berry Bush',
    icon: '🍇',
    color: '#8e24aa',
    accentColor: '#4a148c',
    maxAmount: 200,
    gatherSpeed: 1.8,
    radius: 16
  }
};

export class ResourceNode extends Entity {
  constructor(x, y, type = 'WOOD', amount = null) {
    const config = RESOURCE_TYPES[type] || RESOURCE_TYPES.WOOD;
    super(x, y, config.radius, 'GAIA', 100);

    this.resourceType = type;
    this.name = config.name;
    this.icon = config.icon;
    this.config = config;

    this.maxAmount = amount !== null ? amount : config.maxAmount;
    this.amount = this.maxAmount;

    // Visual harvesting wobble
    this.wobble = 0;
    this.wobbleDecay = 5;
  }

  harvest(amountRequested) {
    const harvested = Math.min(this.amount, amountRequested);
    this.amount -= harvested;
    this.wobble = 1.0; // Trigger visual shake

    if (this.amount <= 0) {
      this.isDead = true;
    }
    return harvested;
  }

  update(dt) {
    super.update(dt);
    if (this.wobble > 0) {
      this.wobble = Math.max(0, this.wobble - dt * this.wobbleDecay);
    }
  }

  render(ctx) {
    if (this.isDead) return;

    this.renderSelectionRing(ctx);

    ctx.save();
    ctx.translate(this.x, this.y);

    // Apply wobble during harvesting
    if (this.wobble > 0) {
      const shake = Math.sin(Date.now() * 0.05) * 2.5 * this.wobble;
      ctx.translate(shake, 0);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 8, this.radius, this.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.resourceType === 'WOOD') {
      // Tree trunk
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(-4, -2, 8, 14);

      // Leaves layers
      ctx.fillStyle = this.config.accentColor;
      ctx.beginPath();
      ctx.arc(0, -10, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.config.color;
      ctx.beginPath();
      ctx.arc(-2, -13, this.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.resourceType === 'GOLD') {
      // Rocky boulder
      ctx.fillStyle = '#616161';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Gold chunks
      ctx.fillStyle = this.config.color;
      ctx.fillRect(-10, -8, 8, 8);
      ctx.fillRect(2, -4, 9, 9);
      ctx.fillRect(-4, 4, 7, 6);

      // Gold sparkles
      ctx.fillStyle = '#fff9c4';
      ctx.fillRect(-7, -6, 2, 2);
      ctx.fillRect(5, -2, 3, 3);
    } else if (this.resourceType === 'FOOD') {
      // Bush foliage
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Berries
      ctx.fillStyle = '#ab47bc';
      const berryPositions = [[-6, -5], [5, -4], [-3, 4], [6, 5], [0, -8]];
      for (const [bx, by] of berryPositions) {
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Resource depleted percentage bar if selected or partially harvested
    if (this.isSelected || this.amount < this.maxAmount) {
      const barW = 28;
      const barH = 3;
      const pct = Math.max(0, this.amount / this.maxAmount);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW, barH);

      ctx.fillStyle = this.config.color;
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW * pct, barH);
    }
  }
}
