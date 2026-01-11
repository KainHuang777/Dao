
import PlayerManager from './PlayerManager.js';
import LanguageManager from './LanguageManager.js';

// ============== Task Rarity Configuration ==============
const TASK_RARITY = {
    common: { key: 'common', color: '#cccccc', weight: 40, rewardMult: 1.0, nameKey: 'rarity_common' },
    uncommon: { key: 'uncommon', color: '#4caf50', weight: 30, rewardMult: 1.5, nameKey: 'rarity_uncommon' },
    rare: { key: 'rare', color: '#2196f3', weight: 18, rewardMult: 2.0, nameKey: 'rarity_rare' },
    epic: { key: 'epic', color: '#9c27b0', weight: 10, rewardMult: 3.0, nameKey: 'rarity_epic' },
    legendary: { key: 'legendary', color: '#ff9800', weight: 2, rewardMult: 5.0, nameKey: 'rarity_legendary', special: true }
};

// ============== Reward Pools by Era ==============
// Each pool defines resources available at that rarity level
// 'min' and 'max' are base values before rarity multiplier
const REWARD_POOLS = {
    // Era 1: 練氣期
    1: {
        common: [{ id: 'money', min: 50, max: 100 }],
        uncommon: [{ id: 'money', min: 80, max: 150 }, { id: 'stone_low', min: 1, max: 2 }],
        rare: [{ id: 'money', min: 100, max: 200 }, { id: 'stone_low', min: 10, max: 20 }, { id: 'spirit_grass_low', min: 1, max: 2 }],
        epic: [{ id: 'money', min: 150, max: 300 }, { id: 'stone_low', min: 3, max: 5 }, { id: 'talisman', min: 1, max: 2 }],
        legendary: [{ id: 'money', min: 200, max: 400 }, { id: 'stone_low', min: 5, max: 10 }, { special: 'reduce_training_time', value: 0.33 }]
    },
    // Era 2: 築基期
    2: {
        common: [{ id: 'money', min: 200, max: 400 }, { id: 'stone_low', min: 2, max: 5 }],
        uncommon: [{ id: 'money', min: 350, max: 600 }, { id: 'stone_low', min: 5, max: 10 }, { id: 'spirit_grass_low', min: 2, max: 4 }],
        rare: [{ id: 'money', min: 500, max: 800 }, { id: 'beast_hide_low', min: 20, max: 40 }, { id: 'beast_bone_low', min: 20, max: 40 }],
        epic: [{ id: 'money', min: 700, max: 1200 }, { id: 'beast_crystal_low', min: 3, max: 5 }, { id: 'refined_iron', min: 30, max: 50 }],
        legendary: [{ id: 'beast_crystal_low', min: 3, max: 5 }, { id: 'refined_iron', min: 50, max: 80 }, { special: 'reduce_training_time', value: 0.33 }]
    },
    // Era 3: 金丹期
    3: {
        common: [{ id: 'money', min: 500, max: 1000 }, { id: 'stone_low', min: 10, max: 20 }],
        uncommon: [{ id: 'money', min: 800, max: 1500 }, { id: 'stone_mid', min: 1, max: 2 }, { id: 'liquid', min: 10, max: 20 }],
        rare: [{ id: 'money', min: 1000, max: 2000 }, { id: 'stone_mid', min: 2, max: 4 }, { id: 'talisman', min: 2, max: 4 }, { id: 'spirit_grass_100y', min: 40, max: 60 }],
        epic: [{ id: 'money', min: 1500, max: 3000 }, { id: 'stone_mid', min: 3, max: 5 }, { id: 'monster_core_low', min: 5, max: 10 }, { id: 'spirit_grass_100y', min: 80, max: 120 }],
        legendary: [{ id: 'stone_mid', min: 5, max: 10 }, { id: 'monster_core_low', min: 10, max: 15 }, { special: 'reduce_training_time', value: 0.33 }]
    },
    // Era 4: 元嬰期
    4: {
        common: [{ id: 'money', min: 1500, max: 3000 }, { id: 'stone_mid', min: 2, max: 4 }],
        uncommon: [{ id: 'money', min: 2500, max: 5000 }, { id: 'stone_mid', min: 4, max: 8 }, { id: 'spirit_grass_100y', min: 10, max: 20 }],
        rare: [{ id: 'money', min: 3500, max: 7000 }, { id: 'beast_hide_mid', min: 30, max: 50 }, { id: 'beast_bone_mid', min: 30, max: 50 }],
        epic: [{ id: 'money', min: 5000, max: 10000 }, { id: 'mithril', min: 40, max: 60 }, { id: 'cold_iron', min: 40, max: 60 }],
        legendary: [{ id: 'mithril', min: 80, max: 100 }, { id: 'cold_iron', min: 80, max: 100 }, { special: 'reduce_training_time', value: 0.33 }]
    },
    // Era 5+: 化神期以上
    5: {
        common: [{ id: 'money', min: 5000, max: 10000 }, { id: 'stone_mid', min: 5, max: 10 }],
        uncommon: [{ id: 'money', min: 8000, max: 15000 }, { id: 'stone_high', min: 1, max: 2 }, { id: 'spirit_grass_1000y', min: 8, max: 15 }],
        rare: [{ id: 'money', min: 10000, max: 20000 }, { id: 'beast_crystal_mid', min: 15, max: 30 }, { id: 'spirit_jade', min: 15, max: 25 }],
        epic: [{ id: 'money', min: 15000, max: 30000 }, { id: 'stone_high', min: 5, max: 10 }, { id: 'monster_core_mid', min: 10, max: 20 }],
        legendary: [{ id: 'stone_high', min: 10, max: 20 }, { id: 'monster_core_mid', min: 20, max: 30 }, { special: 'reduce_training_time', value: 0.33 }]
    }
};

// ============== Cloud Sea Market Configuration ==============
const MARKET_ITEMS = {
    // Era 4
    'foundation_pill': { id: 'foundation_pill', cost: 100, era: 4, limit: 5 },
    'spirit_grass_100y': { id: 'spirit_grass_100y', cost: 20, era: 3, limit: 50 },
    // Era 5
    'spirit_jade': { id: 'spirit_jade', cost: 200, era: 5, limit: 10 },
    'monster_core_mid': { id: 'monster_core_mid', cost: 150, era: 5, limit: 20 },
    // Special
    'sect_high_golden_pill': { id: 'sect_high_golden_pill', cost: 300, era: 4, limit: 3 }
};

// ============== Sect Events Configuration ==============
const SECT_EVENTS = {
    'alchemy_symposium': {
        id: 'alchemy_symposium',
        name: '丹道盛會',
        desc: '宗門徵求特定丹藥，獎勵大量貢獻。',
        duration: 300000, // 5 mins
        type: 'submission', // Submit items
        targets: ['foundation_pill', 'golden_core_pill'],
        rewardRatio: 5,
        batchSize: 1,
        limit: 10
    },
    'cloud_caravans': {
        id: 'cloud_caravans',
        name: '雲遊商隊',
        desc: '神秘商隊高價收購基礎資源。',
        duration: 300000,
        type: 'trade',
        targets: ['refined_iron', 'spirit_grass_low', 'wood'],
        rewardRatio: 0.5, // Resource value * 0.5 (high for basic resources)
        batchSize: 50,
        limit: 20
    }
};


// Helper: pick rarity based on weighted random
function pickRarity() {
    const totalWeight = Object.values(TASK_RARITY).reduce((sum, r) => sum + r.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const [key, rarity] of Object.entries(TASK_RARITY)) {
        roll -= rarity.weight;
        if (roll <= 0) return rarity;
    }
    return TASK_RARITY.common; // fallback
}

// Helper: generate reward based on era and rarity
function generateReward(era, rarity) {
    // Clamp era to available pools
    const poolEra = Math.min(era, 5);
    const pool = REWARD_POOLS[poolEra]?.[rarity.key] || REWARD_POOLS[1].common;

    const reward = {};
    let specialEffect = null;

    for (const item of pool) {
        if (item.special) {
            specialEffect = { type: item.special, value: item.value };
        } else {
            // Random amount between min and max, scaled by era difference if era > 5
            const eraScale = era > 5 ? Math.pow(1.5, era - 5) : 1;
            const baseAmount = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min;
            const finalAmount = Math.floor(baseAmount * eraScale);
            reward[item.id] = finalAmount;
        }
    }

    return { reward, specialEffect };
}

class SectManager {
    constructor() {
        this.storageKey = 'sectState';
        this.defaultState = {
            sectLevel: 1,
            developmentPoints: 0,
            contributionCount: 3,
            nextContributionReset: Date.now() + 10800000, // 3 hours
            tasks: [],
            activeTask: null, // { id, name, type, duration, startTime, reward }
            nextTaskRefresh: Date.now(), // Refresh immediately on first load
            history: [], // Log history for sect
            unlockedRecipes: {}, // 已購買的丹方 { recipeId: true }
            itemPurchaseCounts: {}, // 商店物品購買次數 { itemId: count }
            playerContribution: 0, // 玩家個人貢獻點 (貨幣)
            marketPurchaseCounts: {}, // 雲海天市購買次數 { itemId: count }
            activeEvent: null, // 當前活動事件 { id, endTime, target, ... }
            nextEventTime: Date.now() + 3600000, // Next event in 1 hour
            nextMarketReset: Date.now() + 21600000 // 6 hours
        };
        this.state = this.loadState();

        // Configs
        this.maxLevel = 5;
        this.maxContribution = 3;
        this.resetInterval = 10800000; // 3 hours in ms
        this.taskInterval = 10800000; // 3 hours in ms
        this.marketResetInterval = 21600000; // 6 hours in ms
    }

    loadState() {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                return { ...this.defaultState, ...parsed };
            } catch (e) {
                console.warn('SectManager: Failed to parse save, using default.');
            }
        }
        return { ...this.defaultState };
    }

    saveState() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    }

    exportData() {
        return { ...this.state };
    }

    loadData(data) {
        if (!data) return;
        this.state = { ...this.defaultState, ...data };
        this.saveState();
    }

    reset() {
        this.state = {
            ...this.defaultState,
            nextContributionReset: Date.now() + this.resetInterval,
            nextTaskRefresh: Date.now()
        };
        this.saveState();
    }

    getSectLevel() {
        return this.state.sectLevel;
    }

    update(dt) {
        const now = Date.now();

        // 1. Contribution Reset
        if (now >= this.state.nextContributionReset) {
            this.state.contributionCount = this.maxContribution;
            this.state.nextContributionReset = now + this.resetInterval;
            this.saveState();
        }

        // 2. Task Refresh
        if (now >= this.state.nextTaskRefresh) {
            this.refreshTasks();
            this.state.nextTaskRefresh = now + this.taskInterval;
            this.saveState();
        }

        // 3. Active Task Check
        // No auto-completing, user needs to click 'complete' or we just show 'ready' in UI.

        // 4. Event System Check
        if (!this.state.activeEvent && now >= this.state.nextEventTime) {
            this.triggerRandomEvent();
        } else if (this.state.activeEvent && now >= this.state.activeEvent.endTime) {
            this.endEvent();
        }

        // 5. Market Reset
        if (now >= this.state.nextMarketReset) {
            this.refreshMarket();
        }
    }

    // --- Contribution System ---

    getRequiredDevelopment() {
        // Simple scaling: Level * 1000? Or more complex?
        // User said: "Expected to reach LV1 in Nascent Soul (12h real time)"
        // If 3 contributions every 3 hours = 1 contribution / hour.
        // 12 hours = 12 contributions.
        // So LV1 -> LV2 might need ~30-50 contributions?
        // Wait, "reach LV1" usually means "finish LV1 construction to reach LV2" or "start at LV0"?
        // Text says "Sect Level Max 5", "Expected... complete LV1 construction".
        // Let's assume starting at LV1, needing to fill bar to reach LV2.
        // 12 hours = 4 cycles * 3 attempts = 12 attempts.
        // So LV1 req should be around 10-15 points if 1 point per contribution.
        // Make it 120 points, each contribution gives 10.

        const reqs = {
            1: 100, // 10 attempts (30 hours if only doing this, but maybe task rewards give points too?)
            // User said: "Expected serious play... complete LV1 construction in Nascent Soul"
            // Nascent Soul is Era 4. Era 1->2 (10m), 2->3 (?), 3->4 (?).
            // 12h is a lot.
            // Let's stick to 120 (12 contributions = 12h perfect play).
            2: 300,
            3: 600,
            4: 1000,
            5: 2000
        };
        return reqs[this.state.sectLevel] || 99999;
    }

    getContributionCost() {
        const era = PlayerManager.getEraId();
        const baseMoney = 100 * Math.pow(5, era - 1); // 100, 500, 2500...

        let resources = {};

        if (era <= 2) {
            // Era 2 (Foundation): Spirit Stones + Wood/Stone
            resources = {
                'money': baseMoney,
                'wood': 100,
                'stone_low': 100
            };
        } else if (era === 3) {
            // Era 3 (Golden Core): Spirit Stones + Liquid/Monster Core
            // NOTE: 'liquid' and 'monster_core_low' are available? 
            // Using IDs from Resources.csv: 'liquid', 'beast_crystal_low' (or mid?)
            // Checking implementation plan: "Era 3 (Golden Core): Spirit Stones + Synthetic (Liquid/Core)"
            resources = {
                'money': baseMoney,
                'liquid': 10,
                'beast_crystal_low': 5 // Assuming low is available/craftable
            };
        } else {
            // Era 4+: Advanced
            // Just scaling money for now to avoid blocking if I don't know exact advanced items.
            // Will add 'refined_iron' or similar if known.
            resources = {
                'money': baseMoney * 2,
                'talisman': 5 // Example
            };
        }
        return resources;
    }

    contribute() {
        if (this.state.contributionCount <= 0) return { success: false, msg: '次數不足' };

        // Safety check for test environment or missing window.game
        if (!window.game || !window.game.resourceManager) {
            console.error('SectManager: window.game.resourceManager is undefined', window.game);
            return { success: false, msg: 'Internal Error: ResourceManager missing' };
        }

        const cost = this.getContributionCost();
        const resManager = window.game.resourceManager;

        // Check cost
        for (const [key, val] of Object.entries(cost)) {
            const res = resManager.getResource(key);
            if (!res || res.value < val) return { success: false, msg: LanguageManager.getInstance().t('資源不足: {res}', { res: LanguageManager.getInstance().t(key) }) };
        }

        // Deduct
        for (const [key, val] of Object.entries(cost)) {
            resManager.getResource(key).value -= val;
        }

        // Award
        this.state.contributionCount--;
        this.state.developmentPoints += 10;
        this.state.playerContribution = (this.state.playerContribution || 0) + 10;

        // Level Up Check
        const req = this.getRequiredDevelopment();
        if (this.state.developmentPoints >= req && this.state.sectLevel < this.maxLevel) {
            this.state.sectLevel++;
            this.state.developmentPoints -= req; // Carry over? Or reset? Usually reset.
            // But if it's "Fill bar to level up", then points usually reset to 0 or req increases.
            // Let's simply reset current points to 0 for simplicity or keep carry over.
            // Let's use cumulative or stage-based. 
            // Convention: 0/100 -> 100/100 -> Level Up -> 0/300.
            this.state.developmentPoints = 0;
            if (window.game.uiManager) window.game.uiManager.addLog('宗門等級提升！', 'INFO');
        }

        this.saveState();
        return { success: true, msg: '貢獻成功' };
    }

    // --- Task System ---

    refreshTasks() {
        const types = ['adventure', 'crusade', 'treasure', 'secret'];
        const typeNames = {
            'adventure': '歷練',
            'crusade': '討伐',
            'treasure': '探寶',
            'secret': '秘境'
        };
        const tasks = [];

        // Descriptions map
        const descKeys = {
            'adventure': ['sect_task_adventure_1', 'sect_task_adventure_2', 'sect_task_adventure_3', 'sect_task_adventure_4', 'sect_task_adventure_5'],
            'crusade': ['sect_task_crusade_1', 'sect_task_crusade_2', 'sect_task_crusade_3', 'sect_task_crusade_4', 'sect_task_crusade_5'],
            'treasure': ['sect_task_treasure_1', 'sect_task_treasure_2', 'sect_task_treasure_3', 'sect_task_treasure_4', 'sect_task_treasure_5'],
            'secret': ['sect_task_secret_1', 'sect_task_secret_2', 'sect_task_secret_3', 'sect_task_secret_4', 'sect_task_secret_5']
        };

        const era = PlayerManager.getEraId();

        for (let i = 0; i < 6; i++) {
            const typeKey = types[Math.floor(Math.random() * types.length)];
            const typeName = typeNames[typeKey];
            const descs = descKeys[typeKey];
            const descKey = descs[Math.floor(Math.random() * descs.length)];

            // Pick rarity using weighted random
            const rarity = pickRarity();

            // Generate reward based on era and rarity
            const { reward, specialEffect } = generateReward(era, rarity);

            // Duration scales with rarity (higher = longer but more rewarding)
            const baseDuration = 10 + Math.floor(Math.random() * 15); // 10-25 mins base
            const rarityDurationBonus = {
                common: 0,
                uncommon: 5,
                rare: 10,
                epic: 15,
                legendary: 20
            };
            const duration = 60000 * (baseDuration + (rarityDurationBonus[rarity.key] || 0));

            tasks.push({
                id: Date.now() + i,
                name: `宗門${typeName}任務`,
                desc: descKey,
                type: typeName,
                duration: duration,
                reward: reward,
                specialEffect: specialEffect, // { type: 'reduce_training_time', value: 0.33 } or null
                rarity: rarity.key,
                rarityColor: rarity.color,
                rarityName: rarity.nameKey,
                status: 'IDLE'
            });
        }
        this.state.tasks = tasks;
        this.saveState();
    }

    /**
     * 手動刷新任務
     * 消耗：丹液 x10（DEBUG 模式：金錢 x1）
     */
    manualRefreshTasks() {
        const lang = LanguageManager.getInstance();

        // Check if debug mode
        const isDebug = window.game?.buildingManager?.debugAutoBuildEnabled;

        // Define costs
        const cost = isDebug ? { money: 1 } : { liquid: 10 };
        const costName = isDebug ? lang.t('金錢') : lang.t('丹液');
        const costAmount = isDebug ? 1 : 10;

        // Check resources
        if (!window.game || !window.game.resourceManager) {
            return { success: false, msg: 'Game not initialized' };
        }

        for (const [resId, amount] of Object.entries(cost)) {
            const res = window.game.resourceManager.getResource(resId);
            if (!res || res.value < amount) {
                return { success: false, msg: lang.t('資源不足: {res}', { res: `${costName}x${costAmount}` }) };
            }
        }

        // Deduct resources
        for (const [resId, amount] of Object.entries(cost)) {
            window.game.resourceManager.addResource(resId, -amount);
        }

        // Refresh tasks
        this.refreshTasks();
        this.state.nextTaskRefresh = Date.now() + (3 * 60 * 60 * 1000); // Reset timer
        this.saveState();

        return { success: true, msg: `${lang.t('刷新')}! (-${costName}x${costAmount})` };
    }

    /**
     * 手動刷新宗門貢獻次數
     * 消耗：丹液 x10000（DEBUG 模式：金錢 x1）
     */
    manualRefreshContribution() {
        const lang = LanguageManager.getInstance();
        const isDebug = window.game?.buildingManager?.debugAutoBuildEnabled;

        const cost = isDebug ? { money: 1 } : { liquid: 10000 };
        const costName = isDebug ? lang.t('金錢') : lang.t('丹液');
        const costAmount = isDebug ? 1 : 10000;

        if (!window.game || !window.game.resourceManager) {
            return { success: false, msg: 'Game not initialized' };
        }

        for (const [resId, amount] of Object.entries(cost)) {
            const res = window.game.resourceManager.getResource(resId);
            if (!res || res.value < amount) {
                return { success: false, msg: lang.t('資源不足: {res}', { res: `${costName}x${costAmount}` }) };
            }
        }

        // Deduct resources
        for (const [resId, amount] of Object.entries(cost)) {
            window.game.resourceManager.addResource(resId, -amount);
        }

        // Reset contribution
        this.state.contributionCount = this.maxContribution;
        this.state.nextContributionReset = Date.now() + this.resetInterval;
        this.saveState();

        return { success: true, msg: `${lang.t('刷新')}! (-${costName}x${costAmount})` };
    }

    startTask(index) {
        if (this.state.activeTask) return { success: false, msg: '已有進行中任務' };

        const task = this.state.tasks[index];
        if (!task) return { success: false, msg: '任務不存在' };

        // Remove from list
        this.state.tasks.splice(index, 1);

        // Set active
        this.state.activeTask = {
            ...task,
            startTime: Date.now(),
            endTime: Date.now() + task.duration
        };

        this.saveState();

        // Log to Cultivation Log
        if (window.game && window.game.uiManager) {
            const lang = LanguageManager.getInstance();
            const logMsg = `接取任務：${lang.t(task.name)} - ${lang.t(task.desc)}`;
            window.game.uiManager.addLog(logMsg, 'INFO');
        }

        return { success: true, msg: '任務開始' };
    }

    hasAvailableTasks() {
        return this.state.tasks && this.state.tasks.length > 0;
    }

    claimTaskReward() {
        if (!this.state.activeTask) return { success: false, msg: '無可領取任務' };

        const now = Date.now();
        if (now < this.state.activeTask.endTime) return { success: false, msg: '任務尚未完成' };

        // Safety check
        if (!window.game || !window.game.resourceManager) {
            return { success: false, msg: 'Game not initialized' };
        }

        const lang = LanguageManager.getInstance();
        const task = this.state.activeTask;

        // Grant rewards
        const reward = task.reward;
        for (const [key, val] of Object.entries(reward)) {
            const res = window.game.resourceManager.getResource(key);
            if (res) {
                if (!res.unlocked) {
                    window.game.resourceManager.unlockResource(key);
                }
                window.game.resourceManager.addResource(key, val);
            }
        }

        // Handle special effects (e.g., reduce training time)
        if (task.specialEffect && task.specialEffect.type === 'reduce_training_time') {
            const reduction = task.specialEffect.value; // 0.33 = 33%
            if (window.game.playerManager && typeof window.game.playerManager.reduceCurrentLevelTime === 'function') {
                window.game.playerManager.reduceCurrentLevelTime(reduction);
                if (window.game.uiManager) {
                    const percentText = Math.round(reduction * 100) + '%';
                    window.game.uiManager.addLog(lang.t('effect_reduce_training_time', { '0': percentText }), 'INFO');
                }
            }
        }

        // Build reward log with rarity
        const rarityText = task.rarityName ? `[${lang.t(task.rarityName)}] ` : '';
        if (window.game.uiManager) {
            window.game.uiManager.addLog(`${rarityText}${lang.t('任務完成，獲得獎勵！')}`, 'INFO');
        }

        this.state.activeTask = null;
        this.saveState();
        return { success: true, msg: '領取成功', rewards: reward };
    }

    // --- Cloud Sea Market (Replacing Alchemy Hall Shop) ---

    getMarketItem(key) {
        return MARKET_ITEMS[key];
    }

    getMarketItems() {
        return MARKET_ITEMS;
    }

    buyMarketItem(itemId) {
        const item = MARKET_ITEMS[itemId];
        if (!item) return { success: false, msg: '商品不存在' };

        const lang = LanguageManager.getInstance();

        // Check Limit
        const currentCount = (this.state.marketPurchaseCounts && this.state.marketPurchaseCounts[itemId]) || 0;
        if (currentCount >= item.limit) {
            return { success: false, msg: lang.t('購買已達上限') };
        }

        // Check Contribution
        const cost = item.cost;
        if ((this.state.playerContribution || 0) < cost) {
            return { success: false, msg: lang.t('宗門貢獻不足') };
        }

        if (!window.game || !window.game.resourceManager) {
            return { success: false, msg: 'System Error' };
        }

        // Deduct Contribution
        this.state.playerContribution -= cost;

        // Grant Item
        window.game.resourceManager.addResource(itemId, 1);

        // If it's a pill, we might want to "consume" it instantly if that was the old logic, 
        // but Market usually puts it in inventory. The old 'buyPill' did adminConsumePill.
        // Let's assume Market items go to inventory now, EXCEPT for 'sect_high_golden_pill' which might need special handling if it's instant use.
        // For now, let's treat everything as Resource. If 'sect_high_golden_pill' needs instant use, user has to use it from inventory (if implemented) or we auto-use.
        // Given existing code had 'buyPill' auto-consume, we might need to preserve that for 'sect_high_golden_pill'.

        if (itemId === 'sect_high_golden_pill') {
            // 舊邏輯：直接服用
            const result = PlayerManager.adminConsumePill(itemId);
            if (!result.success) {
                // Refund
                this.state.playerContribution += cost;
                // Remove resource that was just added (since we added it above, we take it back)
                window.game.resourceManager.addResource(itemId, -1);
                return result;
            }
        }

        // Update Counts
        if (!this.state.marketPurchaseCounts) this.state.marketPurchaseCounts = {};
        this.state.marketPurchaseCounts[itemId] = currentCount + 1;

        // Log to Game UI
        if (window.game && window.game.uiManager) {
            const itemName = lang.t(itemId);
            window.game.uiManager.addLog(lang.t('market_exchange_log', {
                item: itemName,
                amount: 1,
                cost: cost,
                currency: lang.t('宗門貢獻')
            }), 'INFO');
        }

        this.saveState();
        this.saveState();
        return { success: true, msg: lang.t('兌換成功') };
    }

    refreshMarket() {
        this.state.marketPurchaseCounts = {};
        this.state.nextMarketReset = Date.now() + this.marketResetInterval;
        this.saveState();
    }

    manualRefreshMarket() {
        const lang = LanguageManager.getInstance();
        const isDebug = window.game?.buildingManager?.debugAutoBuildEnabled;

        // Cost: 50 Liquid or 1 Money (Debug)
        const cost = isDebug ? { money: 1 } : { liquid: 50 };
        const costName = isDebug ? lang.t('金錢') : lang.t('丹液');
        const costAmount = isDebug ? 1 : 50;

        if (!window.game || !window.game.resourceManager) {
            return { success: false, msg: 'Game not initialized' };
        }

        for (const [resId, amount] of Object.entries(cost)) {
            const res = window.game.resourceManager.getResource(resId);
            if (!res || res.value < amount) {
                return { success: false, msg: lang.t('資源不足: {res}', { res: `${costName}x${costAmount}` }) };
            }
        }

        // Deduct resources
        for (const [resId, amount] of Object.entries(cost)) {
            window.game.resourceManager.addResource(resId, -amount);
        }

        this.refreshMarket();

        return { success: true, msg: `${lang.t('刷新')}! (-${costName}x${costAmount})` };
    }

    // --- Sect Events ---

    triggerRandomEvent() {
        const keys = Object.keys(SECT_EVENTS);
        const key = keys[Math.floor(Math.random() * keys.length)];
        const eventConfig = SECT_EVENTS[key];

        // Pick a target from the list
        const target = eventConfig.targets[Math.floor(Math.random() * eventConfig.targets.length)];

        this.state.activeEvent = {
            id: key,
            name: eventConfig.name,
            desc: eventConfig.desc,
            target: target,
            rewardRatio: eventConfig.rewardRatio,
            batchSize: eventConfig.batchSize || 1,
            limit: eventConfig.limit || 10,
            currentCompletions: 0,
            endTime: Date.now() + eventConfig.duration
        };

        // Log
        if (window.game && window.game.uiManager) {
            const lang = LanguageManager.getInstance();
            window.game.uiManager.addLog(`📢 ${lang.t(eventConfig.name)}: ${lang.t('求購')} ${lang.t(target)}`, 'INFO');
        }

        this.saveState();
    }

    endEvent() {
        this.state.activeEvent = null;
        this.state.nextEventTime = Date.now() + 3600000; // Cooldown 1 hour
        this.saveState();
    }

    submitEventItem() {
        if (!this.state.activeEvent) return { success: false, msg: '當前無活動' };

        const event = this.state.activeEvent;

        // Check Limit
        if (event.currentCompletions >= event.limit) {
            return { success: false, msg: LanguageManager.getInstance().t('事件已達上限') };
        }

        const targetId = event.target;
        const batchSize = event.batchSize || 1;

        if (!window.game || !window.game.resourceManager) return { success: false, msg: 'Error' };

        const res = window.game.resourceManager.getResource(targetId);
        if (!res || res.value < batchSize) return { success: false, msg: LanguageManager.getInstance().t('資源不足: {res}', { res: `${LanguageManager.getInstance().t(targetId)} x${batchSize}` }) };

        // Calculate Reward
        // Value estimation? For now use fixed base or ratio.
        // Let's say base value is 10 Contribution for simplicity, multipled by ratio.
        let baseValue = 10;
        // Ideally should fetch resource price/value if exists. 
        // For now hardcode or dynamic.
        if (targetId.includes('pill')) baseValue = 50;
        if (targetId.includes('core')) baseValue = 100;

        // Reward per item * batch size
        const reward = Math.floor(baseValue * event.rewardRatio * batchSize);

        // Deduct
        window.game.resourceManager.addResource(targetId, -batchSize);

        // Increment Completion
        event.currentCompletions++;

        // Award
        this.state.playerContribution = (this.state.playerContribution || 0) + reward;

        this.saveState();

        const lang = LanguageManager.getInstance();
        const itemName = lang.t(targetId);
        const msg = lang.t('sect_event_submit_log', {
            item: itemName,
            amount: batchSize,
            reward: reward,
            currency: lang.t('宗門貢獻')
        });

        return { success: true, msg: msg, reward: reward };
    }

    // --- Alchemy Hall Legacy Support (Cleaned up or kept?) ---
    // User asked to replace Alchemy Hall with market.
    // Keeping 'buyRecipe' as it is distinct.

    // ... Legacy 'buyPill' can be deprecated or kept as fallback? 
    // I already moved 'sect_high_golden_pill' to Market Items.
    // 'monster_core_mid' is also in Market Items.
    // So 'buyPill' can be removed or redirected to buyMarketItem if we update UI.
    // I will keep getPillCost/buyPill for API compatibility if something calls it, strictly. 
    // But 'SectPanel' will be updated to use 'buyMarketItem'.

    // ... (Old getPillCost/buyPill below) ...

    // --- Recipe System (丹方購買) ---

    getRecipeCost(recipeId) {
        const costs = {
            spirit_nurt_pill: {
                'stone_mid': 10000,
                'spirit_grass_100y': 100
            }
        };
        return costs[recipeId] || {};
    }

    hasRecipe(recipeId) {
        return this.state.unlockedRecipes?.[recipeId] === true;
    }

    buyRecipe(recipeId) {
        const lang = LanguageManager.getInstance();

        if (this.state.sectLevel < 2) {
            return { success: false, msg: lang.t('宗門等級不足') };
        }

        if (this.hasRecipe(recipeId)) {
            return { success: false, msg: lang.t('已購買此丹方') };
        }

        if (!window.game || !window.game.resourceManager) {
            return { success: false, msg: 'System Error' };
        }

        const cost = this.getRecipeCost(recipeId);
        if (Object.keys(cost).length === 0) {
            return { success: false, msg: lang.t('未知丹方') };
        }

        const resManager = window.game.resourceManager;

        // 檢查資源
        for (const [key, val] of Object.entries(cost)) {
            const res = resManager.getResource(key);
            if (!res || res.value < val) {
                return { success: false, msg: lang.t('資源不足: {res}', { res: lang.t(key) }) };
            }
        }

        // 扣除資源
        for (const [key, val] of Object.entries(cost)) {
            resManager.getResource(key).value -= val;
        }

        // 解鎖丹方
        if (!this.state.unlockedRecipes) {
            this.state.unlockedRecipes = {};
        }
        this.state.unlockedRecipes[recipeId] = true;
        this.saveState();

        // 日誌
        if (window.game && window.game.uiManager) {
            window.game.uiManager.addLog(`📜 ${lang.t('習得丹方')}: ${lang.t('🧪 蘊靈丹')}`, 'INFO');
        }

        return { success: true, msg: lang.t('購買丹方成功') };
    }
}

const sectManager = new SectManager();
export default sectManager;
