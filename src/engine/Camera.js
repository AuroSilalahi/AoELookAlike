export class Camera {
  constructor(canvas, mapWidth, mapHeight) {
    this.canvas = canvas;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    this.x = mapWidth / 2;
    this.y = mapHeight / 2;
    this.zoom = 1.0;
    this.minZoom = 0.35;
    this.maxZoom = 2.0;

    this.panSpeed = 500; // pixels per second
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.camStartX = 0;
    this.camStartY = 0;
  }

  screenToWorld(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const worldX = (canvasX - centerX) / this.zoom + this.x;
    const worldY = (canvasY - centerY) / this.zoom + this.y;

    return { x: worldX, y: worldY };
  }

  worldToScreen(worldX, worldY) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const screenX = (worldX - this.x) * this.zoom + centerX;
    const screenY = (worldY - this.y) * this.zoom + centerY;

    return { x: screenX, y: screenY };
  }

  zoomAt(screenX, screenY, zoomDelta) {
    const worldBefore = this.screenToWorld(screenX, screenY);
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * (1 - zoomDelta * 0.0015)));

    this.zoom = newZoom;
    const worldAfter = this.screenToWorld(screenX, screenY);

    // Adjust camera position so cursor remains anchored at the same world coordinates
    this.x += worldBefore.x - worldAfter.x;
    this.y += worldBefore.y - worldAfter.y;
    this.clamp();
  }

  update(dt, input) {
    let moveX = 0;
    let moveY = 0;

    // Keyboard Pan (WASD & Arrow Keys)
    if (input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp')) moveY -= 1;
    if (input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown')) moveY += 1;
    if (input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft')) moveX -= 1;
    if (input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight')) moveX += 1;

    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      const invLen = 1 / Math.sqrt(2);
      moveX *= invLen;
      moveY *= invLen;
    }

    if (moveX !== 0 || moveY !== 0) {
      const speed = (this.panSpeed / this.zoom) * dt;
      this.x += moveX * speed;
      this.y += moveY * speed;
      this.clamp();
    }
  }

  clamp() {
    const halfW = (this.canvas.width / 2) / this.zoom;
    const halfH = (this.canvas.height / 2) / this.zoom;

    this.x = Math.max(0, Math.min(this.mapWidth, this.x));
    this.y = Math.max(0, Math.min(this.mapHeight, this.y));
  }

  applyTransform(ctx) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  restoreTransform(ctx) {
    ctx.restore();
  }
}
