import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class Player {
    constructor(game) {
        this.game = game;
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.rotation.order = 'YXZ'; // Yaw (Y) then Pitch (X)

        // Physics
        this.position = new THREE.Vector3(0, 80, 0); // Start high to fall safely
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.onGround = false;
        
        // Dimensions (Minecraft Steve approx)
        this.height = 1.8;
        this.width = 0.6;
        
        // Speed
        this.speed = 5.0;
        this.sprintSpeed = 8.0;
        this.jumpForce = 10.0;
        this.gravity = 30.0;

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 5; // Reach distance
        this.selectedBlock = null; // Highlight
        this.placeCooldown = 0;

        // Inventory
        // Array of 36 slots (0-8 hotbar, 9-35 main)
        // Format: { id: 'dirt', count: 64, texture: ... } or null
        this.inventory = new Array(36).fill(null);
        this.selectedSlot = 0; // 0-8

        // Starter Kit
        this.inventory[0] = { id: 'diamond_pickaxe', count: 1 };
        this.inventory[1] = { id: 'stone', count: 64 };
        this.inventory[2] = { id: 'oak_log', count: 16 };
        this.inventory[3] = { id: 'torch', count: 16 }; // Logic fallback if torch missing

        // Init helper meshes
        this.setupCrosshairRay();
    }

    setupCrosshairRay() {
        // Outline for selected block
        const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
        const edges = new THREE.EdgesGeometry(geometry);
        this.selectionBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
        this.selectionBox.visible = false;
        this.game.scene.add(this.selectionBox);
    }

    // --- INPUT & UPDATE ---

    update(dt) {
        if (!this.game.inputManager.isPointerLocked) return;

        this.handleMovement(dt);
        this.handlePhysics(dt);
        this.handleInteraction(dt);
        this.updateCamera();
    }

    handleMovement(dt) {
        const input = this.game.inputManager;
        
        // Rotation (Mouse Look)
        // Sensitivity
        const sens = 0.002;
        this.camera.rotation.y -= input.mouseDeltaX * sens;
        this.camera.rotation.x -= input.mouseDeltaY * sens;
        
        // Clamp Pitch (Up/Down) to -90/90 degrees
        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));

        // Movement Input
        const speed = input.actions.sprint ? this.sprintSpeed : this.speed;
        
        // Get forward/right vectors relative to camera Y rotation
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera.rotation.y);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera.rotation.y);

        this.direction.set(0, 0, 0);

        if (input.actions.forward) this.direction.add(forward);
        if (input.actions.backward) this.direction.sub(forward);
        if (input.actions.right) this.direction.add(right);
        if (input.actions.left) this.direction.sub(right);

        if (this.direction.lengthSq() > 0) this.direction.normalize();

        // Apply to Velocity (X/Z only, Y is gravity)
        // Simple friction/acceleration
        this.velocity.x = this.direction.x * speed;
        this.velocity.z = this.direction.z * speed;

        // Jump
        if (this.onGround && input.actions.jump) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }
        
        // Drop Item (Q key - mapped in InputManager usually, or here)
        // Checking raw key for Q since InputManager might not have mapped it explicitly in previous step
        if (input.keys['KeyQ']) {
            input.keys['KeyQ'] = false; // Trigger once
            this.dropCurrentItem();
        }
        
        // Hotbar Switching (1-9)
        for (let i = 1; i <= 9; i++) {
            if (input.keys[`Digit${i}`]) {
                this.selectedSlot = i - 1;
                this.game.uiManager.updateHotbarSelection(this.selectedSlot);
            }
        }
        // Scroll Wheel
        if (input.scrollDelta !== 0) {
            this.selectedSlot -= input.scrollDelta;
            if (this.selectedSlot < 0) this.selectedSlot = 8;
            if (this.selectedSlot > 8) this.selectedSlot = 0;
            this.game.uiManager.updateHotbarSelection(this.selectedSlot);
        }
    }

    handlePhysics(dt) {
        // Gravity
        this.velocity.y -= this.gravity * dt;

        // Proposed movement
        const dx = this.velocity.x * dt;
        const dy = this.velocity.y * dt;
        const dz = this.velocity.z * dt;

        // Collision Detection (Swept AABB roughly)
        // We move axis by axis to allow sliding
        
        // 1. Move X
        this.position.x += dx;
        if (this.checkCollision()) {
            this.position.x -= dx;
            this.velocity.x = 0;
        }

        // 2. Move Z
        this.position.z += dz;
        if (this.checkCollision()) {
            this.position.z -= dz;
            this.velocity.z = 0;
        }

        // 3. Move Y
        this.position.y += dy;
        if (this.checkCollision()) {
            this.position.y -= dy;
            this.velocity.y = 0;
            
            // Hit ground or ceiling?
            if (dy < 0) {
                this.onGround = true;
            }
        } else {
            this.onGround = false;
        }
        
        // Bottom of world kill plane
        if (this.position.y < -50) {
            this.respawn();
        }

        // Check for Item Pickups
        this.checkItemPickups();
    }

    checkCollision() {
        // Simple Voxel Collision
        // Check corners of the player's bounding box against solid blocks
        const minX = Math.floor(this.position.x - this.width / 2);
        const maxX = Math.floor(this.position.x + this.width / 2);
        const minY = Math.floor(this.position.y - 1.6); // Feet (eye level is 0 offset roughly)
        const maxY = Math.floor(this.position.y + 0.2); // Head
        const minZ = Math.floor(this.position.z - this.width / 2);
        const maxZ = Math.floor(this.position.z + this.width / 2);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const block = this.game.world.getBlock(x, y, z);
                    // 0 is air, 9 is water (no collision for now, swimmable logic later), 11 leaves (passable?)
                    // For now: Solid if > 0 and not water/flower/tallgrass
                    if (block > 0 && block !== 9 && block !== 11) { 
                        return true;
                    }
                }
            }
        }
        return false;
    }

    handleInteraction(dt) {
        // Raycast from camera center
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        // Get meshes from world chunks
        // Optimization: Only check nearby chunks or specific collision meshes
        // For this scope: We Raycast against the visual mesh. 
        // Note: World needs to expose meshes.
        
        const intersects = this.raycaster.intersectObjects(this.game.world.scene.children, true);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Highlight Box
            const px = Math.floor(hit.point.x - hit.face.normal.x * 0.1);
            const py = Math.floor(hit.point.y - hit.face.normal.y * 0.1);
            const pz = Math.floor(hit.point.z - hit.face.normal.z * 0.1);
            
            this.selectionBox.position.set(px + 0.5, py + 0.5, pz + 0.5);
            this.selectionBox.visible = true;

            // Cooldowns
            if (this.placeCooldown > 0) this.placeCooldown -= dt;

            // Attack / Break (Left Click)
            if (this.game.inputManager.actions.attack) {
                if (this.placeCooldown <= 0) {
                    this.game.world.setBlock(px, py, pz, 0); // Set to Air
                    this.game.playSound('dig');
                    
                    // Drop Item Logic
                    // We need to know what block it was.
                    // For now, World.setBlock destroys it, so we should check before.
                    // Ideally world.breakBlock(x,y,z) handles this.
                    // Implementing "breakBlock" logic here locally:
                    // 1. Get ID. 2. Spawn Entity. 3. Set Air.
                    
                    // Trigger block particles (optional, visual polish)
                    this.placeCooldown = 0.25; // Delay
                }
            }

            // Place (Right Click)
            if (this.game.inputManager.actions.place) {
                if (this.placeCooldown <= 0) {
                    // Calc placement position (neighbor block)
                    const bx = Math.floor(hit.point.x + hit.face.normal.x * 0.1);
                    const by = Math.floor(hit.point.y + hit.face.normal.y * 0.1);
                    const bz = Math.floor(hit.point.z + hit.face.normal.z * 0.1);

                    // Check if player is standing there (prevent self-stuck)
                    if (!this.checkEntityCollision(bx, by, bz)) {
                        const currentItem = this.inventory[this.selectedSlot];
                        if (currentItem && this.game.world.isBlock(currentItem.id)) {
                            const blockId = this.game.world.getBlockId(currentItem.id);
                            this.game.world.setBlock(bx, by, bz, blockId);
                            this.game.playSound('place');
                            
                            // Decrease count
                            // Creative mode check? No, survival requested.
                            currentItem.count--;
                            if (currentItem.count <= 0) this.inventory[this.selectedSlot] = null;
                            this.game.uiManager.updateHotbar();
                            
                            this.placeCooldown = 0.25;
                        }
                    }
                }
            }
        } else {
            this.selectionBox.visible = false;
        }
    }

    // Prevent placing block inside player
    checkEntityCollision(x, y, z) {
        const pMinX = this.position.x - this.width/2;
        const pMaxX = this.position.x + this.width/2;
        const pMinY = this.position.y - 1.6;
        const pMaxY = this.position.y + 0.2;
        const pMinZ = this.position.z - this.width/2;
        const pMaxZ = this.position.z + this.width/2;

        // Check AABB overlap with block voxel (x, y, z) to (x+1, y+1, z+1)
        return (pMinX < x + 1 && pMaxX > x &&
                pMinY < y + 1 && pMaxY > y &&
                pMinZ < z + 1 && pMaxZ > z);
    }

    updateCamera() {
        this.camera.position.copy(this.position);
    }

    respawn() {
        this.position.set(0, 80, 0); // Reset high
        this.velocity.set(0, 0, 0);
        this.game.uiManager.showDeathScreen(false);
    }

    // --- ITEM LOGIC ---

    dropCurrentItem() {
        const item = this.inventory[this.selectedSlot];
        if (!item) return;

        // Create Drop Entity
        // Direction: Player view direction
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        
        this.game.entityManager.spawnItem(
            this.position.x, this.position.y - 0.5, this.position.z,
            item.id,
            dir.multiplyScalar(5) // Throw velocity
        );

        // Remove from inventory
        item.count--;
        if (item.count <= 0) this.inventory[this.selectedSlot] = null;
        this.game.uiManager.updateHotbar();
    }

    checkItemPickups() {
        // Iterate through all dropped items in the world
        const drops = this.game.entityManager.items; // Assuming simple array
        for (let i = drops.length - 1; i >= 0; i--) {
            const drop = drops[i];
            const dist = this.position.distanceTo(drop.mesh.position);
            
            if (dist < 1.5 && drop.canPickup) {
                // Add to inventory
                const left = this.addItemToInventory(drop.type, 1);
                if (left === 0) {
                    this.game.entityManager.removeItem(drop.id);
                    this.game.playSound('pop'); // "Pop" sound
                    this.game.uiManager.showPickupNotification(drop.type);
                }
            }
        }
    }

    addItemToInventory(id, count) {
        // 1. Try stack existing
        for (let i = 0; i < 36; i++) {
            const slot = this.inventory[i];
            if (slot && slot.id === id && slot.count < 64) {
                const space = 64 - slot.count;
                const add = Math.min(space, count);
                slot.count += add;
                count -= add;
                if (count === 0) {
                    this.game.uiManager.updateHotbar(); // Update UI if hotbar
                    return 0;
                }
            }
        }
        
        // 2. Empty slot
        for (let i = 0; i < 36; i++) {
            if (this.inventory[i] === null) {
                this.inventory[i] = { id: id, count: count };
                this.game.uiManager.updateHotbar();
                return 0;
            }
        }

        return count; // Inventory full
    }
}