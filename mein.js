// main.js - CORRECTED IMPORT PATH
import { Game } from './Game.js'; // Ensure this points to ./Game.js, NOT ./modules/Game.js

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

    // 1. Simulate Asset Loading
    let loadProgress = 0;
    const loadInterval = setInterval(() => {
        loadProgress += Math.random() * 10;
        if (loadProgress >= 100) {
            loadProgress = 100;
            clearInterval(loadInterval);
            
            // Show Start Menu
            if(loadingBar) loadingBar.style.width = '100%';
            if(loadingText) loadingText.style.display = 'none';
            if(document.getElementById('loading-bar-container')) document.getElementById('loading-bar-container').style.display = 'none';
            if(startMenu) startMenu.style.display = 'flex';
        } else {
            if(loadingBar) loadingBar.style.width = `${loadProgress}%`;
        }
    }, 100);

    // 2. Random Seed Generator
    if(randomSeedBtn) {
        randomSeedBtn.addEventListener('click', () => {
            const randomSeed = Math.floor(Math.random() * 999999999).toString();
            seedInput.value = randomSeed;
        });
    }

    // 3. Start Game Logic
    if(startBtn) {
        startBtn.addEventListener('click', () => {
            // Parse Seed
            let seedVal = seedInput ? seedInput.value.trim() : "";
            let seedNumber;

            if (!seedVal) {
                seedNumber = Math.floor(Math.random() * 2147483647);
            } else {
                if (/^\d+$/.test(seedVal)) {
                    seedNumber = parseInt(seedVal, 10);
                } else {
                    seedNumber = 0;
                    for (let i = 0; i < seedVal.length; i++) {
                        seedNumber = ((seedNumber << 5) - seedNumber) + seedVal.charCodeAt(i);
                        seedNumber |= 0;
                    }
                }
            }
            
            console.log(`Starting Game with Seed: ${seedNumber}`);
            const seedDisp = document.getElementById('seed-display');
            if(seedDisp) seedDisp.innerText = seedNumber;

            initGame(seedNumber);
            
            if(loadingScreen) loadingScreen.style.display = 'none';
            document.body.requestPointerLock();
        });
    }

    // 4. Respawn Logic
    if(respawnBtn) {
        respawnBtn.addEventListener('click', () => {
            if (game) {
                game.player.respawn();
                document.getElementById('death-screen').classList.add('hidden');
                document.body.requestPointerLock();
            }
        });
    }

    // 5. Initialize Engine
    function initGame(seed) {
        if (game) return;
        game = new Game(seed);
        game.start();

        window.addEventListener('resize', () => {
            game.onWindowResize();
        });
    }
});
