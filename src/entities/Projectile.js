export class Projectile {
  constructor(startX, startY, target, damage = 10, faction = 'PLAYER') {
    this.startX = startX;
    this.startY = startY;
    this.x = startX;
    this.y = startY;

    this.target = target;
    this.targetX = target.x;
    this.targetY = target.y;

    this.damage = damage;
    this.faction = faction;

    this.speed = 340; // pixels per second
    this.totalDistance = Math.hypot(this.targetX - startX, this.targetY - startY);
    this.totalTime = Math.max(0.2, this.totalDistance / this.speed);
    this.elapsed = 0;

    this.isDead = false;
    this.maxArc = Math.min(60, this.totalDistance * 0.25); // Parabolic height
    this.angle = Math.atan2(this.targetY - startY, this.targetX - startX);
  }

  update(dt, game) {
    if (this.isDead) return;

    // Track moving target
    if (this.target && !this.target.isDead) {
      this.targetX = this.target.x;
      this.targetY = this.target.y;
    }

    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.totalTime);

    // Linear X/Y position
    const curX = this.startX + (this.targetX - this.startX) * t;
    const curY = this.startY + (this.targetY - this.startY) * t;

    // Parabolic Arc offset
    const arcOffset = 4 * this.maxArc * t * (1 - t);

    // Compute velocity angle along trajectory
    const nextT = Math.min(1, t + 0.05);
    const nextX = this.startX + (this.targetX - this.startX) * nextT;
    const nextY = this.startY + (this.targetY - this.startY) * nextT - 4 * this.maxArc * nextT * (1 - nextT);
    this.angle = Math.atan2(nextY - (curY - arcOffset), nextX - curX);

    this.x = curX;
    this.y = curY - arcOffset;

    // Reached destination
    if (t >= 1) {
      this.isDead = true;

      // Check if target entity is still valid
      if (this.target && !this.target.isDead) {
        this.target.takeDamage(this.damage);

        if (game) {
          // Floating damage text in bold red
          game.hud.addFloatingText(this.target.x, this.target.y - 18, `-${this.damage}`, '#ef4444');
          game.hud.addSparkle(this.target.x, this.target.y, '#dc2626');
          if (game.sound) game.sound.playArrowHit();

          if (this.target.isDead && this.faction === 'PLAYER') {
            game.hud.addFloatingText(this.target.x, this.target.y - 30, 'Defeated! 💀', '#cbd5e1');
          }
        }
      }
    }
  }

  render(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Arrow Shaft (Dark Wood)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-10, -1, 16, 2);

    // Iron Arrowhead
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(4, -3);
    ctx.lineTo(4, 3);
    ctx.closePath();
    ctx.fill();

    // Feather Fletching (White)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-10, -3, 4, 1.5);
    ctx.fillRect(-10, 1.5, 4, 1.5);

    ctx.restore();
  }
}
