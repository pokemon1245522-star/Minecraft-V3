import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class TextureManager {
    constructor() {
        this.loader = new THREE.TextureLoader();
        this.textures = {};
        this.materials = {};
        
        // Define Paths
        this.paths = {
            blocks: 'assets/textures/blocks/',
            items: 'assets/textures/item/',
            mobs: 'assets/textures/mobs/',
            ui: 'assets/textures/ui/'
        };
    }

    loadAll() {
        return new Promise((resolve) => {
            const loadTex = (name, filename, category = 'blocks') => {
                const path = this.paths[category] + filename;
                const tex = this.loader.load(path);
                // Pixel Art Settings
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.NearestFilter;
                tex.colorSpace = THREE.SRGBColorSpace;
                this.textures[name] = tex;
            };

            // --- BLOCKS ---
            loadTex('bedrock', 'bedrock.png');
            loadTex('coal_ore', 'Caol_ore.png'); // Exact typo from image
            loadTex('cobblestone', 'cobblestone.png');
            loadTex('crafting_table_front', 'crafting_table_front.png');
            loadTex('crafting_table_side', 'crafting_table_side.png');
            loadTex('crafting_table_top', 'crafting_table_top.png');
            loadTex('deadbush', 'deadbush.png');
            loadTex('diamond_block', 'diamond_block.png');
            loadTex('diamond_ore', 'Diamond_ore.jpeg'); // .jpeg extension
            loadTex('dirt', 'dirt.png');
            // Assuming .png for enchanting table bottom as strictly requested
            loadTex('enchanting_table_bottom', 'enchanting_table_bottom.png'); 
            loadTex('flower_tulip_red', 'flower_tulip_red.png');
            loadTex('furnace_front_off', 'furnace_front_off.png');
            loadTex('furnace_front_on', 'furnace_front_on.png');
            loadTex('furnace_side', 'furnace_side.png');
            loadTex('furnace_top', 'furnace_top.png');
            loadTex('glass', 'glass.png');
            loadTex('gold_block', 'gold_block.png');
            loadTex('grass_side', 'grass_side.png');
            loadTex('grass_top', 'grass_top.png');
            loadTex('gravel', 'gravel.png');
            loadTex('iron_ore', 'Iron_ore.png');
            loadTex('lava_flow', 'lava_flow.png');
            loadTex('lava_still', 'lava_still.png');
            loadTex('oak_leaves', 'oak_leaves.png');
            loadTex('oak_log_side', 'oak_log_side.png');
            loadTex('oak_log_top', 'oak_log_top.png');
            loadTex('oak_planks', 'oak_planks.png');
            loadTex('gold_ore', 'ore_gold.png');
            loadTex('raw_gold_block', 'raw_gold.png'); // Naming as block for placement
            loadTex('raw_iron_block', 'raw_iron.png');
            loadTex('sand', 'sand.png');
            loadTex('stone', 'stone.png');
            loadTex('water_flow', 'water_flow.png');
            loadTex('water_still', 'water_still.png');

            // Destroy Stages
            for(let i=0; i<=9; i++) {
                loadTex(`destroy_${i}`, `destroy_stage_${i}.png`);
            }

            // --- ITEMS (Tools, Food, Ingots) ---
            const catItem = 'items';
            loadTex('apple', 'apple.png', catItem);
            loadTex('beef_cooked', 'beef_cooked.png', catItem);
            loadTex('beef_raw', 'beef_raw.png', catItem);
            loadTex('bucket_empty', 'bucket_empty.png', catItem);
            loadTex('bucket_lava', 'bucket_lava.png', catItem);
            loadTex('bucket_water', 'bucket_water.png', catItem);
            loadTex('chicken_cooked', 'chicken_cooked.png', catItem);
            loadTex('coal', 'Coal.png', catItem);
            loadTex('diamond', 'Diamond.png', catItem);
            loadTex('gold_ingot', 'gold_ingot.png', catItem);
            loadTex('iron_ingot', 'Iron_Ingot.png', catItem);
            loadTex('stick', 'stick.png', catItem);

            // Tools (Specific Extensions)
            loadTex('diamond_axe', 'Diamond_Axe.png', catItem);
            loadTex('diamond_pickaxe', 'Diamond_Pickaxe.webp', catItem);
            loadTex('diamond_sword', 'Diamond_Sword.webp', catItem);
            
            loadTex('golden_axe', 'Golden_Axe_JE3_BE2.png', catItem);
            loadTex('golden_pickaxe', 'Golden_Pickaxe.webp', catItem);
            loadTex('golden_sword', 'Golden_Sword.webp', catItem);

            loadTex('iron_axe', 'Iron_Axe_JE5_BE2.png', catItem);
            loadTex('iron_pickaxe', 'Iron_Pickaxe.webp', catItem);
            loadTex('iron_sword', 'Iron_Sword.webp', catItem);

            loadTex('stone_axe', 'stone_axe.png', catItem);
            loadTex('stone_pickaxe', 'stone_pickaxe.png', catItem);
            loadTex('stone_sword', 'stone_sword.png', catItem);

            loadTex('wooden_axe', 'wooden_axe.png', catItem);
            loadTex('wooden_pickaxe', 'wooden_pickaxe.png', catItem);
            loadTex('wooden_sword', 'wooden_sword.png', catItem);

            // --- MOBS ---
            const catMob = 'mobs';
            loadTex('cow', 'cow.png', catMob);
            loadTex('sheep', 'sheep.png', catMob);
            loadTex('zombie', 'zombie.png', catMob);

            // --- UI ---
            const catUI = 'ui';
            loadTex('crosshair', 'crosshair.png', catUI);
            loadTex('heart', 'heart.png', catUI);
            loadTex('heart_half', 'half_heart.png', catUI);
            loadTex('heart_blank', 'blank_heart.png', catUI);
            loadTex('hunger', 'hunger_bar.png', catUI);
            loadTex('selector', 'selector.png', catUI);

            // Create Materials immediately after logic
            this.createMaterials();
            
            // Resolve immediately (Three.js loads asynchronously but we return promise for flow)
            // In a real robust engine we'd use LoadingManager, but this works for this scope.
            setTimeout(resolve, 100); 
        });
    }

    createMaterials() {
        // Helper to make simple block materials
        const makeMat = (texName, transparent = false) => {
            const mat = new THREE.MeshLambertMaterial({ 
                map: this.textures[texName], 
                transparent: transparent, 
                alphaTest: transparent ? 0.5 : 0
            });
            return mat;
        };

        // Simple Blocks
        this.materials['dirt'] = makeMat('dirt');
        this.materials['stone'] = makeMat('stone');
        this.materials['cobblestone'] = makeMat('cobblestone');
        this.materials['bedrock'] = makeMat('bedrock');
        this.materials['coal_ore'] = makeMat('coal_ore');
        this.materials['iron_ore'] = makeMat('iron_ore');
        this.materials['gold_ore'] = makeMat('gold_ore');
        this.materials['diamond_ore'] = makeMat('diamond_ore');
        this.materials['gold_block'] = makeMat('gold_block');
        this.materials['diamond_block'] = makeMat('diamond_block');
        this.materials['sand'] = makeMat('sand');
        this.materials['gravel'] = makeMat('gravel');
        this.materials['oak_planks'] = makeMat('oak_planks');
        this.materials['glass'] = new THREE.MeshLambertMaterial({ map: this.textures['glass'], transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        this.materials['oak_leaves'] = makeMat('oak_leaves', true);
        this.materials['deadbush'] = makeMat('deadbush', true);
        this.materials['flower_tulip_red'] = makeMat('flower_tulip_red', true);
        this.materials['enchanting_table_bottom'] = makeMat('enchanting_table_bottom'); // Used for obsidian logic

        // --- COMPLEX BLOCKS (Multi-textured) ---
        // Array Order: Right, Left, Top, Bottom, Front, Back
        
        // Grass Block
        const grassTop = makeMat('grass_top');
        const grassSide = makeMat('grass_side');
        const dirt = makeMat('dirt');
        this.materials['grass'] = [grassSide, grassSide, grassTop, dirt, grassSide, grassSide];

        // Oak Log
        const logTop = makeMat('oak_log_top');
        const logSide = makeMat('oak_log_side');
        this.materials['oak_log'] = [logSide, logSide, logTop, logTop, logSide, logSide];

        // Crafting Table
        const ctTop = makeMat('crafting_table_top');
        const ctSide = makeMat('crafting_table_side');
        const ctFront = makeMat('crafting_table_front');
        // Assuming bottom is planks
        const planks = makeMat('oak_planks'); 
        this.materials['crafting_table'] = [ctSide, ctSide, ctTop, planks, ctFront, ctFront];

        // Furnace
        const fTop = makeMat('furnace_top');
        const fSide = makeMat('furnace_side');
        const fFront = makeMat('furnace_front_off');
        const fFrontOn = makeMat('furnace_front_on');
        const cobble = makeMat('cobblestone');
        this.materials['furnace'] = [fSide, fSide, fTop, cobble, fFront, fSide];
        this.materials['furnace_on'] = [fSide, fSide, fTop, cobble, fFrontOn, fSide];
        
        // Liquids (Simple single texture for now, could be animated shader later)
        this.materials['water'] = new THREE.MeshLambertMaterial({ map: this.textures['water_still'], transparent: true, opacity: 0.7 });
        this.materials['lava'] = new THREE.MeshBasicMaterial({ map: this.textures['lava_still'] }); // Basic material so it glows
    }

    getMaterial(name) {
        return this.materials[name] || this.materials['dirt']; // Fallback
    }

    getTexture(name) {
        return this.textures[name];
    }
}