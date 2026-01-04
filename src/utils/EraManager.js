import CSVLoader from './CSVLoader.js?v=2';
import SkillManager from './SkillManager.js';
import LanguageManager from './LanguageManager.js';

class EraManager {
    constructor() {
        this.eras = [];
        this.eraMap = new Map();
        this.isLoaded = false;
    }

    /**
     * 初始化時代資料
     */
    async init() {
        if (this.isLoaded) return;

        console.log('Loading Eras...');
        const rawData = await CSVLoader.loadCSV('./src/data/eras.csv');
        this.eras = CSVLoader.convertToEras(rawData);

        // 建立快速查詢的 Map
        this.eraMap.clear();
        this.eras.forEach(era => {
            this.eraMap.set(era.eraId, era);
        });

        this.isLoaded = true;
        console.log('Eras Loaded:', this.eras.length);
    }

    /**
     * 檢查資料是否已載入，若未載入則拋出警告
     */
    _checkLoaded() {
        if (!this.isLoaded) {
            console.warn('EraManager: 資料尚未載入，請確保已調用 await init()');
        }
    }

    /**
     * 根據 eraId 獲取時代資訊
     * @param {number} eraId - 時代 ID (1-12)
     * @returns {Object|null} 時代物件或 null
     */
    getEraById(eraId) {
        this._checkLoaded();
        return this.eraMap.get(Number(eraId)) || null;
    }

    /**
     * 獲取所有時代列表
     * @returns {Array} 時代陣列
     */
    getAllEras() {
        this._checkLoaded();
        return [...this.eras];
    }

    /**
     * 獲取下一個時代
     * @param {number} currentEraId - 當前時代 ID
     * @returns {Object|null} 下一個時代物件或 null
     */
    getNextEra(currentEraId) {
        if (currentEraId >= 12) return null;
        return this.getEraById(currentEraId + 1);
    }

    /**
     * 檢查是否為最後一個時代
     * @param {number} eraId - 時代 ID
     * @returns {boolean}
     */
    isLastEra(eraId) {
        return eraId >= 12;
    }

    /**
     * 獲取時代總數
     * @returns {number}
     */
    getTotalEras() {
        return this.eras.length;
    }

    /**
     * 根據時代 ID 獲取資源倍率
     * @param {number} eraId - 時代 ID
     * @returns {number} 資源倍率
     */
    getResourceMultiplier(eraId) {
        const era = this.getEraById(eraId);
        return era ? era.resourceMultiplier : 1.0;
    }

    /**
     * 檢查是否滿足昇階條件
     * @param {number} eraId - 當前時代 ID
     * @param {number} currentLevel - 當前等級
     * @param {Array} learnedSkills - 已學習的技能 ID 陣列
     * @param {Object} currentResources - 當前資源狀態 (包含 max 資訊)
     * @returns {Object} { canUpgrade: boolean, missingSkills: Array, reason: string }
     */
    checkUpgradeRequirements(eraId, currentLevel, learnedSkills = [], currentResources = {}) {
        const era = this.getEraById(eraId);
        if (!era) {
            return { canUpgrade: false, missingSkills: [], reason: '無效的時代' };
        }

        if (this.isLastEra(eraId)) {
            return { canUpgrade: false, missingSkills: [], reason: '已達最高時代' };
        }

        const requirements = era.upgradeRequirements;

        // 檢查等級
        if (currentLevel < requirements.level) {
            return {
                canUpgrade: false,
                missingSkills: [],
                reason: LanguageManager.getInstance().t('等級不足 (需要 {level} 級)', { level: requirements.level })
            };
        }

        // 檢查容量限制 (Request 1)
        if (requirements.capacity) {
            const missingCap = [];
            for (const [resKey, reqMax] of Object.entries(requirements.capacity)) {
                // resKey 可能格式為 "lingli_max"
                const resId = resKey.replace('_max', '');
                const res = currentResources[resId];
                if (!res || res.max < reqMax) {
                    const lang = LanguageManager.getInstance();
                    const resName = lang.t(this._getResName(resId));
                    missingCap.push(lang.t('{resName}上限需達到 {reqMax}', { resName, reqMax }));
                }
            }
            if (missingCap.length > 0) {
                return {
                    canUpgrade: false,
                    missingSkills: [],
                    reason: LanguageManager.getInstance().t('境界底蘊不足: {details}', { details: missingCap.join(', ') })
                };
            }
        }

        // 檢查前置技能
        const missingSkillInfo = [];
        requirements.skills.forEach(reqStr => {
            const parts = reqStr.split(':');
            const skillId = parts[0];
            const reqLevel = parts.length > 1 ? parseInt(parts[1]) : 1;
            const currentLevel = learnedSkills[skillId] || 0;

            if (currentLevel < reqLevel) {
                const skill = SkillManager.getSkill(skillId);
                const skillName = skill ? skill.name : skillId;
                missingSkillInfo.push(`${skillName} Lv.${reqLevel}`);
            }
        });

        if (missingSkillInfo.length > 0) {
            return {
                canUpgrade: false,
                missingSkills: missingSkillInfo,
                reason: LanguageManager.getInstance().t('缺少前置功法: {skills}', { skills: missingSkillInfo.join('、') })
            };
        }

        return { canUpgrade: true, missingSkills: [], reason: LanguageManager.getInstance().t('滿足昇階條件') };
    }

    /**
     * 內部輔助：獲取資源名稱
     */
    _getResName(key) {
        const map = {
            lingli: '靈力',
            money: '金錢',
            wood: '靈木',
            stone_low: '下品靈石',
            spirit_grass_low: '低階靈草',
            stone_mid: '中品靈石',
            stone_high: '上品靈石',
            // 向後相容舊ID
            stone: '下品靈石',
            herb: '藥草',
            middle_stone: '中品靈石',
            high_stone: '上品靈石'
        };
        return map[key] || key;
    }

    /**
     * 檢查是否滿足等級提升條件
     * @param {number} eraId - 當前時代 ID
     * @param {number} currentLevel - 當前等級
     * @param {number} trainingTime - 累積修練時間(秒)
     * @param {Array} learnedSkills - 已學習的技能 ID 陣列
     * @param {Object} currentResources - 當前資源 { resourceId: amount }
     * @param {Object} talentBonuses - 天賦加成 { timeBonus: number, costReduction: number }
     * @returns {Object} { canLevelUp: boolean, missingSkills: Array, missingResources: Object, requiredTime: number, reason: string }
     */
    checkLevelUpRequirements(eraId, currentLevel, trainingTime = 0, learnedSkills = [], currentResources = {}, talentBonuses = { timeBonus: 0, costReduction: 0 }) {
        const era = this.getEraById(eraId);
        if (!era) {
            return {
                canLevelUp: false,
                missingSkills: [],
                missingResources: {},
                requiredTime: 0,
                reason: '無效的時代'
            };
        }

        // 檢查是否已達最高等級
        if (currentLevel >= era.maxLevel) {
            return {
                canLevelUp: false,
                missingSkills: [],
                missingResources: {},
                requiredTime: 0,
                reason: '已達最高等級'
            };
        }

        const requirements = era.levelUpRequirements;

        // 計算累計所需的修練時間 (累加從 Lv1 到當前 Lv)
        // 使用等比級數公式: a * (1 - r^n) / (1 - r)
        const a = requirements.baseTime;
        const r = requirements.timeMultiplier;
        const n = currentLevel; // 玩家身在 Lv.n 時，要突破需要的是累計到該級別的總時間

        let requiredTime;
        if (r === 1) {
            requiredTime = a * n;
        } else {
            requiredTime = a * (1 - Math.pow(r, n)) / (1 - r);
        }

        // 天賦與輪迴加成 (Speed = 1 + Bonus)
        const timeBonus = talentBonuses.timeBonus || 0;
        requiredTime /= (1 + timeBonus);

        // 功法加成 (time_reduction)
        let skillTimeMult = 1;
        Object.entries(learnedSkills).forEach(([skillId, level]) => {
            const skill = SkillManager.getSkill(skillId);
            if (skill && skill.effects && skill.effects.type === 'time_reduction') {
                // 每級減少 (1 - amount). 例如 amount 為 0.9 則每級減 10%
                skillTimeMult *= (1 - (1 - skill.effects.amount) * level);
            }
        });
        requiredTime *= Math.max(0.1, skillTimeMult); // 最多減少 90% 時間 (保留 10%)

        // 檢查修練時間
        if (trainingTime < requiredTime) {
            return {
                canLevelUp: false,
                missingSkills: [],
                missingResources: {},
                requiredTime,
                reason: LanguageManager.getInstance().t('修練時間不足 (需要 {years} 年)', { years: (requiredTime / 60).toFixed(2) })
            };
        }

        // 檢查前置技能
        const missingSkillInfo = [];
        requirements.skills.forEach(reqStr => {
            const parts = reqStr.split(':');
            const skillId = parts[0];
            const reqLevel = parts.length > 1 ? parseInt(parts[1]) : 1;
            const currentLevel = learnedSkills[skillId] || 0;

            if (currentLevel < reqLevel) {
                const skill = SkillManager.getSkill(skillId);
                const skillName = skill ? skill.name : skillId;
                missingSkillInfo.push(`${skillName} Lv.${reqLevel}`);
            }
        });

        if (missingSkillInfo.length > 0) {
            const lang = LanguageManager.getInstance();
            return {
                canLevelUp: false,
                missingSkills: missingSkillInfo,
                missingResources: {},
                requiredTime,
                reason: lang.t('缺少前置功法: {skills}', { skills: missingSkillInfo.join('、') })
            };
        }

        // 檢查資源
        const missingResources = {};
        const costReduction = talentBonuses.costReduction || 0;

        for (let [resourceId, requiredAmount] of Object.entries(requirements.resources)) {
            requiredAmount = Math.floor(requiredAmount * (1 - costReduction));
            const currentAmount = currentResources[resourceId] || 0;
            if (currentAmount < requiredAmount) {
                missingResources[resourceId] = requiredAmount - currentAmount;
            }
        }

        if (Object.keys(missingResources).length > 0) {
            return {
                canLevelUp: false,
                missingSkills: [],
                missingResources,
                requiredTime,
                reason: LanguageManager.getInstance().t('資源不足')
            };
        }

        return {
            canLevelUp: true,
            missingSkills: [],
            missingResources: {},
            requiredTime,
            reason: LanguageManager.getInstance().t('滿足升級條件')
        };
    }

    /**
     * 獲取等級提升所需的資源
     * @param {number} eraId - 時代 ID
     * @param {number} currentLevel - 當前等級
     * @returns {Object} 資源需求 { resourceId: amount }
     */
    getLevelUpResourceCost(eraId, currentLevel) {
        const era = this.getEraById(eraId);
        if (!era || currentLevel >= era.maxLevel) {
            return {};
        }
        return { ...era.levelUpRequirements.resources };
    }

    /**
     * 獲取等級提升所需的修練時間
     * @param {number} eraId - 時代 ID
     * @param {number} currentLevel - 當前等級
     * @returns {number} 所需時間(秒)
     */
    getLevelUpRequiredTime(eraId, currentLevel) {
        const era = this.getEraById(eraId);
        if (!era || currentLevel >= era.maxLevel) {
            return 0;
        }
        const requirements = era.levelUpRequirements;
        return requirements.baseTime * Math.pow(requirements.timeMultiplier, currentLevel);
    }
}

// 導出單例
export default new EraManager();
