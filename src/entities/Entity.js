let entityIdCounter = 1;

export class Entity {
  constructor(x, y, radius = 16, faction = 'PLAYER', maxHp = 100) {
    this.id = `ent_${entityIdCounter++}`;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.faction = faction; // 'PLAYER', 'ENEMY', 'GAIA'

    this.maxHp = maxHp;
    this.hp = maxHp;
    this.isSelected = false;
    this.isDead = false;

    // Selection ring rotation animation
    this.animAngle = 0;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.isDead = true;
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update(dt) {
    if (this.isSelected) {
      this.animAngle += dt * 1.5;
    }
  }

  renderSelectionRing(ctx) {
    if (!this.isSelected) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Outer pulsed selection ring
    const ringRadius = this.radius + 6;
    ctx.strokeStyle = this.faction === 'PLAYER' ? '#2ecc71' : '#e74c3c';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -this.animAngle * 15;

    ctx.beginPath();
    ctx.ellipse(0, 0, ringRadius, ringRadius * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  renderHealthBar(ctx, offsetY = 24) {
    // Only show health bar if damaged or selected
    if (!this.isSelected && this.hp === this.maxHp) return;

    const barWidth = 32;
    const barHeight = 4;
    const barX = this.x - barWidth / 2;
    const barY = this.y - offsetY;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    // Health Fill
    const pct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(barX, barY, barWidth * pct, barHeight);
  }

  render(ctx) {
    // Subclasses implement this
  }
}
