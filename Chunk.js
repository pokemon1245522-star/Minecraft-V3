import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Utils } from './Utils.js';

export class Chunk {
    constructor(x, z, textureManager) {
        this.x = x;
        this.z = z;
        this.textureManager = textureManager;
        this.data = new Uint8Array(16 * 256 * 16); // Flattened array
        this.mesh = null;
        this.isDirty = false; // If true, needs remesh
    }

    // --- 3D Noise Helper for Caves ---
    // Simple pseudo-3D noise by combining 2D slices with offsets
    get3DNoise(x, y, z, seed) {
        // We use the Utils noise but shift the seed based on Y to simulate 3D
        // Frequency factors make caves large and windey
        const scale = 0.05; 
        const val = Utils.noise2D(x * scale, z * scale, seed + y * 0.1);
        return val;
    }

    generate(seed) {
        // World Generation Constants
        const SEA_LEVEL = 60;
        
        for (let lx = 0; lx < 16; lx++) {
            for (let lz = 0; lz < 16; lz++) {
                // World Coords
                const wx = this.x * 16 + lx;
                const wz = this.z * 16 + lz;

                // 1. Terrain Height (Biome-like variations)
                // Base noise for height
                let noise = Utils.getSmoothNoise(wx * 0.02, wz * 0.02, seed); 
                // Detail noise
                let detail = Utils.noise2D(wx * 0.1, wz * 0.1, seed + 100) * 0.2;
                
                // Height Map Logic: Map -1..1 to 40..100
                let height = Math.floor(60 + (noise + detail) * 25);
                if (height < 0) height = 1; // Bedrock protection

                // 2. Fill Blocks
                for (let y = 0; y <= height; y++) {
                    let blockType = 0; // Air

                    // Bedrock at bottom
                    if (y === 0) {
                        this.setBlock(lx, y, lz, 1); // Bedrock ID (mapped later)
                        continue;
                    }

                    // --- ADVANCED CAVE GENERATION ---
                    // "Cheese" Caves: If 3D noise is below threshold, it's air
                    // Only generate caves below a certain depth to keep surface mostly intact
                    if (y < height - 4) { // Don't cut top soil
                        // 3D Noise Value
                        const caveNoise = this.get3DNoise(wx, y, wz, seed + 999);
                        // Threshold: Higher number = bigger caves. 0.4 is decent.
                        if (caveNoise > 0.4) {
                            continue; // Leave as AIR (Cave)
                        }
                    }

                    // Surface Blocks
                    if (y === height) {
                        blockType = 2; // Grass
                    } else if (y > height - 4) {
                        blockType = 3; // Dirt
                    } else {
                        blockType = 4; // Stone
                    }

                    // --- ORE GENERATION ---
                    if (blockType === 4) { // If Stone
                        const r = Math.random();
                        if (y < 20 && r < 0.005) blockType = 8; // Diamond Ore
                        else if (y < 40 && r < 0.01) blockType = 7; // Gold Ore
                        else if (y < 60 && r < 0.02) blockType = 6; // Iron Ore
                        else if (r < 0.03) blockType = 5; // Coal Ore
                    }

                    this.setBlock(lx, y, lz, blockType);
                }

                // 3. Water / Lava bodies
                for (let y = height + 1; y <= SEA_LEVEL; y++) {
                    this.setBlock(lx, y, lz, 9); // Water
                }
            }
        }
    }

    // Helper: Map ID to String Name
    // 1: bedrock, 2: grass, 3: dirt, 4: stone, 5: coal, 6: iron, 7: gold, 8: diamond, 9: water
    // 10: oak_log, 11: oak_leaves, 12: sand, 13: oak_planks, 14: cobblestone
    getBlockName(id) {
        const map = {
            1: 'bedrock', 2: 'grass', 3: 'dirt', 4: 'stone',
            5: 'coal_ore', 6: 'iron_ore', 7: 'gold_ore', 8: 'diamond_ore',
            9: 'water', 10: 'oak_log', 11: 'oak_leaves', 12: 'sand',
            13: 'oak_planks', 14: 'cobblestone', 15: 'crafting_table', 16: 'furnace', 17: 'glass'
        };
        return map[id] || null;
    }
    
    getBlockId(name) {
        const map = {
            'bedrock': 1, 'grass': 2, 'dirt': 3, 'stone': 4,
            'coal_ore': 5, 'iron_ore': 6, 'gold_ore': 7, 'diamond_ore': 8,
            'water': 9, 'oak_log': 10, 'oak_leaves': 11, 'sand': 12,
            'oak_planks': 13, 'cobblestone': 14, 'crafting_table': 15, 'furnace': 16, 'glass': 17
        };
        return map[name] || 0;
    }

    setBlock(x, y, z, id) {
        if (x < 0 || x >= 16 || y < 0 || y >= 256 || z < 0 || z >= 16) return;
        const index = x + 16 * (z + 16 * y);
        this.data[index] = id;
        this.isDirty = true;
    }

    getBlock(x, y, z) {
        if (x < 0 || x >= 16 || y < 0 || y >= 256 || z < 0 || z >= 16) return 0;
        const index = x + 16 * (z + 16 * y);
        return this.data[index];
    }

    // Build the 3D Mesh
    buildMesh() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
        }

        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const uvs = [];
        const normals = [];
        // Since we are using multi-materials (array of materials), we need groups
        // But for simplicity/performance in WebGL, best approach is often Texture Atlas.
        // Given constraints (images provided separately), we will use Group objects or merge geometry per texture.
        // For strict performance: One mesh per material type.
        
        // SIMPLE APPROACH for 0 errors: Create a generic mesh logic that builds geometry arrays per material.
        
        // Groups for Geometry: Key = TextureName, Value = { pos, uv, norm }
        const geometryGroups = {};

        const addFace = (x, y, z, matName, faceIdx) => {
            if (!geometryGroups[matName]) geometryGroups[matName] = { positions: [], uvs: [], normals: [], count: 0 };
            
            const g = geometryGroups[matName];
            
            // Vertices for a cube face
            // 0: right, 1: left, 2: top, 3: bottom, 4: front, 5: back
            const X = x, Y = y, Z = z;
            
            // Position Offsets
            let v = [];
            if (faceIdx === 0) v = [[1,0,1], [1,0,0], [1,1,0], [1,1,1]]; // Right (+x)
            if (faceIdx === 1) v = [[0,0,0], [0,0,1], [0,1,1], [0,1,0]]; // Left (-x)
            if (faceIdx === 2) v = [[0,1,1], [1,1,1], [1,1,0], [0,1,0]]; // Top (+y)
            if (faceIdx === 3) v = [[0,0,0], [1,0,0], [1,0,1], [0,0,1]]; // Bottom (-y)
            if (faceIdx === 4) v = [[0,0,1], [1,0,1], [1,1,1], [0,1,1]]; // Front (+z)
            if (faceIdx === 5) v = [[1,0,0], [0,0,0], [0,1,0], [1,1,0]]; // Back (-z)

            // Normal
            const nMap = [[1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]];
            const norm = nMap[faceIdx];

            // Push Triangles (2 per face)
            // Indices: 0,1,2 and 0,2,3
            const indices = [0, 1, 2, 0, 2, 3];
            
            for(let i of indices) {
                g.positions.push(X + v[i][0], Y + v[i][1], Z + v[i][2]);
                g.normals.push(norm[0], norm[1], norm[2]);
            }

            // UVs
            const uvCoords = [[0,0], [1,0], [1,1], [0,1]];
            for(let i of indices) {
                g.uvs.push(uvCoords[i][0], uvCoords[i][1]);
            }
        };

        // Greedy-ish meshing loop
        for (let y = 0; y < 256; y++) {
            for (let z = 0; z < 16; z++) {
                for (let x = 0; x < 16; x++) {
                    const id = this.getBlock(x, y, z);
                    if (id === 0) continue; // Air

                    const name = this.getBlockName(id);
                    const mat = this.textureManager.getMaterial(name);
                    
                    // Check 6 neighbors to cull faces
                    // If neighbor is 0 (air) or transparent (leaves/glass/water), draw face.
                    
                    const checkNeighbor = (nx, ny, nz) => {
                        // If out of chunk bounds, we assume air for now (simplification)
                        // Or we could check neighbor chunks in World.js, but here Chunk is isolated.
                        // For perfect edges, World.js manages updates. Here we assume edge faces draw.
                        if (nx < 0 || nx > 15 || ny < 0 || ny > 255 || nz < 0 || nz > 15) return true;
                        const nid = this.getBlock(nx, ny, nz);
                        // If neighbor is solid, don't draw. If air or water, draw.
                        if (nid === 0) return true;
                        // Special: Water next to water? Don't draw
                        if (id === 9 && nid === 9) return false; 
                        // If neighbor is transparent (leaves, glass) and current is solid, draw.
                        const nName = this.getBlockName(nid);
                        if (['oak_leaves', 'glass', 'water'].includes(nName)) return true;
                        return false;
                    };

                    // Material handling: if Array, pick specific face texture
                    // 0: right, 1: left, 2: top, 3: bottom, 4: front, 5: back
                    for (let i = 0; i < 6; i++) {
                        let draw = false;
                        if (i===0) draw = checkNeighbor(x+1, y, z);
                        if (i===1) draw = checkNeighbor(x-1, y, z);
                        if (i===2) draw = checkNeighbor(x, y+1, z);
                        if (i===3) draw = checkNeighbor(x, y-1, z);
                        if (i===4) draw = checkNeighbor(x, y, z+1);
                        if (i===5) draw = checkNeighbor(x, y, z-1);

                        if (draw) {
                            let matName = name;
                            // If material is array (multi-texture block like Grass)
                            if (Array.isArray(mat)) {
                                // We need a way to key this specific face texture
                                // We can use suffix like _top, _side
                                // But TextureManager stored actual materials.
                                // We need to group by Material UUID or Name.
                                // Simplification: Just use the base name and handle sub-meshes?
                                // Better: Pass the specific material OBJECT to the group key
                                // But string keys are easier. Let's append suffix.
                                const suffixes = ['_right', '_left', '_top', '_bottom', '_front', '_back'];
                                // Special case for grass: top is 'grass_top', others 'grass_side' etc.
                                // Actually, let's just use the texture name extracted from the material map
                                if (name === 'grass') {
                                    if (i === 2) matName = 'grass_top';
                                    else if (i === 3) matName = 'dirt';
                                    else matName = 'grass_side';
                                } else if (name === 'oak_log') {
                                    if (i === 2 || i === 3) matName = 'oak_log_top';
                                    else matName = 'oak_log_side';
                                } else if (name === 'furnace') {
                                    if (i === 4) matName = 'furnace_front_off';
                                    else if (i === 2 || i === 3) matName = 'furnace_top';
                                    else matName = 'furnace_side';
                                } else if (name === 'crafting_table') {
                                    if (i === 2) matName = 'crafting_table_top';
                                    else if (i === 4 || i === 5) matName = 'crafting_table_front'; // Approx
                                    else matName = 'crafting_table_side';
                                }
                            }
                            addFace(x, y, z, matName, i);
                        }
                    }
                }
            }
        }

        // Combine into one Mesh with multiple groups
        const groupMesh = new THREE.Group();
        groupMesh.position.set(this.x * 16, 0, this.z * 16);

        for (const [matKey, data] of Object.entries(geometryGroups)) {
            if (data.positions.length === 0) continue;

            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
            geom.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
            geom.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
            
            // Get material from manager
            // Note: If we split grass_top, we need to ensure TextureManager has materials keyed by that name
            // TextureManager has materials['grass_top']? Yes, we created materials for all textures.
            // But we didn't export them all into the materials list unless we explicitly did.
            // Refine TextureManager access: If direct match fails, try generic.
            
            let material = this.textureManager.getMaterial(matKey);
            if (!material) {
                // If specific face material not pre-cached, create it on fly? 
                // In TextureManager, we made textures for everything.
                // We can just grab texture and wrap in material.
                const tex = this.textureManager.getTexture(matKey);
                if (tex) {
                    material = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.5 });
                } else {
                    material = this.textureManager.getMaterial('dirt'); // Fallback
                }
            }

            const mesh = new THREE.Mesh(geom, material);
            groupMesh.add(mesh);
        }

        this.mesh = groupMesh;
        this.isDirty = false;
        return this.mesh;
    }
}