export const Utils = {
    
    // --- Seeded Random Number Generator ---
    _seed: 12345,
    
    setSeed: function(seed) {
        this._seed = seed;
    },

    // Returns float 0-1
    random: function() {
        this._seed = (this._seed * 9301 + 49297) % 233280;
        return this._seed / 233280;
    },

    // Returns int between min and max
    randomInt: function(min, max) {
        return Math.floor(this.random() * (max - min + 1) + min);
    },

    // --- Deterministic Noise (Simulated Perlin) ---
    // Returns -1 to 1
    noise2D: function(x, z, seed) {
        // Simple consistent hash based on coordinates and seed
        // This ensures the same world generates every time for the same seed
        const s = Math.sin(x * 12.9898 + z * 78.233 + seed * 0.5) * 43758.5453;
        return s - Math.floor(s);
    },

    // Smoother noise for terrain
    getSmoothNoise: function(x, z, seed) {
        const corners = (this.noise2D(x-1, z-1, seed) + this.noise2D(x+1, z-1, seed) + this.noise2D(x-1, z+1, seed) + this.noise2D(x+1, z+1, seed)) / 16;
        const sides = (this.noise2D(x-1, z, seed) + this.noise2D(x+1, z, seed) + this.noise2D(x, z-1, seed) + this.noise2D(x, z+1, seed)) / 8;
        const center = this.noise2D(x, z, seed) / 4;
        return (corners + sides + center) * 2; // Normalize roughly to -1..1
    },

    // --- Helpers ---
    getChunkCoords: (x, z) => {
        return {
            x: Math.floor(x / 16),
            z: Math.floor(z / 16)
        };
    },

    getVoxelKey: (x, y, z) => {
        return `${x},${y},${z}`;
    },

    generateUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};