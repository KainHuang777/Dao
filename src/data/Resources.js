import CSVLoader from '../utils/CSVLoader.js';
import PlayerManager from '../utils/PlayerManager.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class ResourceManager {
    constructor() {
        this.resources = {};
        this.accumulators = {};
        this.manualGatherAmount = {};
        this.isLoaded = false;
        this.everObtained = new Set(); // 追蹤曾經獲得的資源
    }

    /**
     * 初始化資源資料
     */
    async init() {
        if (this.isLoaded) return;

        console.log('Loading Resources...');
        const rawData = await CSVLoader.loadCSV('./src/data/Resources.csv');

        if (rawData.length > 0) {
            this.resources = CSVLoader.convertToResources(rawData);
            // 儲存原始資料複本，用於重新計算基數
            this.baseData = JSON.parse(JSON.stringify(this.resources));
            console.log(`✅ 成功載入 ${Object.keys(this.resources).length} 個資源`);
        } else {
            console.warn('⚠️ Resources.csv 為空，使用預設資源');
            this.resources = this.getDefaultResources();
            this.baseData = JSON.parse(JSON.stringify(this.resources));
        }

        // 初始化累加器與採集量
        Object.keys(this.resources).forEach(key => {
            this.accumulators[key] = 0;
            if (this.resources[key].type === 'basic') {
                this.manualGatherAmount[key] = 1;
            }
        });

        this.isLoaded = true;
    }

    getBaseData() {
        return this.baseData || {};
    }

    getDefaultResources() {
        return {
            lingli: { name: '靈力', value: 0, max: 100, rate: 0.2, type: 'basic', unlocked: true },
            money: { name: '金錢', value: 0, max: 1000, rate: 0.1, type: 'basic', unlocked: true },
            wood: { name: '靈木', value: 0, max: 500, rate: 0.1, type: 'basic', unlocked: true },
            stone: { name: '靈石', value: 0, max: 500, rate: 0.1, type: 'basic', unlocked: true },
            herb: { name: '藥草', value: 0, max: 200, rate: 0.1, type: 'basic', unlocked: true }
        };
    }
    // 每一幀更新資源
    update(deltaTime) {
        if (!this.isLoaded) return;

        // 檢查是否壽元已盡 (Request 4)
        if (PlayerManager.isLifespanExhausted()) {
            if (!PlayerManager.state.isReincarnating) {
                PlayerManager.setIsReincarnating(true);
                PlayerManager.setStartTimestamp(Date.now());
                console.log('壽元已盡，重置當前境界進度');
            }
            return;
        }

        // 計算靈力消耗: (Era-1)*10 + Lv - 2 點/秒
        // 新公式設計：
        // - Era 1, Lv 1: 0+1-2 = -1 (補償1點，確保初期正增長)
        // - Era 1, Lv 9: 0+9-2 = 7 (茅屋Lv10產出12.1，淨產率+5.1)
        // - Era 2, Lv 1: 10+1-2 = 9 (需要更多建築支持)
        // 這樣在同一境界內消耗線性增長，而非二次增長，更容易平衡
        const currentEra = PlayerManager.getEraId();
        const currentLevel = PlayerManager.getLevel();
        const lingliConsumption = (currentEra - 1) * 10 + currentLevel - 2;

        // 扣除靈力消耗
        const lingliRes = this.resources['lingli'];
        if (lingliRes && lingliRes.unlocked) {
            // Note: lingliConsumption can be negative (e.g. -1), meaning it adds to lingli.
            const consumption = lingliConsumption * deltaTime;
            lingliRes.value -= consumption;
            // 靈力不能為負數
            if (lingliRes.value < 0) lingliRes.value = 0;
            // 靈力也不能超過上限
            if (lingliRes.value > lingliRes.max) lingliRes.value = lingliRes.max;
        }

        for (const [key, res] of Object.entries(this.resources)) {
            if (res.unlocked && res.rate !== 0) {
                const increase = res.rate * deltaTime;
                res.value += increase;
                if (res.value > res.max) res.value = res.max;
                if (res.value < 0) res.value = 0;

                // 標記曾經獲得的資源
                if (res.value > 0 && !this.everObtained.has(key)) {
                    this.markAsObtained(key);
                }
            }
        }
    }

    getResource(key) {
        return this.resources[key];
    }

    getAllResources() {
        return this.resources;
    }

    // 只返回已解鎖的資源
    getUnlockedResources() {
        const currentEraId = PlayerManager.getEraId();
        const learnedSkills = PlayerManager.getLearnedSkills();
        const unlocked = {};

        for (const [key, res] of Object.entries(this.resources)) {
            // 如果滿足前置條件則自動解鎖 (Request 3)
            if (!res.unlocked) {
                let eraMet = !res.prereqEra || currentEraId >= res.prereqEra;
                let skillsMet = !res.prereqSkill || !!learnedSkills[res.prereqSkill];

                if (eraMet && skillsMet) {
                    res.unlocked = true;
                }
            }

            if (res.unlocked) {
                unlocked[key] = res;
            }
        }
        return unlocked;
    }

    // 解鎖資源
    unlockResource(key) {
        if (this.resources[key]) {
            this.resources[key].unlocked = true;
            return true;
        }
        return false;
    }

    // 手動採集資源
    manualGather(key) {
        const res = this.resources[key];
        if (!res || !res.unlocked || res.type !== 'basic') {
            return false;
        }

        const amount = this.manualGatherAmount[key] || 1;
        res.value += amount;
        if (res.value > res.max) {
            res.value = res.max;
        }

        // 標記為已獲得
        if (!this.everObtained.has(key)) {
            this.markAsObtained(key);
        }

        return true;
    }

    addResource(key, amount) {
        if (this.resources[key] && this.resources[key].unlocked) {
            this.resources[key].value += amount;
            if (this.resources[key].value > this.resources[key].max) {
                this.resources[key].value = this.resources[key].max;
            }
        }
    }

    // 檢查是否有足夠的資源進行合成
    canCraft(key, count = 1) {
        const res = this.resources[key];
        if (!res || res.type !== 'crafted' || !res.unlocked || !res.recipe) {
            return false;
        }

        // 產物空間檢查
        if (res.value + count > res.max) {
            return false;
        }

        for (const [ingredientKey, amount] of Object.entries(res.recipe)) {
            const ingredient = this.resources[ingredientKey];
            if (!ingredient || !ingredient.unlocked || ingredient.value < amount * count) {
                return false;
            }
        }
        return true;
    }

    // 合成資源
    craft(key, count = 1) {
        const res = this.resources[key];
        // 基礎檢查：是否是合成資源、配方是否存在
        if (!res || res.type !== 'crafted' || !res.unlocked || !res.recipe) {
            return false;
        }

        // 1. 根據材料庫存計算最大可合成數量
        let maxAffordable = Number.MAX_SAFE_INTEGER;
        for (const [ingredientKey, amount] of Object.entries(res.recipe)) {
            const ingredient = this.resources[ingredientKey];
            // 若缺材料或根本不夠合成 1 個，直接失敗
            if (!ingredient || !ingredient.unlocked || ingredient.value < amount) {
                return false;
            }
            if (amount > 0) {
                const affordable = Math.floor(ingredient.value / amount);
                if (affordable < maxAffordable) {
                    maxAffordable = affordable;
                }
            }
        }

        // 修正請求數量：不能超過材料能負擔的最大值
        if (count > maxAffordable) {
            count = maxAffordable;
            // 如果修正後為 0 (由上方檢查理應不會發生，但防禦性編程)
            if (count <= 0) return false;
        }

        // 2. 檢查產物空間 (Output Storage) - 暫時不考慮爆擊，先用基礎數量檢查
        if (res.value + count > res.max) {
            count = Math.floor(res.max - res.value); // 確保是整數
            if (count <= 0) return false;
        }

        // 3. 執行扣款 (Deduct ingredients)
        for (const [ingredientKey, amount] of Object.entries(res.recipe)) {
            this.resources[ingredientKey].value -= amount * count;
        }

        // 4. 爆擊系統：計算最終產出數量
        let finalCount = count;
        let criticalMultiplier = 1;
        const random = Math.random();

        if (random < 0.05) {
            // 5% 機率 3倍
            criticalMultiplier = 3;
        } else if (random < 0.15) {
            // 10% 機率 2倍 (0.05 + 0.10 = 0.15)
            criticalMultiplier = 2;
        }

        finalCount = count * criticalMultiplier;

        // 檢查爆擊後是否超過容量上限
        if (res.value + finalCount > res.max) {
            finalCount = Math.floor(res.max - res.value);
        }

        // 5. 增加產物 (Add product)
        res.value += finalCount;

        // 6. 如果發生爆擊，記錄到日誌
        if (criticalMultiplier > 1 && window.game && window.game.uiManager) {
            const resName = LanguageManager.getInstance().t(res.name);
            const critMsg = LanguageManager.getInstance().t('⚡【合成爆擊 ×{0}】', { '0': criticalMultiplier }) +
                ` ${resName} ×${count} → <span style="color:#4caf50">×${finalCount}</span>`;
            window.game.uiManager.addLog(critMsg);
        }

        return true;
    }

    // 用於存檔載入
    loadData(savedResources) {
        if (!savedResources) return;
        for (const key in savedResources) {
            if (this.resources[key]) {
                this.resources[key].value = savedResources[key].value;
                // 載入解鎖狀態
                if (savedResources[key].unlocked !== undefined) {
                    this.resources[key].unlocked = savedResources[key].unlocked;
                }
                // 可能還需要載入 rate 和 max，如果這些會動態改變
                if (savedResources[key].max) this.resources[key].max = savedResources[key].max;
                if (savedResources[key].rate !== undefined) this.resources[key].rate = savedResources[key].rate;

                // 載入「曾經獲得」狀態
                if (savedResources[key].everObtained) {
                    this.everObtained.add(key);
                }
            }
        }
    }

    // 用於存檔導出
    exportData() {
        const data = {};
        for (const [key, res] of Object.entries(this.resources)) {
            data[key] = {
                ...res,
                everObtained: this.everObtained.has(key)
            };
        }
        return data;
    }

    reset() {
        Object.keys(this.resources).forEach(key => {
            const res = this.resources[key];
            const base = this.baseData[key];

            // 重置數值
            res.value = 0;

            // 重置產出率和上限為初始值
            if (base) {
                res.rate = base.rate;
                res.max = base.max;
            }

            // 重置解鎖狀態（除了基礎資源）
            if (res.type !== 'basic') {
                res.unlocked = false;
            }
        });
        this.everObtained.clear(); // 清除「曾經獲得」記錄
    }

    /**
     * 標記資源為已獲得
     */
    markAsObtained(key) {
        this.everObtained.add(key);
    }

    /**
     * 檢查資源是否應該顯示
     */
    shouldDisplay(key) {
        const res = this.resources[key];
        if (!res || !res.unlocked) return false;

        // 如果曾經獲得過，永遠顯示
        if (this.everObtained.has(key)) return true;

        // 如果當前值 > 0，標記為已獲得並顯示
        if (res.value > 0) {
            this.markAsObtained(key);
            return true;
        }

        return false;
    }
}
