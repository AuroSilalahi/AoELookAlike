export const TILE_TYPES = {
  GRASS: 0,
  DIRT: 1,
  WATER: 2,
  COBBLE: 3,
  BRIDGE: 4,
  SAND: 5,
  CLIFF: 6
};

export class TileMap {
  constructor(cols = 80, rows = 80, tileSize = 48, mapType = 'RIVER_VALLEY') {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.width = cols * tileSize;
    this.height = rows * tileSize;
    this.mapType = mapType;

    this.grid = new Uint8Array(cols * rows);
    this.waterTime = 0;

    this.generateMap(mapType);
  }

  generateMap(mapType = 'RIVER_VALLEY') {
    this.mapType = mapType;
    this.grid.fill(TILE_TYPES.GRASS);

    if (mapType === 'MOUNTAIN_PASS') {
      this.generateMountainPass();
    } else if (mapType === 'DESERT_OASIS') {
      this.generateDesertOasis();
    } else {
      this.generateRiverValley();
    }
  }

  generateRiverValley() {
    // 1. Natural dirt pathways
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const noise = Math.sin(c * 0.18) + Math.cos(r * 0.18);
        if (noise > 1.35) {
          this.setTile(c, r, TILE_TYPES.DIRT);
        }
      }
    }

    // 2. Base cobblestones for player (bottom-left) and enemies (top-right, top-left, bottom-right)
    this.buildCobbleBase(10, 10, 8); // Quadrant 1 (Top-Left)
    this.buildCobbleBase(65, 10, 8); // Quadrant 2 (Top-Right)
    this.buildCobbleBase(10, 65, 8); // Player Base (Bottom-Left)
    this.buildCobbleBase(65, 65, 8); // Quadrant 4 (Bottom-Right)

    // 3. Central Dividing River with winding curves
    for (let c = 0; c < this.cols; c++) {
      const riverR = Math.floor(this.rows * 0.5 + Math.sin(c * 0.12) * 6);
      for (let offset = -2; offset <= 2; offset++) {
        const r = riverR + offset;
        if (r >= 0 && r < this.rows) {
          this.setTile(c, r, TILE_TYPES.WATER);
        }
      }
    }

    // 4. WIDE 4-TILE STONE BRIDGES & SHALLOWS (Never bottleneck!)
    // Western Bridge (c: 18 to 22)
    this.buildBridge(18, Math.floor(this.rows * 0.5 - 4), 5, 9);
    // Central Grand Bridge (c: 38 to 43)
    this.buildBridge(38, Math.floor(this.rows * 0.5 - 4), 6, 9);
    // Eastern Bridge (c: 58 to 63)
    this.buildBridge(58, Math.floor(this.rows * 0.5 - 4), 5, 9);
  }

  generateMountainPass() {
    // Mountainous ground (Dirt & Cobblestone)
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = Math.random() > 0.4 ? TILE_TYPES.DIRT : TILE_TYPES.COBBLE;
    }

    this.buildCobbleBase(12, 12, 8);
    this.buildCobbleBase(64, 12, 8);
    this.buildCobbleBase(12, 64, 8);
    this.buildCobbleBase(64, 64, 8);

    // High Mountain Cliff Ridges dividing sectors
    for (let r = 0; r < this.rows; r++) {
      // Central vertical cliff ridge with 3 wide passes
      if ((r < 18 || r > 26) && (r < 36 || r > 44) && (r < 54 || r > 62)) {
        for (let c = 38; c <= 42; c++) {
          this.setTile(c, r, TILE_TYPES.CLIFF);
        }
      } else {
        // Wide Paved Stone Pass
        for (let c = 36; c <= 44; c++) {
          this.setTile(c, r, TILE_TYPES.BRIDGE);
        }
      }
    }

    // Horizontal Chasm with Bridges
    for (let c = 0; c < this.cols; c++) {
      const chasmR = 40;
      if (c >= 18 && c <= 23) {
        this.buildBridge(c, chasmR - 3, 1, 7);
      } else if (c >= 56 && c <= 61) {
        this.buildBridge(c, chasmR - 3, 1, 7);
      } else {
        for (let offset = -2; offset <= 2; offset++) {
          this.setTile(c, chasmR + offset, TILE_TYPES.WATER); // Deep mountain ravine
        }
      }
    }
  }

  generateDesertOasis() {
    this.grid.fill(TILE_TYPES.SAND);

    // Fertile green oases around bases
    this.buildGreenOasis(14, 14, 12);
    this.buildGreenOasis(64, 14, 12);
    this.buildGreenOasis(14, 64, 12);
    this.buildGreenOasis(64, 64, 12);

    // Central Grand Oasis Lake with lush shores
    this.buildGreenOasis(40, 40, 16);
    for (let c = 34; c <= 46; c++) {
      for (let r = 34; r <= 46; r++) {
        if (Math.hypot(c - 40, r - 40) < 8) {
          this.setTile(c, r, TILE_TYPES.WATER);
        }
      }
    }

    // Wide Stone causeways through the central oasis
    this.buildBridge(38, 32, 5, 17);
    this.buildBridge(32, 38, 17, 5);
  }

  buildCobbleBase(centerCol, centerRow, radius) {
    for (let c = centerCol - radius; c <= centerCol + radius; c++) {
      for (let r = centerRow - radius; r <= centerRow + radius; r++) {
        if (Math.hypot(c - centerCol, r - centerRow) <= radius) {
          this.setTile(c, r, Math.random() > 0.35 ? TILE_TYPES.COBBLE : TILE_TYPES.DIRT);
        }
      }
    }
  }

  buildGreenOasis(centerCol, centerRow, radius) {
    for (let c = centerCol - radius; c <= centerCol + radius; c++) {
      for (let r = centerRow - radius; r <= centerRow + radius; r++) {
        if (Math.hypot(c - centerCol, r - centerRow) <= radius) {
          this.setTile(c, r, TILE_TYPES.GRASS);
        }
      }
    }
  }

  buildBridge(startCol, startRow, widthCols, lengthRows) {
    for (let c = startCol; c < startCol + widthCols; c++) {
      for (let r = startRow; r < startRow + lengthRows; r++) {
        this.setTile(c, r, TILE_TYPES.BRIDGE);
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
    if (tile === TILE_TYPES.WATER) return false; // Impassable deep water
    if (tile === TILE_TYPES.CLIFF) return false; // Impassable mountain wall
    return true; // GRASS, DIRT, COBBLE, BRIDGE, SAND are all 100% walkable!
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
          case TILE_TYPES.SAND: {
            ctx.fillStyle = (c + r) % 2 === 0 ? '#d4a373' : '#dfb080';
            ctx.fillRect(x, y, this.tileSize, this.tileSize);
            ctx.fillStyle = '#c59260';
            ctx.fillRect(x + 10, y + 20, 8, 2);
            ctx.fillRect(x + 26, y + 32, 10, 2);
            break;
          }
          case TILE_TYPES.CLIFF: {
            // Rugged stone mountain wall
            ctx.fillStyle = (c + r) % 2 === 0 ? '#27272a' : '#323238';
            ctx.fillRect(x, y, this.tileSize, this.tileSize);
            ctx.fillStyle = '#18181b';
            ctx.fillRect(x + 4, y + 4, this.tileSize - 8, this.tileSize - 8);
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, this.tileSize, this.tileSize);
            break;
          }
          case TILE_TYPES.BRIDGE: {
            // Paved wide stone bridge with timber planks
            ctx.fillStyle = '#71717a';
            ctx.fillRect(x, y, this.tileSize, this.tileSize);

            // Wood planks texture
            ctx.strokeStyle = '#52525b';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);

            ctx.beginPath();
            ctx.moveTo(x, y + this.tileSize / 2);
            ctx.lineTo(x + this.tileSize, y + this.tileSize / 2);
            ctx.stroke();

            // Stone side border
            ctx.fillStyle = '#3f3f46';
            ctx.fillRect(x, y, 4, this.tileSize);
            ctx.fillRect(x + this.tileSize - 4, y, 4, this.tileSize);
            break;
          }
          case TILE_TYPES.WATER: {
            const wave = Math.sin(this.waterTime * 2 + (c + r) * 0.8) * 4;
            ctx.fillStyle = '#1e4875';
            ctx.fillRect(x, y, this.tileSize, this.tileSize);
            ctx.fillStyle = 'rgba(100, 180, 240, 0.28)';
            ctx.fillRect(x + 6 + wave, y + 14, 24, 3);
            ctx.fillRect(x + 16 - wave, y + 30, 20, 3);
            break;
          }
        }

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, this.tileSize, this.tileSize);
      }
    }
  }
}
