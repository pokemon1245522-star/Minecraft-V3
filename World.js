import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Chunk } from './Chunk.js';
import { Utils } from './Utils.js';

export class World {
    constructor(game, seed) {
        this.game = game;
        this.scene = game.scene;
        this.seed = seed;
        
        // Map "x,z" string to Chunk object
        this.chunks = new Map();
        
        // Render Distance (Radius in chunks)
        this.renderDistance = 4; // Keep low for web performance (4 = 9x9 chunks)
        
        // Texture Manager reference for chunks
        this.textureManager = game.textureManager;
        
        // Queue for mesh rebuilding to avoid freezing
        this.buildQueue = [];
    }

    update(playerPos) {
        const pChunk = Utils.getChunkCoords(playerPos.x, playerPos.z);
        
        // 1. Determine needed chunks
        const neededChunks = new Set();
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                const cx = pChunk.x + x;
                const cz = pChunk.z + z;
                neededChunks.add(`${cx},${cz}`);
                
                // If chunk doesn't exist, create it
                if (!this.chunks.has(`${cx},${cz}`)) {
                    this.createChunk(cx, cz);
                }
            }
        }

        // 2. Unload far chunks (Optional memory management)
        for (const [key, chunk] of this.chunks) {
            if (!neededChunks.has(key)) {
                if (chunk.mesh) {
                    this.scene.remove(chunk.mesh);
                    chunk.mesh.geometry.dispose();
                }
                this.chunks.delete(key);
            }
        }

        // 3. Process Build Queue (One per frame to reduce lag)
        if (this.buildQueue.length > 0) {
            // Sort by distance to player? For now just shift first
            const chunkKey = this.buildQueue.shift();
            const chunk = this.chunks.get(chunkKey);
            if (chunk) {
                const mesh = chunk.buildMesh();
                this.scene.add(mesh);
            }
        }
    }

    createChunk(cx, cz) {
        const chunk = new Chunk(cx, cz, this.textureManager);
        chunk.generate(this.seed);
        
        const key = `${cx},${cz}`;
        this.chunks.set(key, chunk);
        
        // Add to build queue
        this.buildQueue.push(key);
    }

    // --- Block Manipulation ---

    setBlock(x, y, z, id) {
        const coords = Utils.getChunkCoords(x, z);
        const key = `${coords.x},${coords.z}`;
        const chunk = this.chunks.get(key);

        if (chunk) {
            // Calculate local coordinates (0-15)
            // Handling negative modulo correctly
            let lx = x % 16;
            if (lx < 0) lx += 16;
            let lz = z % 16;
            if (lz < 0) lz += 16;

            chunk.setBlock(lx, y, lz, id);

            // Rebuild this chunk
            if (!this.buildQueue.includes(key)) {
                // Remove old mesh first if strictly synchronous, 
                // but usually we wait for buildQueue. 
                // To force immediate update for player interaction:
                this.scene.remove(chunk.mesh);
                const mesh = chunk.buildMesh();
                this.scene.add(mesh);
            }

            // Check Neighbors (if on edge, neighbor chunk mesh might need update)
            this.checkNeighborUpdate(lx, lz, coords.x, coords.z);
        }
    }

    checkNeighborUpdate(lx, lz, cx, cz) {
        const check = (nlx, nlz, ncx, ncz) => {
            const key = `${ncx},${ncz}`;
            if (this.chunks.has(key) && !this.buildQueue.includes(key)) {
                 // Force update neighbor
                 const chunk = this.chunks.get(key);
                 this.scene.remove(chunk.mesh);
                 this.scene.add(chunk.buildMesh());
            }
        };

        if (lx === 0) check(15, lz, cx - 1, cz);
        if (lx === 15) check(0, lz, cx + 1, cz);
        if (lz === 0) check(lx, 15, cx, cz - 1);
        if (lz === 15) check(lx, 0, cx, cz + 1);
    }

    getBlock(x, y, z) {
        const coords = Utils.getChunkCoords(x, z);
        const key = `${coords.x},${coords.z}`;
        const chunk = this.chunks.get(key);

        if (!chunk) return 0; // Treat unloaded area as air

        let lx = x % 16;
        if (lx < 0) lx += 16;
        let lz = z % 16;
        if (lz < 0) lz += 16;

        return chunk.getBlock(lx, y, lz);
    }

    // Wrappers for Chunk static helpers
    getBlockId(name) {
        // Create a temporary chunk just to access the method, or move map to Utils.
        // Since logic is in Chunk.js prototype, we can use a helper instance or static map.
        // For safety, I'll assume Chunk has the map.
        // Actually, we can just hardcode the check here or make Chunk.js export the map.
        // Let's use the first loaded chunk or a lookup.
        const map = {
            'bedrock': 1, 'grass': 2, 'dirt': 3, 'stone': 4,
            'coal_ore': 5, 'iron_ore': 6, 'gold_ore': 7, 'diamond_ore': 8,
            'water': 9, 'oak_log': 10, 'oak_leaves': 11, 'sand': 12,
            'oak_planks': 13, 'cobblestone': 14, 'crafting_table': 15, 'furnace': 16, 'glass': 17
        };
        return map[name] || 0;
    }

    isBlock(name) {
        // Returns true if the item name corresponds to a placeable block
        const id = this.getBlockId(name);
        return id > 0;
    }
}