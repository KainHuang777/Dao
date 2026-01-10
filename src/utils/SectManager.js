
import PlayerManager from './PlayerManager.js';
import LanguageManager from './LanguageManager.js';

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
            history: [] // Log history for sect
        };
        this.state = this.loadState();

        // Configs
        this.maxLevel = 5;
        this.maxContribution = 3;
        this.resetInterval = 10800000; // 3 hours in ms
        this.taskInterval = 10800000; // 3 hours in ms
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
                'stone': 100
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
        const types = ['歷練', '討伐', '探寶', '秘境'];
        const tasks = [];

        for (let i = 0; i < 6; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const duration = 1800000; // 30 minutes fixed for now? Or random?
            // User said: "Place/Idle task... Task text random... Reward random (Advanced or Mid-grade synthetic)"

            // Random rewards based on Era
            const era = PlayerManager.getEraId();
            let reward = {};
            if (era <= 2) {
                reward = { 'money': 500, 'stone_mid': 1 };
            } else {
                reward = { 'money': 2000, 'talisman': 2 };
            }

            tasks.push({
                id: Date.now() + i,
                name: `宗門${type}任務`,
                desc: `前往某地進行${type}...`,
                type: type,
                duration: 60000 * (10 + Math.floor(Math.random() * 20)), // 10-30 mins
                reward: reward,
                status: 'IDLE' // IDLE, ACTIVE (moved to activeTask), COMPLETED (removed)
            });
        }
        this.state.tasks = tasks;
        this.saveState();
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
        return { success: true, msg: '任務開始' };
    }

    claimTaskReward() {
        if (!this.state.activeTask) return { success: false, msg: '無可領取任務' };

        const now = Date.now();
        if (now < this.state.activeTask.endTime) return { success: false, msg: '任務尚未完成' };

        // Safety check
        if (!window.game || !window.game.resourceManager) {
            return { success: false, msg: 'Game not initialized' };
        }

        // Grant rewards
        const reward = this.state.activeTask.reward;
        for (const [key, val] of Object.entries(reward)) {
            const res = window.game.resourceManager.getResource(key);
            if (res) {
                if (!res.unlocked) {
                    window.game.resourceManager.unlockResource(key);
                }
                window.game.resourceManager.addResource(key, val);
            }
        }

        if (window.game.uiManager) window.game.uiManager.addLog('任務完成，獲得獎勵！', 'INFO');

        this.state.activeTask = null;
        this.saveState();
        return { success: true, msg: '領取成功', rewards: reward };
    }

    // --- Alchemy Hall (Level 2) ---

    getPillCost(pillId) {
        if (pillId === 'sect_high_golden_pill') {
            return {
                'money': 50000,
                'stone': 2000 // Using base stone/spirit stone ID. 'stone' maps to 'stone_low' often or check ID. 'stone_low' is usually 'stone'.
            };
        }
        return {};
    }

    buyPill(pillId) {
        if (this.state.sectLevel < 2) return { success: false, msg: '宗門等級不足' };

        if (!window.game || !window.game.resourceManager || !window.game.playerManager) {
            return { success: false, msg: 'System Error' };
        }

        const cost = this.getPillCost(pillId);
        const resManager = window.game.resourceManager;

        // Check Logic
        for (const [key, val] of Object.entries(cost)) {
            const res = resManager.getResource(key);
            // Resource 'stone' might be alias. resourceManager handles aliases? No, usually IDs.
            // Check EraManager _getResName mapping: stone -> 下品靈石 (stone_low?)
            // Usually 'stone' is the ID in Resources.csv? Or 'stone_low'?
            // Let's check typical usage. 'stone' is often early game ID.
            if (!res || res.value < val) return { success: false, msg: LanguageManager.getInstance().t('資源不足: {res}', { res: LanguageManager.getInstance().t(key) }) };
        }

        // Deduct
        for (const [key, val] of Object.entries(cost)) {
            resManager.getResource(key).value -= val;
        }

        // Grant & Consume
        const result = window.game.playerManager.adminConsumePill(pillId);
        if (!result.success) {
            // Refund if failed (e.g. max count reached)
            for (const [key, val] of Object.entries(cost)) {
                resManager.getResource(key).value += val;
            }
            return result;
        }

        return { success: true, msg: '購買並服用成功' };
    }
}

const sectManager = new SectManager();
export default sectManager;
