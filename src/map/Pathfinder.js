export class Pathfinder {
  constructor(map) {
    this.map = map;
  }

  findPath(startX, startY, endX, endY, obstacles = [], allowAdjacent = true) {
    const startTile = this.map.worldToTile(startX, startY);
    let targetTile = this.map.worldToTile(endX, endY);

    // If target tile is blocked (e.g. clicked directly on a Tree or Building),
    // find the closest walkable adjacent tile
    if (!this.isTileWalkable(targetTile.col, targetTile.row, obstacles)) {
      if (!allowAdjacent) return null;
      const neighbor = this.findNearestWalkableNeighbor(targetTile.col, targetTile.row, startTile, obstacles);
      if (!neighbor) return null;
      targetTile = neighbor;
    }

    // A* Pathfinding implementation
    const openSet = [];
    const closedSet = new Set();

    const startNode = {
      col: startTile.col,
      row: startTile.row,
      g: 0,
      h: this.heuristic(startTile, targetTile),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    const nodeMap = new Map();
    nodeMap.set(`${startTile.col},${startTile.row}`, startNode);

    let iterations = 0;
    const maxIterations = 1000; // performance guard

    while (openSet.length > 0 && iterations++ < maxIterations) {
      // Get node with lowest f
      let lowestIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIdx].f) {
          lowestIdx = i;
        }
      }

      const current = openSet.splice(lowestIdx, 1)[0];
      const currentKey = `${current.col},${current.row}`;

      // Goal reached
      if (current.col === targetTile.col && current.row === targetTile.row) {
        return this.reconstructPath(current);
      }

      closedSet.add(currentKey);

      // Check 8 neighbors (orthogonals and diagonals)
      const neighbors = [
        { col: current.col, row: current.row - 1, cost: 1 },
        { col: current.col, row: current.row + 1, cost: 1 },
        { col: current.col - 1, row: current.row, cost: 1 },
        { col: current.col + 1, row: current.row, cost: 1 },
        { col: current.col - 1, row: current.row - 1, cost: 1.414 },
        { col: current.col + 1, row: current.row - 1, cost: 1.414 },
        { col: current.col - 1, row: current.row + 1, cost: 1.414 },
        { col: current.col + 1, row: current.row + 1, cost: 1.414 }
      ];

      for (const nb of neighbors) {
        const key = `${nb.col},${nb.row}`;
        if (closedSet.has(key)) continue;

        if (!this.isTileWalkable(nb.col, nb.row, obstacles)) {
          continue;
        }

        const tentativeG = current.g + nb.cost;
        let neighborNode = nodeMap.get(key);

        if (!neighborNode) {
          neighborNode = {
            col: nb.col,
            row: nb.row,
            g: tentativeG,
            h: this.heuristic(nb, targetTile),
            f: 0,
            parent: current
          };
          neighborNode.f = neighborNode.g + neighborNode.h;
          nodeMap.set(key, neighborNode);
          openSet.push(neighborNode);
        } else if (tentativeG < neighborNode.g) {
          neighborNode.g = tentativeG;
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.parent = current;
        }
      }
    }

    // If direct path fails, return straight line fallback
    return [{ x: endX, y: endY }];
  }

  isTileWalkable(col, row, obstacles = []) {
    if (col < 0 || col >= this.map.cols || row < 0 || row >= this.map.rows) {
      return false;
    }

    const tile = this.map.getTile(col, row);
    // Water is impassable
    if (tile === 2) return false;

    // Check entity obstacles (e.g. Buildings)
    const tileWorld = this.map.tileToWorld(col, row);
    for (const obs of obstacles) {
      if (obs.isDead) continue;
      const dist = Math.hypot(obs.x - tileWorld.x, obs.y - tileWorld.y);
      if (dist < obs.radius + this.map.tileSize * 0.4) {
        return false;
      }
    }

    return true;
  }

  findNearestWalkableNeighbor(col, row, startTile, obstacles) {
    const offsets = [
      [0, -1], [0, 1], [-1, 0], [1, 0],
      [-1, -1], [1, -1], [-1, 1], [1, 1],
      [0, -2], [0, 2], [-2, 0], [2, 0]
    ];

    let best = null;
    let minDist = Infinity;

    for (const [dx, dy] of offsets) {
      const nc = col + dx;
      const nr = row + dy;
      if (this.isTileWalkable(nc, nr, obstacles)) {
        const d = Math.hypot(nc - startTile.col, nr - startTile.row);
        if (d < minDist) {
          minDist = d;
          best = { col: nc, row: nr };
        }
      }
    }
    return best;
  }

  heuristic(a, b) {
    return Math.hypot(a.col - b.col, a.row - b.row);
  }

  reconstructPath(endNode) {
    const path = [];
    let curr = endNode;
    while (curr !== null) {
      const worldPos = this.map.tileToWorld(curr.col, curr.row);
      path.unshift(worldPos);
      curr = curr.parent;
    }
    // Remove the very first node if it's the start position
    if (path.length > 1) {
      path.shift();
    }
    return path;
  }
}
