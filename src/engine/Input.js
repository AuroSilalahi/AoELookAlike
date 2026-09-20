export class Input {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;

    this.keys = new Set();
    this.mouse = {
      screenX: 0,
      screenY: 0,
      worldX: 0,
      worldY: 0,
      isLeftDown: false,
      isRightDown: false,
      isMiddleDown: false,
      dragStartX: 0,
      dragStartY: 0,
      dragStartWorldX: 0,
      dragStartWorldY: 0,
      isBoxSelecting: false
    };

    // Control Groups & Double-tap memory
    this.controlGroups = {};
    this.lastGroupPressTime = {};

    // Action Callbacks
    this.onBoxSelect = null;
    this.onSingleSelect = null;
    this.onRightClick = null;
    this.onControlGroup = null;
    this.onSelectTownCenter = null;
    this.onCycleIdleVillager = null;
    this.onJumpToAlert = null;
    this.onTogglePause = null;

    this.setupListeners();
  }

  setupListeners() {
    // Keyboard listeners
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      // Handle Hotkeys
      if (e.code === 'Escape') {
        if (this.onTogglePause) this.onTogglePause();
      } else if (e.code === 'KeyH' && !e.ctrlKey) {
        if (this.onSelectTownCenter) this.onSelectTownCenter();
      } else if (e.code === 'Period') {
        if (this.onCycleIdleVillager) this.onCycleIdleVillager();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (this.onJumpToAlert) this.onJumpToAlert();
      }

      // Control Groups 1 - 9
      if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.replace('Digit', ''), 10);
        if (digit >= 1 && digit <= 9) {
          const now = performance.now();
          const isDoubleTap = this.lastGroupPressTime[digit] && (now - this.lastGroupPressTime[digit] < 350);
          this.lastGroupPressTime[digit] = now;

          if (this.onControlGroup) {
            this.onControlGroup(digit, e.ctrlKey, isDoubleTap);
          }
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Suppress context menu on game canvas
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Mouse move
    this.canvas.addEventListener('mousemove', (e) => {
      this.mouse.screenX = e.clientX;
      this.mouse.screenY = e.clientY;
      const world = this.camera.screenToWorld(e.clientX, e.clientY);
      this.mouse.worldX = world.x;
      this.mouse.worldY = world.y;

      // Handle middle mouse button panning
      if (this.mouse.isMiddleDown) {
        const dx = (e.clientX - this.mouse.dragStartX) / this.camera.zoom;
        const dy = (e.clientY - this.mouse.dragStartY) / this.camera.zoom;
        this.camera.x -= dx;
        this.camera.y -= dy;
        this.camera.clamp();
        this.mouse.dragStartX = e.clientX;
        this.mouse.dragStartY = e.clientY;
      }

      // Check for box select threshold
      if (this.mouse.isLeftDown) {
        const dist = Math.hypot(e.clientX - this.mouse.dragStartX, e.clientY - this.mouse.dragStartY);
        if (dist > 6) {
          this.mouse.isBoxSelecting = true;
        }
      }
    });

    // Mouse down
    this.canvas.addEventListener('mousedown', (e) => {
      const world = this.camera.screenToWorld(e.clientX, e.clientY);

      if (e.button === 0) {
        // Left Click
        this.mouse.isLeftDown = true;
        this.mouse.isBoxSelecting = false;
        this.mouse.dragStartX = e.clientX;
        this.mouse.dragStartY = e.clientY;
        this.mouse.dragStartWorldX = world.x;
        this.mouse.dragStartWorldY = world.y;
      } else if (e.button === 1) {
        // Middle Click (Pan)
        this.mouse.isMiddleDown = true;
        this.mouse.dragStartX = e.clientX;
        this.mouse.dragStartY = e.clientY;
        e.preventDefault();
      } else if (e.button === 2) {
        // Right Click (Issue Order)
        this.mouse.isRightDown = true;
        if (this.onRightClick) {
          this.onRightClick(world.x, world.y, e.clientX, e.clientY);
        }
      }
    });

    // Mouse up
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0 && this.mouse.isLeftDown) {
        this.mouse.isLeftDown = false;
        const endWorld = this.camera.screenToWorld(e.clientX, e.clientY);

        if (this.mouse.isBoxSelecting) {
          this.mouse.isBoxSelecting = false;
          if (this.onBoxSelect) {
            const minX = Math.min(this.mouse.dragStartWorldX, endWorld.x);
            const maxX = Math.max(this.mouse.dragStartWorldX, endWorld.x);
            const minY = Math.min(this.mouse.dragStartWorldY, endWorld.y);
            const maxY = Math.max(this.mouse.dragStartWorldY, endWorld.y);
            this.onBoxSelect(minX, minY, maxX, maxY);
          }
        } else {
          // Single Click selection
          if (this.onSingleSelect) {
            this.onSingleSelect(endWorld.x, endWorld.y);
          }
        }
      } else if (e.button === 1) {
        this.mouse.isMiddleDown = false;
      } else if (e.button === 2) {
        this.mouse.isRightDown = false;
      }
    });

    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.zoomAt(e.clientX, e.clientY, e.deltaY);
    }, { passive: false });
  }

  isKeyDown(code) {
    return this.keys.has(code);
  }
}
