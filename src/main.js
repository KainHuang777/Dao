// src/main.js
import GameLoop from './utils/gameLoop.js';
import ResourceManager from './data/Resources.js';
import BuildingManager from './utils/BuildingManager.js';
import UIManager from './views/MainView.js';
import SaveSystem from './utils/saveSystem.js';
import { loadBuildings } from './data/Buildings.js';
import EraManager from './utils/EraManager.js';
import SkillManager from './utils/SkillManager.js';
import SectManager from './utils/SectManager.js';
import PixiApp from './views/pixi/PixiApp.js';

class Game {
    constructor() {
        this.resourceManager = new ResourceManager();
        this.buildingManager = new BuildingManager(this.resourceManager);
        this.saveSystem = new SaveSystem(this);
        this.uiManager = new UIManager(this);
        this.pixiApp = new PixiApp(); // Pixi.js 特效渲染器
        this.gameLoop = new GameLoop(this.update.bind(this));

        this.lastTime = Date.now();
        this.accumulatedTime = 0;
    }

    async init() {
        console.log('Game Initializing...');

        // 核心資料非同步載入
        try {
            // 1. 先載入資源定義
            await this.resourceManager.init();

            // 2. 載入時代與功法
            await EraManager.init();
            await SkillManager.init();

            // 3. 載入建築資料 CSV 並初始化狀態
            await loadBuildings();
            this.buildingManager.init();

            console.log('✅ 所有 CSV 資料載入完成');
        } catch (error) {
            console.error('❌ 初始化失敗:', error);
        }

        // 嘗試讀取存檔
        const savedData = this.saveSystem.loadFromStorage();
        if (savedData) {
            if (savedData.player) {
                const { default: PlayerManager } = await import('./utils/PlayerManager.js');
                PlayerManager.loadData(savedData.player);
            }
            this.resourceManager.loadData(savedData.resources);
            if (savedData.buildings) {
                this.buildingManager.loadData(savedData.buildings);
            }
            if (savedData.sect) {
                SectManager.loadData(savedData.sect);
            }
            console.log('Loaded save data.');
        }

        await this.uiManager.init();

        // 初始化 Pixi.js 特效層
        const appContainer = document.getElementById('app');
        if (appContainer) {
            await this.pixiApp.init(appContainer);
            this.uiManager.updatePlayerInfo();
        }

        this.gameLoop.start();

        // Initialize header contact info
        this.initHeaderContactInfo();

        // 自動存檔 (每分鐘)
        setInterval(() => {
            this.saveSystem.saveToStorage();
        }, 60000);
    }

    update(deltaTime) {
        // Core game logic update
        // 資源產出
        this.resourceManager.update(deltaTime);

        // 宗門系統與計時器
        SectManager.update(deltaTime);

        // UI 更新
        this.uiManager.update();
    }

    initHeaderContactInfo() {
        const container = document.getElementById('header-contact-info');
        if (!container) return;

        const lang = this.uiManager.languageManager;

        container.innerHTML = `
            <span>📧 kainjalos@gmail.com</span>
            <span style="color: #555;">|</span>
            <a href="https://www.reddit.com/r/incremental_games/" target="_blank" style="color: #ff4500; text-decoration: none;">🔗 Reddit</a>
            <span style="color: #555;">|</span>
            <a href="https://www.facebook.com/kain.huang/" target="_blank" style="color: #4267B2; text-decoration: none;">🔗 Facebook</a>
            <span style="color: #555;">|</span>
            <span>💬 QQ: 1182218525</span>
            <span style="color: #555;">|</span>
            <span style="color: #ff6b6b;">Antigravity</span>
        `;
    }
}

// Global instance
window.game = new Game();
window.game.init();
