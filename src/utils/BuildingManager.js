
import { Buildings } from '../data/Buildings.js';
import PlayerManager from './PlayerManager.js';
import SkillManager from './SkillManager.js';
import Formatter from './Formatter.js';
import LanguageManager from './LanguageManager.js';

export default class BuildingManager {
    constructor(resourceManager) {
        this.resourceManager = resourceManager;
        this.buildings = {};
        this.maidAutoTargets = {}; // 侍女自動合成設定 { resId: boolean }
        this.maidInterval = null;
        this.autoBuildEnabled = true; // 自動建築開關
        this.autoBuildInterval = null;
        this.debugAutoBuildEnabled = false; // Debug 模式自動建築
        // 初始狀態可以在 init() 裡面建立
    }

    /**
     * 初始化建築狀態
     * 應在 data/Buildings.js 的 loadBuildings() 執行完畢後調用
     */
    init() {
        // 從 Buildings 物件中讀取所有建築 ID
        Object.keys(Buildings).forEach(key => {
            // 如果已經存在狀態（例如從存檔讀取），則不覆蓋
            if (!this.buildings[key]) {
                let initialLevel = 0;
                if (key === 'hut' || key === 'wooden_house') {
                    initialLevel = 1;
                }
                this.buildings[key] = {
                    id: key,
                    level: initialLevel
                };
            }
        });

        // 重新計算加成
        this.recalculateRates();

        // 啟動侍女自動化檢查 (每60秒)
        if (this.maidInterval) clearInterval(this.maidInterval);
        this.maidInterval = setInterval(() => this.runMaidWork(), 60000);

        // 啟動自動建築檢查 (每30秒)
        this.initAutoBuild();
    }

    /**
     * 初始化自動建築計時器
     */
    initAutoBuild() {
        if (this.autoBuildInterval) clearInterval(this.autoBuildInterval);
        this.autoBuildInterval = setInterval(() => this.runAutoBuild(), 30000);
    }

    /**
     * 執行自動建築
     */
    runAutoBuild() {
        // 檢查是否啟用（需要劍侍糯美子或 Debug 模式）
        const hasSwordMaid = this.buildings['sword_maid'] && this.buildings['sword_maid'].level >= 1;
        if (!this.autoBuildEnabled && !this.debugAutoBuildEnabled) return;
        if (!hasSwordMaid && !this.debugAutoBuildEnabled) return;

        // 按順序嘗試升級第一個可升級的建築
        for (const id of Object.keys(Buildings)) {
            if (this.canUpgrade(id)) {
                const def = Buildings[id];
                const previousLevel = this.buildings[id].level;
                this.upgrade(id);

                // Log auto-build action
                if (window.game && window.game.uiManager) {
                    const msg = LanguageManager.getInstance().t('[自動建築] {0} 升級至 Lv.{1}', {
                        '0': LanguageManager.getInstance().t(def.name),
                        '1': this.buildings[id].level
                    });
                    window.game.uiManager.addLog(msg);
                }
                break; // 每次只升級一個
            }
        }
    }

    /**
     * 切換自動建築開關
     * @returns {boolean} 切換後的新狀態
     */
    toggleAutoBuild() {
        this.autoBuildEnabled = !this.autoBuildEnabled;
        return this.autoBuildEnabled;
    }

    /**
     * 切換 Debug 自動建築
     * @returns {boolean} 切換後的新狀態
     */
    toggleDebugAutoBuild() {
        this.debugAutoBuildEnabled = !this.debugAutoBuildEnabled;
        return this.debugAutoBuildEnabled;
    }

    /**
     * 獲取侍女合成數量
     * @returns {number} 每次合成數量
     */
    getMaidCraftAmount() {
        if (this.buildings['sword_maid'] && this.buildings['sword_maid'].level >= 1) {
            return 5;
        }
        return 1;
    }

    runMaidWork() {
        if (!this.buildings['maid'] || this.buildings['maid'].level < 1) return;

        // 嘗試根據設定自動合成
        const craftedItems = [];

        const craftAmount = this.getMaidCraftAmount();

        Object.entries(this.maidAutoTargets).forEach(([key, enabled]) => {
            if (enabled) {
                if (this.resourceManager.craft(key, craftAmount)) {
                    const res = this.resourceManager.getResource(key);
                    // 優先嘗試翻譯 ID，若無翻譯則 fallback 到資源名稱
                    const resName = LanguageManager.getInstance().t(key) !== key
                        ? LanguageManager.getInstance().t(key)
                        : LanguageManager.getInstance().t(res.name);
                    craftedItems.push(`${resName} x${craftAmount}`);
                }
            }
        });

        if (craftedItems.length > 0 && window.game && window.game.uiManager) {
            const separator = LanguageManager.getInstance().t('、');
            // Check if resources are translated? Usually res.name is just key or TC string. 
            // Better to translate crafted items names if possible, but res.name is pulled from ResourceManager.
            // Assuming res.name might be translated elsewhere or is key. 
            // Actually, looks like res.name is used.
            // Let's just format the message. 
            const msg = LanguageManager.getInstance().t('[侍女代工] 成功合成：{0}', { '0': craftedItems.join(separator) });
            window.game.uiManager.addLog(msg);
        }
    }

    /**
     * 切換侍女自動合成某項資源的狀態
     * @param {string} resKey - 資源 ID
     * @returns {boolean} - 切換後的新狀態
     */
    toggleMaidAuto(resKey) {
        if (this.maidAutoTargets[resKey]) {
            this.maidAutoTargets[resKey] = false;
        } else {
            this.maidAutoTargets[resKey] = true;
        }
        return this.maidAutoTargets[resKey];
    }

    /**
     * 獲取侍女自動合成狀態
     * @param {string} resKey
     * @returns {boolean}
     */
    isMaidAutoEnabled(resKey) {
        return !!this.maidAutoTargets[resKey];
    }



    getBuilding(id) {
        return this.buildings[id];
    }

    getNextCost(id) {
        const def = Buildings[id];
        const state = this.buildings[id];
        const cost = {};

        const costReduction = PlayerManager.getTalentBonus('five_elements_root');

        for (const [resKey, amount] of Object.entries(def.baseCost)) {
            // 混合公式：Cost = Base × (1.2^Level) × (1 + Level/10) × (1 - Reduction)
            // 這個公式比純指數增長更平緩，但仍保持挑戰性
            const exponentialPart = Math.pow(1.2, state.level);
            const linearPart = 1 + state.level / 10;
            let finalAmount = amount * exponentialPart * linearPart;
            finalAmount = Math.floor(finalAmount * (1 - costReduction));
            cost[resKey] = finalAmount;
        }
        return cost;
    }

    /**
     * 獲取建築的最大等級上限
     */
    getBuildingLevelCap(id) {
        const baseCap = 10; // 基礎上限
        const learnedSkills = PlayerManager.getLearnedSkills();
        let additionalCap = 0;

        // 計算建築精通技能提供的額外上限
        const masterySkills = [
            { id: 'building_mastery_1', cap: 10 },
            { id: 'building_mastery_2', cap: 10 },
            { id: 'building_mastery_3', cap: 10 },
            { id: 'building_mastery_4', cap: 10 },
            { id: 'building_mastery_5', cap: 20 },
            { id: 'building_mastery_6', cap: 40 }
        ];

        masterySkills.forEach(skill => {
            if (learnedSkills[skill.id]) {
                const level = learnedSkills[skill.id];
                // 這裡目前按等級累加加成，如果原設計是 Lv.1 就給全量加成，則維持原樣
                additionalCap += skill.cap * level;
            }
        });

        const globalCap = baseCap + additionalCap;

        // 獲取建築自身的 maxLevel 限制
        const buildingDef = Buildings[id];
        if (buildingDef && buildingDef.maxLevel) {
            // 返回建築自身上限和全局上限中的較小值
            return Math.min(buildingDef.maxLevel, globalCap);
        }

        return globalCap;
    }

    /**
     * 獲取無法升級的原因
     */
    getUpgradeBlockReason(id) {
        const state = this.buildings[id];
        const levelCap = this.getBuildingLevelCap(id);

        // 檢查等級上限
        if (state.level >= levelCap) {
            return LanguageManager.getInstance().t('已達等級上限') + ` (${levelCap})，` + LanguageManager.getInstance().t('需建築精通技能');
        }

        // 檢查資源
        const cost = this.getNextCost(id);
        const resources = this.resourceManager.getAllResources();

        // 計算靈力消耗率（用於判斷淨產出，與 Resources.js 保持一致）
        const currentEra = PlayerManager.getEraId();
        const currentLevel = PlayerManager.getLevel();
        const lingliConsumption = (currentEra - 1) * 10 + currentLevel - 2;

        let maxWaitTime = 0;
        let hasInsufficientProduction = false;
        let insufficientResourceName = '';

        for (const [key, amount] of Object.entries(cost)) {
            if (!resources[key] || resources[key].value < amount) {
                const res = resources[key];
                if (!res) continue;

                // 優先檢查資源容量是否低於所需消耗
                if (res.max < amount) {
                    hasInsufficientProduction = true;
                    // 優先嘗試翻譯 ID，若無翻譯則 fallback 到資源名稱
                    const resName = LanguageManager.getInstance().t(key) !== key
                        ? LanguageManager.getInstance().t(key)
                        : LanguageManager.getInstance().t(res.name);
                    insufficientResourceName = resName + LanguageManager.getInstance().t('容量不足');
                    break;
                }

                const needed = amount - res.value;

                // 計算淨產出率（靈力需要扣除消耗）
                let netRate = res.rate;
                if (key === 'lingli') {
                    netRate = res.rate - lingliConsumption;
                }

                // 如果淨產出率 <= 0，表示無法透過等待獲得
                if (netRate <= 0) {
                    hasInsufficientProduction = true;
                    // 優先嘗試翻譯 ID，若無翻譯則 fallback 到資源名稱
                    const resName = LanguageManager.getInstance().t(key) !== key
                        ? LanguageManager.getInstance().t(key)
                        : LanguageManager.getInstance().t(res.name);
                    insufficientResourceName = resName + LanguageManager.getInstance().t('產能不足');
                    break;
                }

                // 計算需要等待的時間（秒）
                const waitTime = needed / netRate;
                if (waitTime > maxWaitTime) {
                    maxWaitTime = waitTime;
                }
            }
        }

        // 如果有資源產能不足
        if (hasInsufficientProduction) {
            return insufficientResourceName;
        }

        // 如果需要等待
        if (maxWaitTime > 0) {
            return `${LanguageManager.getInstance().t('預計還需')} ${Formatter.formatTime(maxWaitTime)}`;
        }

        return '';
    }

    canUpgrade(id) {
        const state = this.buildings[id];
        const levelCap = this.getBuildingLevelCap(id);

        // 檢查是否達到等級上限
        if (state.level >= levelCap) {
            return false;
        }

        // 檢查資源是否足夠
        const cost = this.getNextCost(id);
        const resources = this.resourceManager.getAllResources();

        for (const [key, amount] of Object.entries(cost)) {
            if (!resources[key] || resources[key].value < amount) {
                return false;
            }
        }
        return true;
    }

    upgrade(id) {
        if (!this.canUpgrade(id)) return false;

        const cost = this.getNextCost(id);
        const def = Buildings[id];
        const previousLevel = this.buildings[id].level;

        // Deduct resources
        for (const [key, amount] of Object.entries(cost)) {
            this.resourceManager.getResource(key).value -= amount;
        }

        // Level up
        this.buildings[id].level++;

        // 特殊邏輯：藏書閣首次建造時解鎖技能點資源
        if (id === 'library' && previousLevel === 0) {
            this.resourceManager.unlockResource('skill_point');
            if (window.game && window.game.uiManager) {
                const msg = LanguageManager.getInstance().t('建立藏書閣，開啟 <b>{0}</b> 系統！', { '0': LanguageManager.getInstance().t('技能點') });
                window.game.uiManager.addLog(msg);
            }
        }

        // Log
        if (window.game && window.game.uiManager) {
            const msg = LanguageManager.getInstance().t('建築 <b>{0}</b> 升級至 Lv.{1}', {
                '0': LanguageManager.getInstance().t(def.name),
                '1': this.buildings[id].level
            });
            window.game.uiManager.addLog(msg);
        }

        // Apply effects
        // 這邊我們選擇「每次升級後重新計算並設定該資源的產出率」
        // 或者簡單地直接 += effect. 目前採用重新計算較為穩健
        this.recalculateRates();

        return true;
    }

    recalculateRates() {
        const resources = this.resourceManager.getAllResources();
        const baseData = this.resourceManager.getBaseData();

        // 天賦加成預取 (Request 5)
        const globalProdBonus = PlayerManager.getTalentBonus('innate_dao_body');
        const swordBonus = PlayerManager.getTalentBonus('sword_heart');
        const capBonusGlobal = PlayerManager.getTalentBonus('dragon_aura');
        const goldBonus = PlayerManager.getTalentBonus('gold_touch');
        const natureBonus = PlayerManager.getTalentBonus('nature_friend');
        const lingliCapBonus = PlayerManager.getTalentBonus('three_flowers');
        const buildingEffectBonus = PlayerManager.getTalentBonus('world_child');
        const advanceMaxTalentBonus = PlayerManager.getTalentBonus('void_body');

        // 1. Reset to base values from loaded CSV data
        for (const [key, base] of Object.entries(baseData)) {
            if (resources[key]) {
                resources[key].rate = base.rate;
                resources[key].max = base.max;
            }
        }

        // 2. Add building bonuses
        Object.values(this.buildings).forEach(b => {
            const def = Buildings[b.id];
            if (b.level > 0 && def.effects) {
                for (const [effectKey, amountPerLevel] of Object.entries(def.effects)) {
                    let finalAmount = amountPerLevel * (1 + buildingEffectBonus);

                    if (effectKey === 'all_max') {
                        // Extended to include synthetic resources
                        ['lingli', 'money', 'wood', 'stone_low', 'spirit_grass_low', 'stone_mid', 'stone_high', 'liquid', 'talisman'].forEach(resKey => {
                            if (resources[resKey]) resources[resKey].max += finalAmount * b.level;
                        });
                    } else if (effectKey === 'all_rate') {
                        const weight = def.effectWeight || 0;
                        const rateBonus = finalAmount * Math.pow(b.level + weight, 2);
                        ['lingli', 'money', 'wood', 'stone_low', 'spirit_grass_low'].forEach(resKey => {
                            if (resources[resKey]) resources[resKey].rate += rateBonus;
                        });
                    } else if (effectKey.endsWith('_max')) {
                        const resKey = effectKey.replace('_max', '');
                        if (resources[resKey]) {
                            resources[resKey].max += finalAmount * b.level;
                        }
                    } else {
                        // Assume it's a rate
                        const resKey = effectKey;
                        const weight = def.effectWeight || 0;
                        if (resources[resKey]) {
                            // 只有基礎資源 (Basic) 使用平方成長公式以匹配後期龐大的消耗
                            // 合成資源 (Crafted) 與 進階資源 (Advance) 採用線性成長，避免數值過度膨脹
                            if (resources[resKey].type === 'basic') {
                                resources[resKey].rate += finalAmount * Math.pow(b.level + weight, 2);
                            } else {
                                resources[resKey].rate += finalAmount * (b.level + weight);
                            }
                        }
                    }
                }
            }
        });

        // 2.5 Calculate Generic Multipliers from Buildings (like synthetic_max_mult)
        let syntheticMaxMult = 0;
        Object.values(this.buildings).forEach(b => {
            const def = Buildings[b.id];
            if (b.level > 0 && def.effects) {
                for (const [effectKey, amountPerLevel] of Object.entries(def.effects)) {
                    if (effectKey === 'synthetic_max_mult') {
                        syntheticMaxMult += amountPerLevel * b.level;
                    }
                }
            }
        });

        // 3. Add skill bonuses
        const learnedSkills = PlayerManager.getLearnedSkills();
        const skillMultipliers = {}; // 儲存倍率效果
        let advanceMaxSkillMult = 1; // 進階資源上限倍率

        Object.entries(learnedSkills).forEach(([skillId, level]) => {
            const skill = SkillManager.getSkill(skillId);
            if (skill && skill.effects) {
                const { type, amount } = skill.effects;

                // 處理倍率效果（multiplier）
                if (type === 'advance_max_multiplier') {
                    // 進階資源上限倍率
                    advanceMaxSkillMult *= Math.pow(amount, level);
                } else if (type.endsWith('_multiplier')) {
                    const resKey = type.replace('_multiplier', '');
                    if (!skillMultipliers[resKey]) {
                        skillMultipliers[resKey] = 1;
                    }
                    // 倍率效果：每級乘以 amount（例如 1.1 表示 +10%）
                    skillMultipliers[resKey] *= Math.pow(amount, level);
                }
                // 處理加法效果
                else {
                    const finalAmount = amount * level;

                    if (type === 'all_max') {
                        ['lingli', 'money', 'wood', 'stone_low', 'spirit_grass_low'].forEach(resKey => {
                            if (resources[resKey]) resources[resKey].max += finalAmount;
                        });
                    } else if (type.endsWith('_max')) {
                        const resKey = type.replace('_max', '');
                        if (resources[resKey]) {
                            resources[resKey].max += finalAmount;
                        }
                    } else if (type.endsWith('_rate')) {
                        const resKey = type.replace('_rate', '');
                        if (resources[resKey]) {
                            resources[resKey].rate += finalAmount;
                        }
                    } else if (resources[type]) {
                        // 向後相容：直接使用 type 作為資源 key
                        resources[type].rate += finalAmount;
                    }
                }
            }
        });

        // 4. Apply Talent Multipliers to final rates and caps
        const levelProdBonus = PlayerManager.getLevelProductionBonus();
        const levelSkillCapBonus = PlayerManager.getLevelSkillPointCapBonus();
        const cycleExpansionBonus = PlayerManager.getTalentBonus('cycle_expansion');

        for (const [key, res] of Object.entries(resources)) {
            // 通用產量加成
            res.rate *= (1 + globalProdBonus);
            res.rate *= (1 + swordBonus);

            // 等級生產加成（只對基礎資源生效）
            if (res.type === 'basic') {
                res.rate *= (1 + levelProdBonus);
            }

            // 專屬產量加成
            if (key === 'money') res.rate *= (1 + goldBonus);
            if (key === 'wood' || key === 'spirit_grass_low') res.rate *= (1 + natureBonus);

            // 技能倍率加成（在天賦加成之後應用）
            if (skillMultipliers[key]) {
                res.rate *= skillMultipliers[key];
            }

            // 靈力潮汐 (三元九運)
            if (key === 'lingli') {
                const surge = PlayerManager.getSpiritSurge();
                res.rate *= (1 + surge.bonus);
            }

            // 通用上限加成
            res.max *= (1 + capBonusGlobal);

            // 專屬上限加成
            if (key === 'lingli') res.max *= (1 + lingliCapBonus);

            // 技能點上限加成（等級加成 + 周天循環·擴天賦）
            if (key === 'skill_point') {
                res.max *= (1 + levelSkillCapBonus + cycleExpansionBonus);
            }

            // 進階資源上限加成 (天賦 + 技能)
            if (res.type === 'advance') {
                res.max *= (1 + advanceMaxTalentBonus);
                res.max *= advanceMaxSkillMult;
            }

            // 道心與道證加成 (Request 3)
            const daoHeartBonus = PlayerManager.getDaoHeartBonus();
            const daoProofBonus = PlayerManager.getDaoProofBonus();
            res.rate *= (1 + daoHeartBonus);
            res.max *= (1 + daoProofBonus);

            res.max = Math.floor(res.max);
        }


        // 5. Apply Pill Bonuses (丹藥加成)
        const pillAllProductionBonus = PlayerManager.getPillBonus('allProduction');
        const pillLingliBonus = PlayerManager.getPillBonus('lingliProduction');
        const lingliBuffMultiplier = PlayerManager.getLingliBuffMultiplier(); // 蘊靈丹 buff

        for (const [key, res] of Object.entries(resources)) {
            // 所有資源產出加成（化神丹、破境丹、仙丹、大道聖丹）
            if (pillAllProductionBonus > 0) {
                res.rate *= (1 + pillAllProductionBonus);
            }

            // 靈力產出加成（蘊靈丹永久加成 + buff 倍數）
            if (key === 'lingli') {
                if (pillLingliBonus > 0) {
                    res.rate *= (1 + pillLingliBonus);
                }
                // 應用蘊靈丹 buff（2倍效果）
                res.rate *= lingliBuffMultiplier;
            }
        }

        // 6. Apply Special Multipliers (Synthetic Max)
        const syntheticResources = ['stone_mid', 'stone_high', 'liquid', 'talisman'];
        syntheticResources.forEach(key => {
            if (resources[key]) {
                resources[key].max = Math.floor(resources[key].max * (1 + syntheticMaxMult));
            }
        });
    }

    // Save/Load
    exportData() {
        return {
            buildings: this.buildings,
            maidAutoTargets: this.maidAutoTargets,
            autoBuildEnabled: this.autoBuildEnabled
        };
    }

    loadData(data) {
        if (!data) return;

        // 相容舊存檔：如果是直接的 buildings 物件
        const buildingsData = data.buildings || data;
        const maidAutoTargets = data.maidAutoTargets || {};

        Object.entries(buildingsData).forEach(([id, b]) => {
            if (this.buildings[id]) {
                this.buildings[id].level = b.level;
            }
        });

        // 載入自動合成設定
        this.maidAutoTargets = maidAutoTargets;

        // 載入自動建築設定
        if (data.autoBuildEnabled !== undefined) {
            this.autoBuildEnabled = data.autoBuildEnabled;
        }

        this.recalculateRates();
    }

    reset() {
        Object.keys(this.buildings).forEach(key => {
            let initialLevel = 0;
            if (key === 'hut' || key === 'wooden_house') {
                initialLevel = 1;
            }
            this.buildings[key].level = initialLevel;
        });
        this.recalculateRates();
    }
}
