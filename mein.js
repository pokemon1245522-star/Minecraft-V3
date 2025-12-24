import { Game } from './Game.js';

// Global Game Instance
let game;

document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const startMenu = document.getElementById('start-menu');
    const loadingText = document.getElementById('loading-text');
    const loadingBar = document.getElementById('loading-bar');
    const seedInput = document.getElementById('seed-input');
    const randomSeedBtn = document.getElementById('random-seed-btn');
    const startBtn = document.getElementById('start-btn');
    const respawnBtn = document.getElementById('respawn-btn');

    // 1. Simulate Asset Loading (Visual only, real loading happens in TextureManager)
    let loadProgress = 0;
    const loadInterval = setInterval(() => {
        loadProgress += Math.random() * 10;
        if (loadProgress >= 100) {
            loadProgress = 100;
            clearInterval(loadInterval);
            
            // Show Start Menu
            loadingBar.style.width = '100%';
            loadingText.style.display = 'none';
            document.getElementById('loading-bar-container').style.display = 'none';
            startMenu.style.display = 'flex';
        } else {
            loadingBar.style.width = `${loadProgress}%`;
        }
    }, 100);

    // 2. Random Seed Generator
    randomSeedBtn.addEventListener('click', () => {
        const randomSeed = Math.floor(Math.random() * 999999999).toString();
        seedInput.value = randomSeed;
    });

    // 3. Start Game Logic
    startBtn.addEventListener('click', () => {
        // Parse Seed
        let seedVal = seedInput.value.trim();
        let seedNumber;

        if (!seedVal) {
            // Generate random if empty
            seedNumber = Math.floor(Math.random() * 2147483647);
        } else {
            // Hash string to number or use number directly
            if (/^\d+$/.test(seedVal)) {
                seedNumber = parseInt(seedVal, 10);
            } else {
                // Simple string hash
                seedNumber = 0;
                for (let i = 0; i < seedVal.length; i++) {
                    seedNumber = ((seedNumber << 5) - seedNumber) + seedVal.charCodeAt(i);
                    seedNumber |= 0;
                }
            }
        }
        
        console.log(`Starting Game with Seed: ${seedNumber}`);
        document.getElementById('seed-display').innerText = seedNumber;

        // Init Game
        initGame(seedNumber);
        
        // Hide UI
        loadingScreen.style.display = 'none';
        
        // Request Pointer Lock
        document.body.requestPointerLock();
    });

    // 4. Respawn Logic
    respawnBtn.addEventListener('click', () => {
        if (game) {
            game.player.respawn();
            document.getElementById('death-screen').classList.add('hidden');
            document.body.requestPointerLock();
        }
    });

    // 5. Initialize Engine
    function initGame(seed) {
        if (game) return; // Prevent double init
        
        game = new Game(seed);
        game.start();

        // Handle Resize
        window.addEventListener('resize', () => {
            game.onWindowResize();
        });
    }
});