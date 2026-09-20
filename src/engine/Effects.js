export class Effects {
  constructor() {
    this.particles = [];
    this.screenShake = {
      duration: 0,
      magnitude: 0,
      offsetX: 0,
      offsetY: 0
    };
  }

  triggerShake(magnitude = 6, duration = 0.3) {
    this.screenShake.magnitude = Math.max(this.screenShake.magnitude, magnitude);
    this.screenShake.duration = Math.max(this.screenShake.duration, duration);
  }

  addDust(x, y) {
    this.particles.push({
      type: 'dust',
      x: x + (Math.random() - 0.5) * 6,
      y: y + 2,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 8,
      size: 2.5 + Math.random() * 2,
      alpha: 0.5,
      decay: 1.8,
      color: '#a89f91'
    });
  }

  addWaterRipple(x, y) {
    this.particles.push({
      type: 'ripple',
      x: x,
      y: y,
      radius: 3,
      maxRadius: 16 + Math.random() * 8,
      alpha: 0.7,
      decay: 1.2,
      color: '#93c5fd'
    });
  }

  addWoodChips(x, y) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        type: 'chip',
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 45,
        vy: -20 - Math.random() * 35,
        gravity: 120,
        size: 2 + Math.random() * 2.5,
        alpha: 1.0,
        decay: 2.0,
        color: Math.random() > 0.5 ? '#d97706' : '#b45309'
      });
    }
  }

  addCombatSparks(x, y, color = '#ef4444') {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 50;
      this.particles.push({
        type: 'spark',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        alpha: 1.0,
        decay: 3.5,
        color: color
      });
    }
  }

  addFirework(x, y) {
    const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
    const col = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 110;
      this.particles.push({
        type: 'firework',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 30,
        size: 2.5 + Math.random() * 2.5,
        alpha: 1.0,
        decay: 1.0 + Math.random() * 0.8,
        color: col
      });
    }
  }

  update(dt) {
    // 1. Update Screen Shake
    if (this.screenShake.duration > 0) {
      this.screenShake.duration -= dt;
      const factor = this.screenShake.duration > 0 ? this.screenShake.magnitude : 0;
      this.screenShake.offsetX = (Math.random() - 0.5) * 2 * factor;
      this.screenShake.offsetY = (Math.random() - 0.5) * 2 * factor;
      if (this.screenShake.duration <= 0) {
        this.screenShake.magnitude = 0;
        this.screenShake.offsetX = 0;
        this.screenShake.offsetY = 0;
      }
    }

    // 2. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.type === 'ripple') {
        p.radius += (p.maxRadius - p.radius) * 6 * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.gravity) {
          p.vy += p.gravity * dt;
        }
      }
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'ripple') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
