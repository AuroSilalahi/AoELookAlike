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

    this.generateMap(mapType, cols, rows);
  }

  generateMap(mapType = 'RIVER_VALLEY', cols = 80, rows = 80, basePoints = []) {
    this.cols = cols;
    this.rows = rows;
    this.width = cols * this.tileSize;
    this.height = rows * this.tileSize;
    this.grid = new Uint8Array(cols * rows);
    this.mapType = mapType;
    this.basePoints = basePoints;

    if (mapType === 'MOUNTAIN_PASS') {
      this.generateMountainPass(basePoints);
    } else if (mapType === 'DESERT_OASIS') {
      this.generateDesertOasis(basePoints);
    } else {
      this.generateRiverValley(basePoints);
    }

    // Always pave clear cobblestone grounds under every active kingdom base
    for (const b of basePoints) {
      this.buildCobbleBase(b.col, b.row, 7);
    }
  }

  generateRiverValley(basePoints = []) {
    this.grid.fill(TILE_TYPES.GRASS);

    // 1. Procedural dirt pathways and terrain texture
    const dirtPhaseX = Math.random() * 10;
    const dirtPhaseY = Math.random() * 10;
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const noise = Math.sin((c + dirtPhaseX) * 0.16) + Math.cos((r + dirtPhaseY) * 0.16);
        if (noise > 1.32) {
          this.setTile(c, r, TILE_TYPES.DIRT);
        }
      }
    }

    // 2. Procedural River with randomized curves and flow
    const isHorizontal = Math.random() > 0.35;
    const riverFreq = 0.08 + Math.random() * 0.08;
    const riverPhase = Math.random() * Math.PI * 2;
    const riverAmp = 4 + Math.random() * 4;

    if (isHorizontal) {
      // River flows across columns (West to East)
      const riverCenterR = Math.floor(this.rows * 0.5);
      for (let c = 0; c < this.cols; c++) {
        const riverR = Math.floor(riverCenterR + Math.sin(c * riverFreq + riverPhase) * riverAmp);
        for (let offset = -2; offset <= 2; offset++) {
          const r = riverR + offset;
          if (r >= 0 && r < this.rows) {
            // Avoid drowning any kingdom base
            const tooClose = basePoints.some(b => Math.hypot(c - b.col, r - b.row) < 9);
            if (!tooClose) {
              this.setTile(c, r, TILE_TYPES.WATER);
            }
          }
        }
      }

      // Build 3 to 4 WIDE 5-TILE STONE BRIDGES across the river
      const bridgeCols = [
        Math.floor(this.cols * 0.22),
        Math.floor(this.cols * 0.50),
        Math.floor(this.cols * 0.78)
      ];
      if (this.cols >= 75) {
        bridgeCols.push(Math.floor(this.cols * 0.36));
      }

      for (const bc of bridgeCols) {
        const rMid = Math.floor(riverCenterR + Math.sin(bc * riverFreq + riverPhase) * riverAmp);
        this.buildBridge(bc - 2, rMid - 5, 5, 11);
      }
    } else {
      // River flows vertically (North to South)
      const riverCenterC = Math.floor(this.cols * 0.5);
      for (let r = 0; r < this.rows; r++) {
        const riverC = Math.floor(riverCenterC + Math.sin(r * riverFreq + riverPhase) * riverAmp);
        for (let offset = -2; offset <= 2; offset++) {
          const c = riverC + offset;
          if (c >= 0 && c < this.cols) {
            const tooClose = basePoints.some(b => Math.hypot(c - b.col, r - b.row) < 9);
            if (!tooClose) {
              this.setTile(c, r, TILE_TYPES.WATER);
            }
          }
        }
      }

      // Build WIDE 5-TILE STONE BRIDGES horizontally across vertical river
      const bridgeRows = [
        Math.floor(this.rows * 0.22),
        Math.floor(this.rows * 0.50),
        Math.floor(this.rows * 0.78)
      ];
      if (this.rows >= 75) {
        bridgeRows.push(Math.floor(this.rows * 0.36));
      }

      for (const br of bridgeRows) {
        const cMid = Math.floor(riverCenterC + Math.sin(br * riverFreq + riverPhase) * riverAmp);
        this.buildBridge(cMid - 5, br - 2, 11, 5);
      }
    }
  }

  generateMountainPass(basePoints = []) {
    // Rocky ground with varied cobblestone and dirt
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = Math.random() > 0.4 ? TILE_TYPES.DIRT : TILE_TYPES.COBBLE;
    }

    // High Mountain Cliff Ridge dividing the realm with procedural passes
    const spineCol = Math.floor(this.cols * 0.5 + (Math.random() - 0.5) * 6);
    const passInterval = Math.floor(this.rows / 4);

    for (let r = 0; r < this.rows; r++) {
      // Determine if this row is a wide pass
      const isPass = (r % passInterval > 2 && r % passInterval < 8) || (r < 6) || (r > this.rows - 7);
      if (!isPass) {
        for (let c = spineCol - 2; c <= spineCol + 2; c++) {
          const tooClose = basePoints.some(b => Math.hypot(c - b.col, r - b.row) < 8);
          if (!tooClose) {
            this.setTile(c, r, TILE_TYPES.CLIFF);
          }
        }
      } else {
        // Paved wide stone pass
        for (let c = spineCol - 4; c <= spineCol + 4; c++) {
          this.setTile(c, r, TILE_TYPES.BRIDGE);
        }
      }
    }

    // Horizontal mountain ravine with wide stone bridges
    const ravineRow = Math.floor(this.rows * 0.5 + (Math.random() - 0.5) * 6);
    const bridgeSpans = [
      Math.floor(this.cols * 0.24),
      Math.floor(this.cols * 0.76)
    ];

    for (let c = 0; c < this.cols; c++) {
      const nearBridge = bridgeSpans.some(bc => Math.abs(c - bc) <= 3);
      if (nearBridge) {
        this.buildBridge(c, ravineRow - 3, 1, 7);
      } else {
        for (let offset = -2; offset <= 2; offset++) {
          const r = ravineRow + offset;
          const tooClose = basePoints.some(b => Math.hypot(c - b.col, r - b.row) < 8);
          if (!tooClose) {
            this.setTile(c, r, TILE_TYPES.WATER);
          }
        }
      }
    }
  }

  generateDesertOasis(basePoints = []) {
    this.grid.fill(TILE_TYPES.SAND);

    // Number of oases depends on realm size (2 to 4)
    const oasisCount = this.cols >= 75 ? 4 : (this.cols >= 60 ? 3 : 2);
    const oases = [];

    // Procedurally scatter oases avoiding bases and edges
    for (let i = 0; i < oasisCount; i++) {
      const angle = (i / oasisCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = this.cols * (0.22 + Math.random() * 0.18);
      const oc = Math.floor(this.cols * 0.5 + Math.cos(angle) * dist);
      const or = Math.floor(this.rows * 0.5 + Math.sin(angle) * dist);
      oases.push({ c: oc, r: or, radius: 7 + Math.floor(Math.random() * 4) });
    }

    // Build lush oases with lakes and causeways
    for (const oasis of oases) {
      this.buildGreenOasis(oasis.c, oasis.r, oasis.radius);
      const lakeR = Math.max(3, Math.floor(oasis.radius * 0.55));
      for (let c = oasis.c - lakeR; c <= oasis.c + lakeR; c++) {
        for (let r = oasis.r - lakeR; r <= oasis.r + lakeR; r++) {
          if (Math.hypot(c - oasis.c, r - oasis.r) <= lakeR) {
            this.setTile(c, r, TILE_TYPES.WATER);
          }
        }
      }
      // Wide stone causeway crossing the oasis lake
      this.buildBridge(oasis.c - 2, oasis.r - lakeR - 2, 5, lakeR * 2 + 5);
      this.buildBridge(oasis.c - lakeR - 2, oasis.r - 2, lakeR * 2 + 5, 5);
    }
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
