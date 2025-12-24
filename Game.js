import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { TextureManager } from './TextureManager.js';
import { InputManager } from './InputManager.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { EntityManager } from './EntityManager.js';
import { UIManager } from './UIManager.js';
import { Utils } from './Utils.js';

export class Game {
    constructor(seed) {
        this.seed = seed;
        
        // --- Core Three.js Components ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky Blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 20, 70); // Depth fog

        this.renderer = new THREE.WebGLRenderer({ antialias: false }); // False for pixel look
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // --- Time ---
        this.clock = new THREE.Clock();
        this.time = 0;

        // --- Audio ---
        this.listener = new THREE.AudioListener();
        this.audioLoader = new THREE.AudioLoader();
        this.sounds = {};

        // --- Systems (Initialized in start) ---
        this.textureManager = new TextureManager();
        this.inputManager = new InputManager();
        this.entityManager = new EntityManager(this);
        // Player, World, UI initialized after textures load
    }

    async start() {
        console.log("Initializing Game Engine...");

        // 1. Load Textures
        await this.textureManager.loadAll();
        
        // 2. Load Sounds (From provided list)
        await this.loadSounds();

        // 3. Init Game Logic
        Utils.setSeed(this.seed);
        
        this.world = new World(this, this.seed);
        this.player = new Player(this); // Player creates Camera
        this.camera = this.player.camera;
        this.scene.add(this.camera);
        this.camera.add(this.listener); // Audio listener on camera

        this.uiManager = new UIManager(this);

        // 4. Lighting
        this.setupLights();

        // 5. Initial Chunk Generation (centered on player)
        this.world.update(this.player.position);
        
        // 6. Start Loop
        this.renderer.setAnimationLoop(() => this.update());
        
        console.log("Game Started!");
    }

    setupLights() {
        // Ambient
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        // Sun (Directional)
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        
        // Shadow Properties (Optimized for Voxel)
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        const d = 50;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        sun.shadow.bias = -0.0005;
        
        this.scene.add(sun);
    }

    async loadSounds() {
        const sPath = 'assets/Sounds/';
        const load = (name, file) => {
            return new Promise((resolve) => {
                this.audioLoader.load(sPath + file, (buffer) => {
                    this.sounds[name] = buffer;
                    resolve();
                }, undefined, () => {
                    console.warn(`Sound missing: ${file}`);
                    resolve(); // Continue even if missing
                });
            });
        };

        // Loading provided sounds
        // Note: Using 'Water pop.ogg' for general interaction since it's a short clip
        await Promise.all([
            load('lava', 'Lava.ogg'),
            load('splash', 'splash.ogg'),
            load('pop', 'Water pop.ogg'), 
            load('water', 'Water.ogg')
        ]);
        
        // Aliases for missing specific sounds (using available ones to prevent silence)
        this.sounds['dig'] = this.sounds['pop']; 
        this.sounds['place'] = this.sounds['pop'];
    }

    playSound(id) {
        if (this.sounds[id]) {
            const sound = new THREE.Audio(this.listener);
            sound.setBuffer(this.sounds[id]);
            // Randomize pitch slightly for realism
            sound.setDetune((Math.random() - 0.5) * 200); 
            sound.setVolume(0.5);
            sound.play();
        }
    }

    update() {
        const dt = Math.min(this.clock.getDelta(), 0.1); // Cap dt to prevent huge jumps
        this.time += dt;

        // 1. Systems Update
        if (this.player) this.player.update(dt);
        if (this.entityManager) this.entityManager.update(dt);
        if (this.world && this.player) this.world.update(this.player.position);

        // 2. Input Reset
        this.inputManager.resetFrame();

        // 3. UI Stats
        this.updateDebugInfo();

        // 4. Render
        if (this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    updateDebugInfo() {
        if (!this.player) return;
        
        const coordEl = document.getElementById('coords');
        const fpsEl = document.getElementById('fps');
        
        const x = Math.floor(this.player.position.x);
        const y = Math.floor(this.player.position.y);
        const z = Math.floor(this.player.position.z);
        
        coordEl.innerText = `X: ${x} Y: ${y} Z: ${z}`;
        // Simple FPS approximation
        fpsEl.innerText = `FPS: ${Math.round(1 / this.clock.getDelta()) || 60}`;
    }

    onWindowResize() {
        if (this.camera) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}