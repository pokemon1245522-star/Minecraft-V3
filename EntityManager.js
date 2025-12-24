import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Utils } from './Utils.js';

export class EntityManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.items = []; // Dropped items
        this.mobs = [];  // Mobs (Cows, Zombies, etc.)
    }

    // --- DROPPED ITEMS ---

    spawnItem(x, y, z, itemType, velocity = null) {
        const id = Utils.generateUUID();
        
        // Visual Mesh (Rotating Plane)
        // Minecraft items are 2D textures that float and rotate
        const tex = this.game.textureManager.getTexture(itemType) || this.game.textureManager.getTexture('cobblestone');
        
        const material = new THREE.MeshBasicMaterial({ 
            map: tex, 
            transparent: true, 
            side: THREE.DoubleSide,
            alphaTest: 0.5 
        });

        // 0.5 size roughly
        const geometry = new THREE.PlaneGeometry(0.4, 0.4);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        
        // Shadow / Bobbing offset
        mesh.userData.yOffset = Math.random() * Math.PI;
        
        this.scene.add(mesh);

        const itemEntity = {
            id: id,
            type: itemType,
            mesh: mesh,
            position: new THREE.Vector3(x, y, z),
            velocity: velocity || new THREE.Vector3((Math.random()-0.5)*2, 3, (Math.random()-0.5)*2),
            onGround: false,
            canPickup: false,
            pickupTimer: 0,
            lifeTime: 0
        };

        this.items.push(itemEntity);
        return itemEntity;
    }

    removeItem(id) {
        const index = this.items.findIndex(i => i.id === id);
        if (index !== -1) {
            const item = this.items[index];
            this.scene.remove(item.mesh);
            item.mesh.geometry.dispose();
            item.mesh.material.dispose();
            this.items.splice(index, 1);
        }
    }

    update(dt) {
        this.updateItems(dt);
        // this.updateMobs(dt); // Mob AI would go here
    }

    updateItems(dt) {
        const gravity = 20.0;
        const friction = 2.0;

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            
            // 1. Pickup Delay (prevent instant pickup after drop)
            if (!item.canPickup) {
                item.pickupTimer += dt;
                if (item.pickupTimer > 1.0) item.canPickup = true;
            }

            // 2. Physics
            if (!item.onGround) {
                item.velocity.y -= gravity * dt;
            }

            // Move
            item.position.x += item.velocity.x * dt;
            item.position.y += item.velocity.y * dt;
            item.position.z += item.velocity.z * dt;

            // 3. Collision with World (Simple single-point check)
            // Check if center is inside a solid block
            const bx = Math.floor(item.position.x);
            const by = Math.floor(item.position.y);
            const bz = Math.floor(item.position.z);
            
            const block = this.game.world.getBlock(bx, by, bz);
            
            // Ground Collision
            if (block > 0 && block !== 9) { // Solid block
                // Push up to top of block
                item.position.y = by + 1.0 + 0.1; 
                item.velocity.y = 0;
                item.velocity.x *= 0.0; // Stop horizontal slide instantly on ground
                item.velocity.z *= 0.0;
                item.onGround = true;
            } else {
                item.onGround = false;
            }

            // 4. Update Mesh
            item.mesh.position.copy(item.position);
            
            // Floating Animation (Bobbing)
            const bob = Math.sin(this.game.time * 2 + item.mesh.userData.yOffset) * 0.1;
            item.mesh.position.y += bob;

            // Rotation Animation
            item.mesh.rotation.y += 2.0 * dt;
            // Make the item look at the camera slightly or just spin flat?
            // Minecraft items spin around Y axis.
        }
    }
}