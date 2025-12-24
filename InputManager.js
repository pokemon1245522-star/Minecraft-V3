export class InputManager {
    constructor() {
        this.keys = {};
        this.isPointerLocked = false;
        
        // Action States (Polled by Player/Game)
        this.actions = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false,
            sneak: false,
            attack: false, // Left Click
            place: false,  // Right Click
            inventory: false // E key
        };

        // Scroll Delta for Hotbar
        this.scrollDelta = 0;

        // Mouse Delta for Camera rotation
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;

        this._initListeners();
    }

    _initListeners() {
        // Keyboard
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));

        // Mouse Buttons
        document.addEventListener('mousedown', (e) => this._onMouseDown(e));
        document.addEventListener('mouseup', (e) => this._onMouseUp(e));

        // Mouse Movement (Camera)
        document.addEventListener('mousemove', (e) => this._onMouseMove(e));

        // Scroll (Hotbar)
        document.addEventListener('wheel', (e) => this._onScroll(e));

        // Pointer Lock State
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === document.body;
            if (!this.isPointerLocked) {
                // If lock lost, stop actions to prevent "stuck" keys
                this._resetMovement();
            }
        });
    }

    _onKeyDown(e) {
        // Prevent default browser actions for game keys
        if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            // e.preventDefault(); // Optional: keeps page from scrolling
        }

        this.keys[e.code] = true;
        this._updateMoveStates();

        // Toggle Inventory
        if (e.code === 'KeyE') {
            if (this.isPointerLocked) {
                document.exitPointerLock();
                this.actions.inventory = true;
            } else if (document.getElementById('inventory-screen').classList.contains('hidden') === false) {
                // Close inventory if open
                this.actions.inventory = true;
            }
        }
    }

    _onKeyUp(e) {
        this.keys[e.code] = false;
        this._updateMoveStates();
    }

    _updateMoveStates() {
        this.actions.forward = this.keys['KeyW'] || this.keys['ArrowUp'];
        this.actions.backward = this.keys['KeyS'] || this.keys['ArrowDown'];
        this.actions.left = this.keys['KeyA'] || this.keys['ArrowLeft'];
        this.actions.right = this.keys['KeyD'] || this.keys['ArrowRight'];
        this.actions.jump = this.keys['Space'];
        this.actions.sprint = this.keys['ControlLeft']; // Minecraft Style
        this.actions.sneak = this.keys['ShiftLeft'];    // Minecraft Style
    }

    _onMouseDown(e) {
        // 0 = Left, 2 = Right
        if (!this.isPointerLocked) {
            // Only lock if clicking on game canvas (not UI)
            if (e.target.tagName === 'CANVAS' || e.target === document.body) {
                document.body.requestPointerLock();
            }
            return;
        }

        if (e.button === 0) this.actions.attack = true;
        if (e.button === 2) this.actions.place = true;
    }

    _onMouseUp(e) {
        if (e.button === 0) this.actions.attack = false;
        if (e.button === 2) this.actions.place = false;
    }

    _onMouseMove(e) {
        if (this.isPointerLocked) {
            this.mouseDeltaX += e.movementX;
            this.mouseDeltaY += e.movementY;
        }
    }

    _onScroll(e) {
        if (this.isPointerLocked) {
            this.scrollDelta = Math.sign(e.deltaY);
        }
    }

    _resetMovement() {
        this.actions.forward = false;
        this.actions.backward = false;
        this.actions.left = false;
        this.actions.right = false;
        this.actions.jump = false;
        this.actions.attack = false;
        this.actions.place = false;
    }

    // Called every frame by Game loop to clear single-frame inputs
    resetFrame() {
        this.scrollDelta = 0;
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.actions.inventory = false; 
        // Note: Attack/Place are continuous (hold down), so we don't reset them here
        // We handle "click once" logic in the Player class if needed
    }
}