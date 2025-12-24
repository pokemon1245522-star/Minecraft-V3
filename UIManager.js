export class UIManager {
    constructor(game) {
        this.game = game;
        this.draggedItem = null; // { id, count }
        this.dragElement = null; // DOM Element following mouse

        // Elements
        this.hotbarEl = document.getElementById('hotbar');
        this.heartsEl = document.getElementById('hearts-container');
        this.inventoryScreen = document.getElementById('inventory-screen');
        this.mainInventoryEl = document.getElementById('main-inventory');
        this.craftingGridEl = document.getElementById('crafting-grid');
        this.craftingResultEl = document.getElementById('crafting-result');
        this.selectorEl = document.getElementById('selector');
        this.deathScreen = document.getElementById('death-screen');

        // State
        this.isInventoryOpen = false;
        this.craftingTableActive = false; // 2x2 vs 3x3

        // Init
        this.createHotbarSlots();
        this.initEventListeners();
    }

    // --- HUD ---

    createHotbarSlots() {
        this.hotbarEl.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.dataset.index = i;
            this.hotbarEl.appendChild(slot);
        }
    }

    updateHotbar() {
        const slots = this.hotbarEl.children;
        for (let i = 0; i < 9; i++) {
            this.updateSlotVisual(slots[i], this.game.player.inventory[i]);
        }
    }

    updateHotbarSelection(index) {
        // Move selector visual
        // 50px width + 4px gap + border offsets
        // Simple calc: index * 54px approx
        const offset = index * 54; 
        this.selectorEl.style.left = `${offset}px`;
    }

    updateSlotVisual(slotEl, item) {
        slotEl.innerHTML = '';
        if (item) {
            const img = document.createElement('img');
            // Check if item is block or item texture
            let path = 'assets/textures/item/';
            // Heuristic: If it has "ore", "log", "planks", "stone", "dirt", "grass", "sand" -> Block
            // Better: TextureManager categories. But filenames are unique mostly.
            // Using TextureManager cache to find source URL is hard since we loaded into GPU.
            // We reconstruct path based on known lists or just try item then block.
            // Simplification: We know the paths from TextureManager.
            
            // Map known IDs to filenames
            const name = item.id;
            // Quick lookup
            if (['stone', 'dirt', 'grass', 'cobblestone', 'sand', 'log', 'planks', 'ore', 'table', 'furnace', 'glass', 'bedrock'].some(s => name.includes(s))) {
                path = 'assets/textures/blocks/';
            }
            
            // Fix specific naming for file
            let filename = name + '.png';
            if (name === 'coal_ore') filename = 'Caol_ore.png';
            if (name === 'diamond_pickaxe') filename = 'Diamond_Pickaxe.webp';
            if (name === 'diamond_sword') filename = 'Diamond_Sword.webp';
            if (name === 'iron_ingot') filename = 'Iron_Ingot.png';
            // ... (Add other specifics if needed, or rely on consistent naming in future)
            
            // To be safe and avoid broken images, let's use the TextureManager loader logic reverse?
            // No, just try to load. 
            // Better approach: We create a helper in Utils to get Icon URL.
            // For this scope: We use the names directly.
            
            // Specific fixes based on user assets:
            if(name === 'oak_log') path = 'assets/textures/blocks/oak_log_side.png';
            else if(name === 'grass') path = 'assets/textures/blocks/grass_side.png';
            else if(name === 'furnace') path = 'assets/textures/blocks/furnace_front_on.png';
            else if(name.includes('pickaxe') || name.includes('axe') || name.includes('sword') || name.includes('ingot') || name === 'stick' || name === 'coal' || name === 'diamond') {
                path = 'assets/textures/item/';
                if(name === 'coal') filename = 'Coal.png';
                if(name === 'stick') filename = 'stick.png';
                if(name === 'diamond') filename = 'Diamond.png';
                if(name === 'iron_ingot') filename = 'Iron_Ingot.png';
                if(name === 'gold_ingot') filename = 'gold_ingot.png';
                if(name === 'diamond_pickaxe') filename = 'Diamond_Pickaxe.webp';
                if(name === 'diamond_axe') filename = 'Diamond_Axe.png';
                if(name === 'diamond_sword') filename = 'Diamond_Sword.webp';
                if(name === 'stone_pickaxe') filename = 'stone_pickaxe.png';
            } else {
                // Default block path
                path = 'assets/textures/blocks/';
            }
            
            // Final fallback construction
            if (!filename.includes('.')) filename += '.png';
            
            img.src = path + filename;
            slotEl.appendChild(img);

            if (item.count > 1) {
                const count = document.createElement('div');
                count.className = 'slot-count';
                count.innerText = item.count;
                slotEl.appendChild(count);
            }
        }
    }

    showPickupNotification(itemType) {
        const el = document.getElementById('pickup-notification');
        el.innerText = `+1 ${itemType.replace(/_/g, ' ')}`;
        el.style.opacity = 1;
        el.style.display = 'block';
        setTimeout(() => {
            el.style.opacity = 0;
        }, 2000);
    }

    showDeathScreen(visible) {
        if (visible) {
            this.deathScreen.classList.remove('hidden');
            document.exitPointerLock();
        } else {
            this.deathScreen.classList.add('hidden');
        }
    }

    // --- INVENTORY MENU ---

    toggleInventory() {
        this.isInventoryOpen = !this.isInventoryOpen;
        if (this.isInventoryOpen) {
            this.inventoryScreen.classList.remove('hidden');
            document.exitPointerLock();
            this.renderInventory();
            this.setupCraftingGrid(false); // Default 2x2
        } else {
            this.inventoryScreen.classList.add('hidden');
            document.body.requestPointerLock();
            // Return items from crafting grid to inventory
            this.clearCraftingGrid();
        }
    }

    setupCraftingGrid(isTable) {
        this.craftingTableActive = isTable;
        this.craftingGridEl.innerHTML = '';
        this.craftingGridEl.className = isTable ? 'crafting-grid table-mode' : 'crafting-grid';
        
        const size = isTable ? 9 : 4;
        
        for (let i = 0; i < size; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.dataset.type = 'craft';
            slot.dataset.index = i;
            slot.addEventListener('mousedown', (e) => this.handleSlotClick(e, 'craft', i));
            this.craftingGridEl.appendChild(slot);
        }

        // Result Slot
        this.craftingResultEl.innerHTML = '';
        this.craftingResultEl.addEventListener('mousedown', (e) => this.craftItem(e));
    }

    renderInventory() {
        this.mainInventoryEl.innerHTML = '';
        // Slots 9-35 (Main)
        for (let i = 9; i < 36; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.dataset.index = i;
            this.updateSlotVisual(slot, this.game.player.inventory[i]);
            slot.addEventListener('mousedown', (e) => this.handleSlotClick(e, 'main', i));
            this.mainInventoryEl.appendChild(slot);
        }

        // Hotbar in Inventory (0-8)
        // We can render them at bottom or just rely on main HUD. 
        // Typically Minecraft shows hotbar at bottom of inventory screen too.
        // For simplicity, we just use main grid. 
        // Let's add the hotbar row to the inventory screen for full management.
        
        const hotbarRow = document.createElement('div');
        hotbarRow.style.marginTop = '15px';
        hotbarRow.style.display = 'flex';
        hotbarRow.style.gap = '4px';
        
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.dataset.index = i;
            this.updateSlotVisual(slot, this.game.player.inventory[i]);
            slot.addEventListener('mousedown', (e) => this.handleSlotClick(e, 'main', i));
            hotbarRow.appendChild(slot);
        }
        this.mainInventoryEl.appendChild(hotbarRow);
    }

    // --- DRAG AND DROP & CLICK LOGIC ---

    handleSlotClick(e, type, index) {
        if (e.button !== 0 && e.button !== 2) return; // Only Left/Right click
        
        const isRightClick = e.button === 2;
        
        // Get actual item from source
        let item = null;
        if (type === 'main') {
            item = this.game.player.inventory[index];
        } else if (type === 'craft') {
            // Crafting grid storage needs to be handled
            // We'll store it in DOM dataset for now or a temp array in UIManager
            if (!this.craftingSlots) this.craftingSlots = new Array(9).fill(null);
            item = this.craftingSlots[index];
        }

        // Logic:
        // 1. Holding nothing, Click item -> Pick up
        // 2. Holding item, Click empty -> Place
        // 3. Holding item, Click same item -> Stack
        // 4. Right click -> Split / Place one

        if (!this.draggedItem) {
            if (item) {
                if (isRightClick) {
                    // Split
                    const take = Math.ceil(item.count / 2);
                    this.draggedItem = { id: item.id, count: take };
                    item.count -= take;
                    if (item.count === 0) this.setItem(type, index, null);
                } else {
                    // Pick up all
                    this.draggedItem = item;
                    this.setItem(type, index, null);
                }
                this.createDragVisual();
            }
        } else {
            if (!item) {
                if (isRightClick) {
                    // Place one
                    this.setItem(type, index, { id: this.draggedItem.id, count: 1 });
                    this.draggedItem.count--;
                    if (this.draggedItem.count === 0) this.clearDrag();
                } else {
                    // Place all
                    this.setItem(type, index, this.draggedItem);
                    this.clearDrag();
                }
            } else {
                if (item.id === this.draggedItem.id) {
                    // Stack
                    if (isRightClick) {
                        // Place one
                        if (item.count < 64) {
                            item.count++;
                            this.draggedItem.count--;
                            if (this.draggedItem.count === 0) this.clearDrag();
                        }
                    } else {
                        // Place all
                        const space = 64 - item.count;
                        const add = Math.min(space, this.draggedItem.count);
                        item.count += add;
                        this.draggedItem.count -= add;
                        if (this.draggedItem.count === 0) this.clearDrag();
                    }
                } else {
                    // Swap
                    const temp = item;
                    this.setItem(type, index, this.draggedItem);
                    this.draggedItem = temp;
                    this.updateDragVisual();
                }
            }
        }

        this.refreshUI();
        if (type === 'craft') this.checkRecipe();
    }

    setItem(type, index, item) {
        if (type === 'main') {
            this.game.player.inventory[index] = item;
        } else if (type === 'craft') {
            if (!this.craftingSlots) this.craftingSlots = new Array(9).fill(null);
            this.craftingSlots[index] = item;
        }
    }

    refreshUI() {
        this.renderInventory();
        // Refresh crafting visual
        const cSlots = this.craftingGridEl.children;
        for (let i = 0; i < cSlots.length; i++) {
            // Check if slot element corresponds to craft slot index
            // Since we rebuild inventory often, we should update crafting carefully
            // Actually, setupCraftingGrid clears it. We only update visual content here.
            this.updateSlotVisual(cSlots[i], this.craftingSlots ? this.craftingSlots[i] : null);
        }
        this.updateHotbar(); // Main HUD
    }

    createDragVisual() {
        if (this.dragElement) document.body.removeChild(this.dragElement);
        this.dragElement = document.createElement('div');
        this.dragElement.className = 'dragging-item slot';
        this.dragElement.style.border = 'none';
        this.dragElement.style.background = 'transparent';
        document.body.appendChild(this.dragElement);
        this.updateDragVisual();
    }

    updateDragVisual() {
        if (!this.draggedItem) return;
        this.updateSlotVisual(this.dragElement, this.draggedItem);
    }

    clearDrag() {
        this.draggedItem = null;
        if (this.dragElement) {
            document.body.removeChild(this.dragElement);
            this.dragElement = null;
        }
    }

    initEventListeners() {
        document.addEventListener('mousemove', (e) => {
            if (this.dragElement) {
                this.dragElement.style.left = e.pageX + 10 + 'px';
                this.dragElement.style.top = e.pageY + 10 + 'px';
            }
        });
    }

    // --- CRAFTING LOGIC ---

    checkRecipe() {
        // Build grid array string for matching
        // Recipes defined as simple patterns
        // We normalize the grid (trim empty rows/cols) or use exact match?
        // Exact match for 2x2 inside 2x2.
        
        const size = this.craftingTableActive ? 3 : 2;
        const grid = [];
        
        // Extract IDs
        let isEmpty = true;
        for(let i=0; i< (size*size); i++) {
            const item = this.craftingSlots ? this.craftingSlots[i] : null;
            grid.push(item ? item.id : null);
            if (item) isEmpty = false;
        }

        if (isEmpty) {
            this.setCraftResult(null);
            return;
        }

        // Recipes Database
        const recipes = [
            // Wood
            { out: {id: 'oak_planks', count: 4}, pattern: ['oak_log'] }, // 1 log = 4 planks (shapeless)
            { out: {id: 'stick', count: 4}, pattern: ['oak_planks', 'oak_planks'], shape: [1, 2] }, // Vertical
            { out: {id: 'crafting_table', count: 1}, pattern: ['oak_planks', 'oak_planks', 'oak_planks', 'oak_planks'], shape: [2, 2] },
            
            // Tools (Pickaxe)
            { out: {id: 'wooden_pickaxe', count: 1}, pattern: ['oak_planks','oak_planks','oak_planks', null, 'stick', null, null, 'stick', null], shape: [3, 3] },
            { out: {id: 'stone_pickaxe', count: 1}, pattern: ['cobblestone','cobblestone','cobblestone', null, 'stick', null, null, 'stick', null], shape: [3, 3] },
            { out: {id: 'diamond_pickaxe', count: 1}, pattern: ['diamond','diamond','diamond', null, 'stick', null, null, 'stick', null], shape: [3, 3] },

            // Torches
            { out: {id: 'torch', count: 4}, pattern: ['coal', 'stick'], shape: [1, 2] } 
        ];

        // Simplistic Matcher: 
        // 1. Shapeless single item (Logs -> Planks)
        // 2. Exact Shape Match
        
        let result = null;

        // Check Shapeless Log
        if (grid.filter(x => x).length === 1 && grid.includes('oak_log')) {
            result = { id: 'oak_planks', count: 4 };
        } 
        // Check Sticks (2 planks vertical)
        else if (size === 2 && grid[0] === 'oak_planks' && grid[2] === 'oak_planks') {
             result = { id: 'stick', count: 4 };
        }
        else if (size === 3 && grid[1] === 'oak_planks' && grid[4] === 'oak_planks') { // Middle col
             result = { id: 'stick', count: 4 };
        }
        // Check Crafting Table (2x2 planks)
        else if (size === 2 && grid.every(x => x === 'oak_planks')) {
             result = { id: 'crafting_table', count: 1 };
        }
        // Check Pickaxe (3x3 only)
        else if (size === 3) {
            // Top row material
            if (grid[0] && grid[0] === grid[1] && grid[1] === grid[2] && grid[4] === 'stick' && grid[7] === 'stick') {
                const mat = grid[0];
                if (mat === 'oak_planks') result = { id: 'wooden_pickaxe', count: 1 };
                if (mat === 'cobblestone') result = { id: 'stone_pickaxe', count: 1 };
                if (mat === 'iron_ingot') result = { id: 'iron_pickaxe', count: 1 };
                if (mat === 'diamond') result = { id: 'diamond_pickaxe', count: 1 };
            }
        }

        this.setCraftResult(result);
    }

    setCraftResult(item) {
        this.craftingResultEl.innerHTML = '';
        if (item) {
            this.craftingResultItem = item;
            this.updateSlotVisual(this.craftingResultEl, item);
            this.craftingResultEl.style.cursor = 'pointer';
        } else {
            this.craftingResultItem = null;
            this.craftingResultEl.style.cursor = 'default';
        }
    }

    craftItem(e) {
        if (!this.craftingResultItem) return;
        
        // Give to mouse
        if (!this.draggedItem) {
            this.draggedItem = this.craftingResultItem;
            this.createDragVisual();
            
            // Consume Ingredients
            // Naive consumption: remove 1 from every slot that has item
            for(let i=0; i<this.craftingSlots.length; i++) {
                if (this.craftingSlots[i]) {
                    this.craftingSlots[i].count--;
                    if (this.craftingSlots[i].count <= 0) this.craftingSlots[i] = null;
                }
            }
            
            this.checkRecipe(); // Update result (likely null now)
            this.refreshUI();
        }
    }
    
    clearCraftingGrid() {
        if (!this.craftingSlots) return;
        for (let i = 0; i < this.craftingSlots.length; i++) {
            if (this.craftingSlots[i]) {
                this.game.player.addItemToInventory(this.craftingSlots[i].id, this.craftingSlots[i].count);
                this.craftingSlots[i] = null;
            }
        }
        this.checkRecipe();
    }
}