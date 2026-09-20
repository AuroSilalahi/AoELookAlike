export const FOG_STATE = {
  UNEXPLORED: 0,
  EXPLORED: 1,
  VISIBLE: 2
};

export class FogOfWar {
  constructor(cols, rows, tileSize) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.width = cols * tileSize;
    this.height = rows * tileSize;

    // Grid of states
    this.tiles = new Uint8Array(cols * rows); // Defaults to 0 (UNEXPLORED)

    // Offscreen Canvas for smooth Fog rendering
    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = cols;
    this.fogCanvas.height = rows;
    this.fogCtx = this.fogCanvas.getContext('2d');
    this.fogImageData = this.fogCtx.createImageData(cols, rows);

    this.enabled = true;
  }

  update(friendlyUnits, friendlyBuildings) {
    if (!this.enabled) return;

    // 1. Demote all currently VISIBLE tiles to EXPLORED
    for (let i = 0; i < this.tiles.length; i++) {
      if (this.tiles[i] === FOG_STATE.VISIBLE) {
        this.tiles[i] = FOG_STATE.EXPLORED;
      }
    }

    // 2. Reveal tiles around friendly units
    for (const unit of friendlyUnits) {
      if (unit.isDead || unit.isDying) continue;
      const sight = unit.sightRadius || 190;
      this.revealCircle(unit.x, unit.y, sight);
    }

    // 3. Reveal tiles around friendly buildings
    for (const b of friendlyBuildings) {
      if (b.isDead) continue;
      const sight = b.sightRadius || (b.buildingType === 'WATCH_TOWER' ? 260 : b.buildingType === 'TOWN_CENTER' ? 320 : 180);
      this.revealCircle(b.x, b.y, sight);
    }

    // 4. Update offscreen fog canvas texture
    this.updateFogTexture();
  }

  revealCircle(worldX, worldY, radius) {
    const centerCol = Math.floor(worldX / this.tileSize);
    const centerRow = Math.floor(worldY / this.tileSize);
    const tileRadius = Math.ceil(radius / this.tileSize);

    const minC = Math.max(0, centerCol - tileRadius);
    const maxC = Math.min(this.cols - 1, centerCol + tileRadius);
    const minR = Math.max(0, centerRow - tileRadius);
    const maxR = Math.min(this.rows - 1, centerRow + tileRadius);

    const rSq = radius * radius;

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const tx = (c + 0.5) * this.tileSize;
        const ty = (r + 0.5) * this.tileSize;
        const distSq = (tx - worldX) * (tx - worldX) + (ty - worldY) * (ty - worldY);

        if (distSq <= rSq) {
          this.tiles[r * this.cols + c] = FOG_STATE.VISIBLE;
        }
      }
    }
  }

  updateFogTexture() {
    const data = this.fogImageData.data;
    const len = this.cols * this.rows;

    for (let i = 0; i < len; i++) {
      const state = this.tiles[i];
      const offset = i * 4;

      // Dark atmospheric shroud
      data[offset] = 12;     // R
      data[offset + 1] = 15; // G
      data[offset + 2] = 20; // B

      if (state === FOG_STATE.VISIBLE) {
        data[offset + 3] = 0; // Clear
      } else if (state === FOG_STATE.EXPLORED) {
        data[offset + 3] = 140; // Shrouded dim fog
      } else {
        data[offset + 3] = 255; // Unexplored pitch dark
      }
    }

    this.fogCtx.putImageData(this.fogImageData, 0, 0);
  }

  isVisible(worldX, worldY) {
    if (!this.enabled) return true;
    const c = Math.floor(worldX / this.tileSize);
    const r = Math.floor(worldY / this.tileSize);
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return false;
    return this.tiles[r * this.cols + c] === FOG_STATE.VISIBLE;
  }

  isExplored(worldX, worldY) {
    if (!this.enabled) return true;
    const c = Math.floor(worldX / this.tileSize);
    const r = Math.floor(worldY / this.tileSize);
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return false;
    return this.tiles[r * this.cols + c] !== FOG_STATE.UNEXPLORED;
  }

  renderWorld(ctx) {
    if (!this.enabled) return;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.fogCanvas, 0, 0, this.width, this.height);
    ctx.restore();
  }

  renderMinimapFog(ctx, minimapWidth, minimapHeight) {
    if (!this.enabled) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.fogCanvas, 0, 0, minimapWidth, minimapHeight);
    ctx.restore();
  }
}
