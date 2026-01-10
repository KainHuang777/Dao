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

class Game {
    constructor() {
        this.resourceManager = new ResourceManager();
        this.buildingManager = new BuildingManager(this.resourceManager);
        this.saveSystem = new SaveSystem(this);
        this.uiManager = new UIManager(this);
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
        this.gameLoop.start();

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
}

// Global instance
window.game = new Game();
window.game.init();
