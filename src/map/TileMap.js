export const TILE_TYPES = {
  GRASS: 0,
  DIRT: 1,
  WATER: 2,
  COBBLE: 3
};

export class TileMap {
  constructor(cols = 50, rows = 50, tileSize = 48) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.width = cols * tileSize;
    this.height = rows * tileSize;

    this.grid = [];
    this.waterTime = 0;

    this.generateMap();
  }

  generateMap() {
    this.grid = new Array(this.cols * this.rows).fill(TILE_TYPES.GRASS);

    // 1. Dirt pathways and patches
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const idx = r * this.cols + c;
        const noise = Math.sin(c * 0.25) + Math.cos(r * 0.25);
        if (noise > 1.3) {
          this.grid[idx] = TILE_TYPES.DIRT;
        }
      }
    }

    // 2. Cobblestone base area around starting Town Center
    for (let c = 8; c <= 15; c++) {
      for (let r = 8; r <= 14; r++) {
        if (Math.random() > 0.4) {
          this.setTile(c, r, TILE_TYPES.COBBLE);
        }
      }
    }

    // 3. Natural River dividing the map
    for (let c = 0; c < this.cols; c++) {
      const riverR = Math.floor(this.rows * 0.5 + Math.sin(c * 0.15) * 4);
      for (let offset = -1; offset <= 1; offset++) {
        const r = riverR + offset;
        // Natural Crossings / Shallows
        if ((c >= 18 && c <= 23) || (c >= 35 && c <= 39)) {
          this.setTile(c, r, TILE_TYPES.DIRT); // Walkable Shallows
        } else if (r >= 0 && r < this.rows) {
          this.setTile(c, r, TILE_TYPES.WATER);
        }
      }
    }
  }

  getTile(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return this.grid[row * this.cols + col];
  }

  setTile(col, row, type) {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.grid[row * this.cols + col] = type;
    }
  }

  worldToTile(worldX, worldY) {
    return {
      col: Math.max(0, Math.min(this.cols - 1, Math.floor(worldX / this.tileSize))),
      row: Math.max(0, Math.min(this.rows - 1, Math.floor(worldY / this.tileSize)))
    };
  }

  tileToWorld(col, row) {
    return {
      x: (col + 0.5) * this.tileSize,
      y: (row + 0.5) * this.tileSize
    };
  }

  isWalkable(worldX, worldY) {
    const { col, row } = this.worldToTile(worldX, worldY);
    const tile = this.getTile(col, row);
    if (tile === null) return false;
    if (tile === TILE_TYPES.WATER) return false; // Water is impassable
    return true;
  }

  update(dt) {
    this.waterTime += dt;
  }

  render(ctx, camera) {
    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(camera.canvas.width, camera.canvas.height);

    const startCol = Math.max(0, Math.floor(topLeft.x / this.tileSize) - 1);
    const endCol = Math.min(this.cols - 1, Math.ceil(bottomRight.x / this.tileSize) + 1);
    const startRow = Math.max(0, Math.floor(topLeft.y / this.tileSize) - 1);
    const endRow = Math.min(this.rows - 1, Math.ceil(bottomRight.y / this.tileSize) + 1);

    for (let c = startCol; c <= endCol; c++) {
      for (let r = startRow; r <= endRow; r++) {
        const x = c * this.tileSize;
        const y = r * this.tileSize;
        const type = this.getTile(c, r);

        switch (type) {
          case TILE_TYPES.GRASS: {
            ctx.fillStyle = (c + r) % 2 === 0 ? '#345c27' : '#3a662c';
            ctx.fillRect(x, y, this.tileSize, this.tileSize);

            ctx.fillStyle = '#487c38';
            ctx.fillRect(x + 12, y + 14, 2, 4);
            ctx.fillRect(x + 30, y + 26, 2, 4);
            break;
          }
          case TILE_TYPES.DIRT: {
            ctx.fillStyle = (c + r) % 2 === 0 ? '#6d5a3f' : '#756245';
            ctx.fillRect(x, y, this.tileSize, this.tileSize);
            ctx.fillStyle = '#55442f';
            ctx.fillRect(x + 14, y + 18, 3, 2);
            ctx.fillRect(x + 28, y + 34, 4, 3);
            break;
          }
          case TILE_TYPES.COBBLE: {
            ctx.fillStyle = (c + r) % 2 === 0 ? '#52525b' : '#5b5b66';
            ctx.fillRect(x, y, this.tileSize, this.tileSize);
            ctx.strokeStyle = '#3f3f46';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 4, y + 4, this.tileSize - 8, this.tileSize - 8);
            break;
          }
          case TILE_TYPES.WATER: {
            const wave = Math.sin(this.waterTime * 2 + (c + r) * 0.8) * 5;
            ctx.fillStyle = '#1e4875';
            ctx.fillRect(x, y, this.tileSize, this.tileSize);
            ctx.fillStyle = 'rgba(100, 180, 240, 0.25)';
            ctx.fillRect(x + 6 + wave, y + 16, 24, 3);
            ctx.fillRect(x + 18 - wave, y + 32, 20, 3);
            break;
          }
        }

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, this.tileSize, this.tileSize);
      }
    }
  }
}
