// src/utils/PlayerManager.js
/**
 * PlayerManager 負責管理玩家的時代、等級、修練開始時間以及重置功能。
 * 資料會儲存在 localStorage 中,以便在重新載入頁面時保留進度。
 */
import EraManager from './EraManager.js';
import SkillManager from './SkillManager.js';
import LanguageManager from './LanguageManager.js';
import SectManager from './SectManager.js';

class PlayerManager {
    constructor() {
        this.storageKey = 'playerState';
        this.defaultState = {
            eraId: 1,          // 初始為 練氣 (eraId 1)
            level: 1,          // 等級 1
            startTimestamp: Date.now(), // 當前境界修練開始時間(毫秒)
            totalStartTimestamp: Date.now(), // 總修練開始時間(毫秒)
            learnedSkills: {}, // 已學習的技能 { id: level }
            rebirthCount: 0,   // 輪迴次數
            daoHeart: 0,       // 道心 (換取天賦)
            daoProof: 0,       // 道證值 (成就位格)
            talents: {},        // 已購天賦 { id: level }
            isReincarnating: false, // 是否正在輪迴狀態 (壽元已盡)
            consumedPills: {},   // 已服用的丹藥 { pillId: count }
            activeBuffs: [],     // 當前生效的 buff { type, multiplier, endTime }
            activePillBuffs: {   // 丹藥BUFF系統
                trainingBoost: null,  // 修煉暴擊 { endTime, multiplier }
                lingliBoost: null     // 靈力加成（舊蘊靈丹，向後兼容）
            },
            pillCooldowns: {},   // 丹藥冷卻 { pillId: endTime }
            hints: {
                rule1Triggered: false, // 壽元 1/3 提示
                lastRule2Year: -1,      // 壽元過半後的週期性提示年份
                shownEraHints: []       // 已顯示過的境界提示 (EraId List)
            }
        };
        this.state = this._loadState();
    }

    _loadState() {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed.eraId && parsed.level) {
                    // 相容性處理：將舊版的 learnedSkills 陣列轉換為物件
                    if (Array.isArray(parsed.learnedSkills)) {
                        const skillObj = {};
                        parsed.learnedSkills.forEach(id => {
                            skillObj[id] = 1;
                        });
                        parsed.learnedSkills = skillObj;
                    }
                    // 使用預設值補全缺失欄位 (Migrate old saves)
                    return { ...this.defaultState, ...parsed };
                }
            } catch (e) {
                console.warn('PlayerManager: 無法解析 playerState,將使用預設值');
            }
        }
        // 若不存在或解析失敗,使用預設值
        this._saveState(this.defaultState);
        return { ...this.defaultState };
    }

    _saveState(state) {
        console.log(`[_saveState] Saving startTimestamp: ${state.startTimestamp}, totalStartTimestamp: ${state.totalStartTimestamp}`);
        localStorage.setItem(this.storageKey, JSON.stringify(state));
    }

    // 用於統一存檔導出
    exportData() {
        return { ...this.state };
    }

    // 用於統一存檔載入
    loadData(data) {
        if (!data) return;
        this.state = { ...this.defaultState, ...data };
        this._saveState(this.state);
        console.log('Player data loaded and storage updated.');
    }

    getEraId() { return Number(this.state.eraId); }
    getLevel() { return this.state.level; }
    getStartTimestamp() { return this.state.startTimestamp; }
    setStartTimestamp(val) {
        console.log(`[setStartTimestamp] ${this.state.startTimestamp} → ${val}`);
        this.state.startTimestamp = val;
        this._saveState(this.state);
    }
    getTotalStartTimestamp() { return this.state.totalStartTimestamp; }
    getLearnedSkills() { return { ...this.state.learnedSkills }; }
    getSkillLevel(skillId) { return this.state.learnedSkills[skillId] || 0; }

    setIsReincarnating(val) {
        this.state.isReincarnating = val;
        this._saveState(this.state);
    }

    getHints() {
        return this.state.hints || { rule1Triggered: false, lastRule2Year: -1 };
    }

    updateHints(newHints) {
        this.state.hints = { ...this.getHints(), ...newHints };
        this._saveState(this.state);
    }

    /**
     * 獲取當前壽元 (遊戲齡：一分鐘 = 一年)
     */
    /**
     * 獲取天賦加成
     */
    getTalentBonus(talentId) {
        if (!this.state || !this.state.talents) return 0;
        const level = this.state.talents[talentId] || 0;
        if (level === 0) return 0;

        const talentRates = {
            innate_dao_body: 0.1,   // 資源產出 +10%
            innate_dao_fetus: 0.15, // 修煉時間減少 15%
            five_elements_root: 0.1, // 消耗減少 10%
            dragon_aura: 0.1,       // 基礎資源上限 +10%
            gold_touch: 0.2,        // 金錢產出 +20%
            nature_friend: 0.2,     // 藥草與靈木產出 +20%
            sword_heart: 0.15,      // 全資源產出 +15% (劍意加持)
            three_flowers: 0.25,    // 靈力上限 +25%
            lifespan_master: 0.1,   // 壽元上限 +10%
            world_child: 0.1,       // 建築效果 +10%
            cycle_expansion: 0.1    // 技能點上限 +10%
        };

        return (talentRates[talentId] || 0) * level;
    }

    /**
     * 獲取道心加成 (0.1% per point)
     */
    getDaoHeartBonus() {
        return (this.state.daoHeart || 0) * 0.001;
    }

    /**
     * 獲取道證加成 (1% per point)
     */
    getDaoProofBonus() {
        return (this.state.daoProof || 0) * 0.01;
    }

    /**
     * 獲取等級帶來的資源生產加成
     * 每級 +1%，計算公式：(eraId - 1) * 10 + level - 1
     * @returns {number} 加成比例 (例如 0.05 = 5%)
     */
    getLevelProductionBonus() {
        const eraId = this.state.eraId;
        const level = this.state.level;
        const totalLevels = (eraId - 1) * 10 + level - 1;
        return totalLevels * 0.01; // 每級 1%
    }

    /**
     * 獲取等級帶來的技能點上限加成
     * 每 5 級 +1%
     * @returns {number} 加成比例 (例如 0.02 = 2%)
     */
    getLevelSkillPointCapBonus() {
        const eraId = this.state.eraId;
        const level = this.state.level;
        const totalLevels = (eraId - 1) * 10 + level;
        return Math.floor(totalLevels / 5) * 0.01;
    }


    /**
     * 購買天賦
     */
    buyTalent(talentId, cost) {
        if (this.state.daoHeart >= cost) {
            this.state.daoHeart -= cost;
            this.state.talents[talentId] = (this.state.talents[talentId] || 0) + 1;
            this._saveState(this.state);
            return true;
        }
        return false;
    }

    /**
     * 服用丹藥
     * @param {string} pillId - 丹藥資源ID
     * @returns {boolean} 是否成功服用
     */
    consumePill(pillId) {
        const pillConfig = this.getPillConfig(pillId);
        if (!pillConfig) {
            console.warn('未知的丹藥:', pillId);
            return false;
        }

        const currentCount = this.state.consumedPills[pillId] || 0;
        if (currentCount >= pillConfig.maxCount) {
            if (window.game && window.game.uiManager) {
                const msg = LanguageManager.getInstance().t('{0}已達服用上限（{1}次）', {
                    '0': LanguageManager.getInstance().t(pillConfig.name),
                    '1': pillConfig.maxCount
                });
                window.game.uiManager.addLog(msg);
            }
            return false;
        }

        // 檢查是否滿足服用境界條件 (針對渡劫丹藥)
        if (pillConfig.effect === 'tribulationSuccess') {
            const lang = LanguageManager.getInstance();

            // 檢查是否已經 100%
            if (this.getTribulationSuccessRate() >= 1) {
                if (window.game && window.game.uiManager) {
                    window.game.uiManager.addLog(lang.t('渡劫成功率已達100%，無需再服用'));
                }
                return false;
            }

            // 境界限制：金丹期及以前(Era < 3)無法服用 (已有的邏輯)
            if (this.state.eraId < 3) {
                if (window.game && window.game.uiManager) {
                    window.game.uiManager.addLog(lang.t('目前境界無法服用'));
                }
                return false;
            }

            // 數量限制：金丹及以上的渡劫丹藥，服用數量不能超過當前境界數
            // 築基丹例外：使用固定上限 maxCount (20)
            // 金丹、渡劫丹等：使用 min(maxCount, eraId)
            if (pillId !== 'foundation_pill') {
                const eraLimit = this.state.eraId;
                if (currentCount >= eraLimit) {
                    if (window.game && window.game.uiManager) {
                        window.game.uiManager.addLog(lang.t('{0}已達當前境界服用上限（{1}顆）', {
                            '0': lang.t(pillConfig.name),
                            '1': eraLimit
                        }));
                    }
                    return false;
                }
            }
        }

        // 檢查是否有足夠的丹藥
        const resource = window.game.resourceManager.getResource(pillId);
        if (!resource || resource.value < 1) {
            if (window.game && window.game.uiManager) {
                const msg = LanguageManager.getInstance().t('{0}數量不足', {
                    '0': LanguageManager.getInstance().t(pillConfig.name)
                });
                window.game.uiManager.addLog(msg);
            }
            return false;
        }

        // 扣除丹藥
        resource.value -= 1;

        // 特殊處理：靈潮爆發丹 (spiritBurst)
        if (pillConfig.effect === 'spiritBurst') {
            // 檢查冷卻
            const cooldownEnd = this.state.pillCooldowns[pillId] || 0;
            if (Date.now() < cooldownEnd) {
                const remainingTime = Math.ceil((cooldownEnd - Date.now()) / 60000);
                if (window.game && window.game.uiManager) {
                    const msg = LanguageManager.getInstance().t('冷卻中，還需 {0} 分鐘', { '0': remainingTime });
                    window.game.uiManager.addLog(msg);
                }
                // 退還丹藥
                resource.value += 1;
                return false;
            }

            // 1. 靈潮爆發：立即獲得 5 分鐘的資源產出
            const resources = window.game.resourceManager.getAllResources();
            let burstLog = [];
            for (const [key, res] of Object.entries(resources)) {
                if (res.unlocked && res.rate > 0) {
                    const burstAmount = res.rate * 300; // 5分鐘 = 300秒
                    window.game.resourceManager.addResource(key, burstAmount);
                    burstLog.push(`${LanguageManager.getInstance().t(key)}+${Math.floor(burstAmount)}`);
                }
            }

            // 2. 資源轉化：靈力 50% → 修煉進度
            const lingliRes = resources['lingli'];
            let convertedTime = 0;
            if (lingliRes && lingliRes.value > 0) {
                const convertAmount = lingliRes.value * 0.5;
                lingliRes.value -= convertAmount;
                // 轉化為修煉時間（1靈力 = 10毫秒修煉時間）
                convertedTime = convertAmount * 10;
                this.state.startTimestamp -= convertedTime;
                this.state.totalStartTimestamp -= convertedTime;
            }

            // 3. 啟動修煉暴擊 BUFF
            this.state.activePillBuffs.trainingBoost = {
                endTime: Date.now() + pillConfig.duration,
                multiplier: 1 + pillConfig.bonus  // 3.0 (1 + 2.0)
            };

            // 4. 設定冷卻
            this.state.pillCooldowns[pillId] = Date.now() + pillConfig.cooldown;

            // 日誌
            if (window.game && window.game.uiManager) {
                const lang = LanguageManager.getInstance();
                window.game.uiManager.addLog(`💥 ${lang.t('靈潮爆發丹')}！`, 'INFO');
                if (burstLog.length > 0) {
                    window.game.uiManager.addLog(`  ✨ 資源爆發：${burstLog.slice(0, 3).join('、')}...`, 'INFO');
                }
                if (convertedTime > 0) {
                    window.game.uiManager.addLog(`  🔄 靈力轉化：修煉時間 +${Math.floor(convertedTime / 1000)}秒`, 'INFO');
                }
                window.game.uiManager.addLog(`  🎯 修煉暴擊 ×${pillConfig.bonus + 1}（持續5分鐘）`, 'INFO');
            }
        } else if (pillConfig.effect === 'lingliBoost') {
            // 舊蘊靈丹邏輯（向後兼容）
            const endTime = Date.now() + pillConfig.duration;
            this.state.activeBuffs.push({
                type: 'lingliBoost',
                multiplier: 1 + pillConfig.bonus,
                endTime: endTime
            });

            const beforeStart = this.state.startTimestamp;
            const beforeTotal = this.state.totalStartTimestamp;

            this.state.startTimestamp -= pillConfig.trainingBonus;
            this.state.totalStartTimestamp -= pillConfig.trainingBonus;

            console.log(`%c[蘊靈丹] startTimestamp: ${beforeStart} → ${this.state.startTimestamp}`, 'color: #4caf50; font-weight: bold');

            if (window.game && window.game.uiManager) {
                const msg = LanguageManager.getInstance().t('服用蘊靈丹效果', {
                    name: LanguageManager.getInstance().t(pillConfig.name)
                });
                window.game.uiManager.addLog(msg);
            }
        } else {
            // 一般丹藥：記錄服用次數
            this.state.consumedPills[pillId] = currentCount + 1;

            if (window.game && window.game.uiManager) {
                const effect = this.getPillEffectDescription(pillConfig);
                let msg = LanguageManager.getInstance().t('服用<b>{0}</b>（{1}/{2}）{3}', {
                    '0': LanguageManager.getInstance().t(pillConfig.name),
                    '1': currentCount + 1,
                    '2': pillConfig.maxCount,
                    '3': effect
                });

                // 如果是渡劫類丹藥，補上當前總成功率
                if (pillConfig.effect === 'tribulationSuccess') {
                    // 重新計算因為已經加入 consumedPills
                    const newRate = this.getTribulationSuccessRate();
                    msg += LanguageManager.getInstance().t('，渡劫成功率: {0}%', { '0': (newRate * 100).toFixed(1) });
                }

                window.game.uiManager.addLog(msg);
            }
        }

        this._saveState(this.state);

        // 重新計算資源產出率（因為加成改變了）
        if (window.game && window.game.buildingManager) {
            window.game.buildingManager.recalculateRates();
        }

        return true;
    }

    /**
     * 管理員/宗門服用丹藥 (不消耗資源，但檢查上限)
     * @param {string} pillId
     * @returns {Object} { success: boolean, msg: string }
     */
    adminConsumePill(pillId) {
        const pillConfig = this.getPillConfig(pillId);
        if (!pillConfig) return { success: false, msg: '未知的丹藥' };

        const currentCount = this.state.consumedPills[pillId] || 0;
        const lang = LanguageManager.getInstance();

        if (currentCount >= pillConfig.maxCount) {
            return {
                success: false,
                msg: lang.t('{0}已達服用上限（{1}次）', {
                    '0': lang.t(pillConfig.name),
                    '1': pillConfig.maxCount
                })
            };
        }

        // 渡劫丹藥檢查
        if (pillConfig.effect === 'tribulationSuccess') {
            if (this.getTribulationSuccessRate() >= 1) {
                return { success: false, msg: lang.t('渡劫成功率已達100%，無需再服用') };
            }
            if (this.state.eraId < 3) {
                return { success: false, msg: lang.t('目前境界無法服用') };
            }
            // 境界數量限制
            if (pillId !== 'foundation_pill' && pillId !== 'sect_high_golden_pill') {
                const eraLimit = this.state.eraId;
                if (currentCount >= eraLimit) {
                    return {
                        success: false,
                        msg: lang.t('{0}已達當前境界服用上限（{1}顆）', {
                            '0': lang.t(pillConfig.name),
                            '1': eraLimit
                        })
                    };
                }
            }
        }

        // Apply Effect
        if (pillConfig.effect === 'lingliBoost') {
            const endTime = Date.now() + pillConfig.duration;
            this.state.activeBuffs.push({
                type: 'lingliBoost',
                multiplier: 1 + pillConfig.bonus,
                endTime: endTime
            });
            this.state.startTimestamp -= pillConfig.trainingBonus;
            this.state.totalStartTimestamp -= pillConfig.trainingBonus;
        } else {
            this.state.consumedPills[pillId] = currentCount + 1;
        }

        this._saveState(this.state);
        // Recalculate rates if necessary (usually for production buffs)
        if (window.game && window.game.buildingManager) {
            window.game.buildingManager.recalculateRates();
        }

        // Log result
        if (window.game && window.game.uiManager) {
            const effect = this.getPillEffectDescription(pillConfig);
            let msg = lang.t('宗門賜予<b>{0}</b>（{1}/{2}）{3}', {
                '0': lang.t(pillConfig.name),
                '1': (this.state.consumedPills[pillId] || 0),
                '2': pillConfig.maxCount,
                '3': effect
            });
            if (pillConfig.effect === 'tribulationSuccess') {
                const newRate = this.getTribulationSuccessRate();
                msg += lang.t('，渡劫成功率: {0}%', { '0': (newRate * 100).toFixed(1) });
            }
            window.game.uiManager.addLog(msg, 'INFO');
        }

        return { success: true, msg: '服用成功' };
    }

    /**
     * 獲取丹藥配置
     */
    getPillConfig(pillId) {
        const configs = {
            foundation_pill: {
                name: '築基丹',
                effect: 'tribulationSuccess',
                bonus: 0.02,   // 每顆 +2% 渡劫成功率
                maxCount: 20
            },
            spirit_nurt_pill: {
                name: '靈潮爆發丹',
                effect: 'spiritBurst',  // 新效果：靈潮爆發
                bonus: 2.0,              // 修煉暴擊倍率（+200% = 3倍速度）
                duration: 300000,        // 持續時間：5分鐘
                cooldown: 600000,        // 冷卻時間：10分鐘
                maxCount: 999            // 無服用上限
            },
            golden_core_pill: {
                name: '金丹',
                effect: 'tribulationSuccess',
                bonus: 0.03,   // 每顆 +3% 渡劫成功率
                maxCount: 15
            },
            sect_high_golden_pill: {
                name: '上品金丹',
                effect: 'tribulationSuccess',
                bonus: 0.05,
                maxCount: 10
            },
            trans_pill: {
                name: '化神丹',
                effect: 'allProduction',
                bonus: 0.01,   // 每顆 +1%
                maxCount: 12
            },
            tribulation_pill: {
                name: '渡劫丹',
                effect: 'tribulationSuccess',
                bonus: 0.05,   // 每顆 +5% 渡劫成功率
                maxCount: 10
            },
            breakthrough_pill: {
                name: '破境丹',
                effect: 'tribulationSuccess',
                bonus: 0.08,   // 每顆 +8% 渡劫成功率
                maxCount: 8
            },
            immortal_pill: {
                name: '仙丹',
                effect: 'allProduction',
                bonus: 0.03,   // 每顆 +3%
                maxCount: 6
            },
            nine_turn_pill: {
                name: '九轉金丹',
                effect: 'trainingSpeed',
                bonus: 0.05,   // 每顆 +5%
                maxCount: 5
            },
            dao_saint_pill: {
                name: '大道聖丹',
                effect: 'allProduction',
                bonus: 0.1,    // 每顆 +10%
                maxCount: 3
            }
        };
        return configs[pillId];
    }

    /**
     * 獲取丹藥效果描述
     */
    getPillEffectDescription(config) {
        const lang = LanguageManager.getInstance();
        const effects = {
            trainingSpeed: lang.t('修煉速度'),
            lingliProduction: lang.t('靈力產出'),
            allProduction: lang.t('所有資源產出'),
            tribulationSuccess: lang.t('渡劫成功率')
        };
        const effectName = effects[config.effect] || lang.t('未知效果');
        const bonusText = config.effect === 'tribulationSuccess'
            ? `+${(config.bonus * 100).toFixed(0)}%`
            : `+${(config.bonus * 100).toFixed(1)}%`;

        // "，{0}{1}" -> e.g. "，修煉速度+5.0%"
        let desc = lang.t('，{0}{1}', { '0': effectName, '1': bonusText });

        // 如果該時期沒有渡劫成功率，則追加提示
        if (config.effect === 'tribulationSuccess' && this.state.eraId < 3) {
            desc += ` (${lang.t('目前境界無法服用')})`;
        }

        return desc;
    }

    /**
     * 獲取丹藥加成
     * @param {string} effectType - 效果類型
     * @returns {number} 加成值
     */
    getPillBonus(effectType) {
        let totalBonus = 0;
        Object.entries(this.state.consumedPills || {}).forEach(([pillId, count]) => {
            const config = this.getPillConfig(pillId);
            if (config && config.effect === effectType) {
                totalBonus += config.bonus * count;
            }
        });
        return totalBonus;
    }

    /**
     * 清理過期的 buff
     */
    cleanExpiredBuffs() {
        const now = Date.now();
        const before = this.state.activeBuffs.length;
        this.state.activeBuffs = this.state.activeBuffs.filter(buff => buff.endTime > now);

        if (before !== this.state.activeBuffs.length) {
            this._saveState(this.state);
            // buff 過期，重新計算產出率
            if (window.game && window.game.buildingManager) {
                window.game.buildingManager.recalculateRates();
            }
        }
    }

    /**
     * 獲取靈力 buff 加成倍數
     * @returns {number} 倍數 (1.0 = 無加成, 2.0 = 2倍)
     */
    getLingliBuffMultiplier() {
        this.cleanExpiredBuffs();
        const lingliBuffs = this.state.activeBuffs.filter(b => b.type === 'lingliBoost');
        if (lingliBuffs.length > 0) {
            // 取最大倍數（如果有多個 buff）
            return Math.max(...lingliBuffs.map(b => b.multiplier));
        }
        return 1.0;
    }

    /**
     * 獲取靈力 buff 剩餘時間（毫秒）
     * @returns {number} 剩餘毫秒數，0 表示無 buff
     */
    getLingliBuffRemainingMs() {
        this.cleanExpiredBuffs();
        const lingliBuffs = this.state.activeBuffs.filter(b => b.type === 'lingliBoost');
        if (lingliBuffs.length > 0) {
            const maxEndTime = Math.max(...lingliBuffs.map(b => b.endTime));
            return Math.max(0, maxEndTime - Date.now());
        }
        return 0;
    }

    /**
     * 獲取已服用丹藥的數量
     */
    getConsumedPillCount(pillId) {
        return this.state.consumedPills[pillId] || 0;
    }

    /**
     * 獲取三元九運 (靈力潮汐) 狀態
     * 每 20 年 (20分鐘) 更換一運，180年一循環
     */
    getSpiritSurge() {
        const totalYears = this.getLifespan();
        const cycle = Math.floor((totalYears % 180) / 20); // 0-8

        const cycles = [
            { name: '一運：坎水運', bonus: 0.10 },
            { name: '二運：坤土運', bonus: -0.05 },
            { name: '三運：震木運', bonus: 0.20 },
            { name: '四運：巽木運', bonus: 0.15 },
            { name: '五運：中土運', bonus: -0.10 },
            { name: '六運：乾金運', bonus: 0.05 },
            { name: '七運：兌金運', bonus: 0.25 },
            { name: '八運：艮土運', bonus: -0.08 },
            { name: '九運：離火運', bonus: 0.30 }
        ];

        return cycles[cycle] || cycles[0];
    }

    getLifespan() {
        const elapsedMs = Date.now() - this.state.totalStartTimestamp;
        // 1 分鐘 (60000ms) = 1 年
        const current = elapsedMs / 60000;
        const max = this.getMaxLifespan();
        return Math.min(current, max);
    }

    /**
     * 獲取壽元上限
     * 第一個時期 80，之後每個時期增加 時期ID * 100
     */
    getMaxLifespan() {
        const currentEraId = this.state.eraId;
        let totalLifespan = 0;

        // 累加從 Era 1 到當前 Era 的所有壽元分配
        for (let i = 1; i <= currentEraId; i++) {
            const era = EraManager.getEraById(i);
            if (era && era.lifespan) {
                totalLifespan += era.lifespan;
            } else {
                // 如果找不到資料，使用舊版補償邏輯
                totalLifespan += (i === 1 ? 80 : i * 100);
            }
        }

        // 天賦加成 (lifespan_master: +10% per level)
        const talentBonus = this.getTalentBonus('lifespan_master');
        totalLifespan *= (1 + talentBonus);

        return Math.floor(totalLifespan);
    }

    /**
     * 縮短當前等級的修練時間
     * 用於宗門任務橘色傳說獎勵
     * @param {number} reduction - 縮短比例 (0.33 = 33%)
     */
    reduceCurrentLevelTime(reduction) {
        // 獲取當前境界升級所需時間
        const era = EraManager.getEraById(this.state.eraId);
        if (!era || !era.levels || !era.levels[this.state.level - 1]) {
            console.warn('reduceCurrentLevelTime: 無法獲取當前等級資料');
            return;
        }

        const levelInfo = era.levels[this.state.level - 1];
        const totalRequiredMs = levelInfo.time * 1000; // 轉換為毫秒

        // 計算要縮短的時間（基於總需求時間的比例）
        const reductionMs = Math.floor(totalRequiredMs * reduction);

        // 調整 startTimestamp（往過去推進 = 已經過的時間增加）
        const beforeStart = this.state.startTimestamp;
        this.state.startTimestamp -= reductionMs;

        console.log(`%c[縮短修練時間] 減少 ${reduction * 100}% = ${reductionMs}ms`, 'color: #ff9800; font-weight: bold');
        console.log(`%c[縮短修練時間] startTimestamp: ${beforeStart} → ${this.state.startTimestamp}`, 'color: #ff9800');

        this._saveState(this.state);
    }

    /**
     * 獲取渡劫成功率
     * @returns {number} 成功率 (0-1)
     */
    getTribulationSuccessRate() {
        const baseRate = 0.5; // 基礎 50%
        const pillBonus = this.getPillBonus('tribulationSuccess');
        return Math.min(1, baseRate + pillBonus); // 最高 100%
    }

    /**
     * 嘗試渡劫（金丹期及以後的升階）
     * @param {Object} currentResources - 當前資源
     * @returns {Object} { success: boolean, newLevel: number, message: string, detailedInfo: object }
     */
    attemptTribulation(currentResources = {}) {
        const successRate = this.getTribulationSuccessRate();
        const random = Math.random();
        const success = random < successRate;

        // 獲取當前境界信息
        const currentEra = EraManager.getEraById(this.state.eraId);
        const currentEraName = currentEra ? currentEra.eraName : `時期${this.state.eraId}`;
        const currentLevel = this.state.level;

        // 獲取丹藥服用狀態
        const pillStatus = this.getPillStatusText();

        if (success) {
            // 成功：正常升階
            const nextEra = EraManager.getEraById(this.state.eraId + 1);
            const nextEraName = nextEra ? nextEra.eraName : `時期${this.state.eraId + 1}`;

            return {
                success: true,
                newLevel: 1,
                newEra: this.state.eraId + 1,
                message: `渡劫成功！成功率: ${(successRate * 100).toFixed(1)}%`,
                detailedInfo: {
                    currentEraName,
                    currentLevel,
                    nextEraName,
                    successRate: (successRate * 100).toFixed(1),
                    pillStatus
                }
            };
        } else {
            // 失敗：等級降低 1-3 級
            const levelDrop = Math.floor(Math.random() * 3) + 1; // 1-3
            const newLevel = Math.max(1, this.state.level - levelDrop);
            return {
                success: false,
                newLevel: newLevel,
                newEra: this.state.eraId,
                levelDrop: levelDrop,
                message: `渡劫失敗！等級降低 ${levelDrop} 級（成功率: ${(successRate * 100).toFixed(1)}%）`,
                detailedInfo: {
                    currentEraName,
                    currentLevel,
                    newLevel,
                    successRate: (successRate * 100).toFixed(1),
                    pillStatus
                }
            };
        }
    }

    /**
     * 獲取丹藥服用狀態文字
     * @returns {string}
     */
    getPillStatusText() {
        const pillTypes = ['tribulation_pill', 'trans_pill', 'foundation_pill', 'qi_pill'];
        const statusParts = [];

        for (const pillKey of pillTypes) {
            const config = this.getPillConfig(pillKey);
            if (config && config.effect === 'tribulationSuccess') {
                const consumed = this.getConsumedPillCount(pillKey);
                if (consumed > 0) {
                    statusParts.push(`${LanguageManager.getInstance().t(config.name)} ${consumed}/${config.maxCount}`);
                }
            }
        }

        return statusParts.length > 0 ? statusParts.join(', ') : LanguageManager.getInstance().t('未服用丹藥');
    }

    /**
     * 檢查是否壽元已盡
     */
    isLifespanExhausted() {
        return this.getLifespan() >= this.getMaxLifespan();
    }

    /**
     * 執行輪迴證道
     */
    reincarnate(buildingsTotal) {
        // 計算獲得的道心與道證 (根據建築總數)
        const newDaoHeart = Math.floor(buildingsTotal / 10);
        const newDaoProof = Math.floor(buildingsTotal / 50);

        this.state.rebirthCount += 1;
        this.state.daoHeart += newDaoHeart;
        this.state.daoProof += newDaoProof;

        // 重置除了輪迴相關資料以外的所有進度
        const talentBackup = { ...this.state.talents };
        const countBackup = this.state.rebirthCount;
        const heartBackup = this.state.daoHeart;
        const proofBackup = this.state.daoProof;

        this.state = {
            ...this.defaultState,
            learnedSkills: {}, // 輪迴後清空功法
            rebirthCount: countBackup,
            daoHeart: heartBackup,
            daoProof: proofBackup,
            talents: talentBackup,
            totalStartTimestamp: Date.now(),
            startTimestamp: Date.now()
        };

        // 重置建築與資源
        if (window.game) {
            window.game.buildingManager.reset();
            window.game.resourceManager.reset();
        }
        SectManager.reset();

        this._saveState(this.state);

        // 立即保存遊戲狀態，確保建築等級被正確保存
        if (window.game.saveSystem) {
            window.game.saveSystem.saveToStorage();
        }

        return { daoHeart: newDaoHeart, daoProof: newDaoProof };
    }

    /**
     * 大道輪迴（需要太虛輪迴境）
     * 比普通輪迴獲得更多道證
     */
    advancedReincarnate(totalBuildingLevel) {
        // 計算道心與道證（大道輪迴道證更多）
        const newDaoHeart = Math.floor(totalBuildingLevel / 10);
        const newDaoProof = Math.floor(totalBuildingLevel / 30); // 普通輪迴是 /50

        this.state.daoHeart += newDaoHeart;
        this.state.daoProof += newDaoProof;
        this.state.rebirthCount += 1;

        // 重置除了輪迴相關資料以外的所有進度
        const talentBackup = { ...this.state.talents };
        const countBackup = this.state.rebirthCount;
        const heartBackup = this.state.daoHeart;
        const proofBackup = this.state.daoProof;

        this.state = {
            ...this.defaultState,
            learnedSkills: {}, // 輪迴後清空功法
            rebirthCount: countBackup,
            daoHeart: heartBackup,
            daoProof: proofBackup,
            talents: talentBackup,
            totalStartTimestamp: Date.now(),
            startTimestamp: Date.now()
        };

        // 重置建築與資源
        if (window.game) {
            window.game.buildingManager.reset();
            window.game.resourceManager.reset();
        }
        SectManager.reset();

        this._saveState(this.state);

        // 立即保存遊戲狀態
        if (window.game.saveSystem) {
            window.game.saveSystem.saveToStorage();
        }

        return { daoHeart: newDaoHeart, daoProof: newDaoProof };
    }

    getTrainingTime() {
        const maxLifespanMs = this.getMaxLifespan() * 60000;
        const totalElapsedMs = Date.now() - this.state.totalStartTimestamp;

        let effectiveNow;
        if (totalElapsedMs >= maxLifespanMs) {
            effectiveNow = this.state.totalStartTimestamp + maxLifespanMs;
        } else {
            effectiveNow = Date.now();
        }

        const elapsedMs = effectiveNow - this.state.startTimestamp;
        const trainingTimeSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);

        return trainingTimeSeconds;
    }

    /**
     * 學習技能
     * @param {string} skillId - 技能 ID
     */
    learnSkill(skillId) {
        const currentLevel = this.getSkillLevel(skillId);
        const skill = SkillManager.getSkill(skillId);

        if (skill && currentLevel < skill.maxLevel) {
            const cost = skill.cost;
            const res = window.game.resourceManager.getResource(cost.type);
            const costReduction = this.getTalentBonus('five_elements_root');

            // 隨等級增加的消耗計算 (可選：目前維持基礎消耗，或在此增加公式)
            const finalCost = Math.floor(cost.amount * (1 - costReduction));

            if (res && res.value >= finalCost) {
                res.value -= finalCost;
                this.state.learnedSkills[skillId] = currentLevel + 1;
                this._saveState(this.state);

                const actionName = currentLevel === 0 ? LanguageManager.getInstance().t('領悟') : LanguageManager.getInstance().t('提升');
                if (window.game && window.game.uiManager) {
                    const msg = LanguageManager.getInstance().t('{0}功法 <b>{1}</b> (Lv.{2})', {
                        '0': actionName,
                        '1': LanguageManager.getInstance().t(skill.name),
                        '2': this.state.learnedSkills[skillId]
                    });
                    window.game.uiManager.addLog(msg);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * 判斷是否可以升階(使用 EraManager 的條件檢查)
     * @param {Object} currentResources - 當前資源狀態
     * @returns {Object} { canUpgrade: boolean, reason: string }
     */
    canUpgrade(currentResources = {}) {
        if (this.isLifespanExhausted()) {
            return { canUpgrade: false, reason: LanguageManager.getInstance().t('壽元已盡，無法突破') };
        }
        return EraManager.checkUpgradeRequirements(
            this.state.eraId,
            this.state.level,
            this.state.learnedSkills,
            currentResources
        );
    }

    /**
     * 執行升階,等級重置為 1,時代 +1
     * @param {Object} currentResources - 當前資源狀態
     * @returns {boolean} 是否成功升階
     */
    upgrade(currentResources = {}) {
        const check = this.canUpgrade(currentResources);
        if (!check.canUpgrade) {
            console.warn('無法升階:', check.reason);
            return false;
        }

        // 金丹期（Era 3）及以後需要渡劫
        if (this.state.eraId >= 3) {
            const result = this.attemptTribulation(currentResources);

            if (result.success) {
                // 渡劫成功
                this.state.eraId = result.newEra;
                this.state.level = result.newLevel;
                this.state.startTimestamp = Date.now();
                this._saveState(this.state);

                if (window.game && window.game.uiManager) {
                    const info = result.detailedInfo;
                    const lang = LanguageManager.getInstance();
                    // SUCCESS LOG
                    const msgSuccess = lang.t(
                        '<b style="color:#4caf50">{0}</b> 在<b>{1}</b>第<b>{2}</b>級，使用<b style="color:#ffd700">{3}%</b>成功率進行渡劫成功！進入<b style="color:#00bcd4">{4}</b>。<span style="color:#aaa">（{5}）</span>',
                        {
                            '0': lang.t('渡劫成功！'),
                            '1': lang.t(info.currentEraName),
                            '2': info.currentLevel,
                            '3': info.successRate,
                            '4': lang.t(info.nextEraName),
                            '5': info.pillStatus // pillars Status already localized parts of it
                        }
                    );
                    window.game.uiManager.addLog(msgSuccess, 'SYSTEM');
                }
                return true;
            } else {
                // 渡劫失敗
                this.state.level = result.newLevel;
                this._saveState(this.state);

                if (window.game && window.game.uiManager) {
                    const info = result.detailedInfo;
                    const lang = LanguageManager.getInstance();
                    // FAIL LOG
                    const msgFail = lang.t(
                        '<b style="color:#f44336">{0}</b> 在<b>{1}</b>第<b>{2}</b>級，使用<b style="color:#ffd700">{3}%</b>成功率進行渡劫失敗！等級降低為<b style="color:#ff9800">{4}</b>級。<span style="color:#aaa">（{5}）</span>',
                        {
                            '0': lang.t('渡劫失敗！'),
                            '1': lang.t(info.currentEraName),
                            '2': info.currentLevel,
                            '3': info.successRate,
                            '4': info.newLevel,
                            '5': info.pillStatus
                        }
                    );
                    window.game.uiManager.addLog(msgFail, 'SYSTEM');
                }
                return false;
            }
        } else {
            // 練氣期和築基期：正常升階
            this.state.eraId += 1;
            this.state.level = 1;
            this.state.startTimestamp = Date.now();
            this._saveState(this.state);

            if (window.game && window.game.uiManager) {
                const newEra = EraManager.getEraById(this.state.eraId);
                const eraName = newEra ? LanguageManager.getInstance().t(newEra.eraName) : this.state.eraId;
                const msg = LanguageManager.getInstance().t('境界突破！晉升至 <b>{0}</b>', { '0': eraName });
                window.game.uiManager.addLog(msg, 'SYSTEM');
            }
            return true;
        }
    }

    /**
     * 檢查是否可以提升等級(使用 EraManager 的條件檢查)
     * @param {Object} currentResources - 當前資源 { resourceId: amount }
     * @returns {Object} { canLevelUp: boolean, reason: string, ... }
     */
    canLevelUp(currentResources = {}) {
        if (this.isLifespanExhausted()) {
            return { canLevelUp: false, reason: '壽元已盡，無法修煉' };
        }
        const trainingTime = this.getTrainingTime();

        // 基礎天賦加成
        const talentTimeBonus = this.getTalentBonus('innate_dao_fetus');

        // 輪迴加成：每點道心提高 0.1% 修煉速度，每點道證提高 1%
        // 注意：這裡是提高「速度」，公式為 Speed = 1 + Bonus, requiredTime = BaseTime / Speed
        const daoHeartBonus = this.getDaoHeartBonus();
        const daoProofBonus = this.getDaoProofBonus();

        // 丹藥加成（築基丹、金丹、九轉金丹）
        const pillTrainingBonus = this.getPillBonus('trainingSpeed');

        // 宗門聚靈陣加成 (Lv4+)
        let sectSpeedBonus = 0;
        if (window.game && window.game.sectManager && window.game.sectManager.getSectLevel() >= 4) {
            sectSpeedBonus = 0.5; // (1 + 0.5) = 1.5x speed
        }

        const totalSpeedBonus = talentTimeBonus + daoHeartBonus + daoProofBonus + pillTrainingBonus + sectSpeedBonus;

        const costReduction = this.getTalentBonus('five_elements_root');

        return EraManager.checkLevelUpRequirements(
            this.state.eraId,
            this.state.level,
            trainingTime,
            this.state.learnedSkills,
            currentResources,
            { timeBonus: totalSpeedBonus, costReduction }
        );
    }

    /**
     * 提升等級
     * @param {Object} currentResources - 當前資源(用於檢查)
     * @returns {boolean} 是否成功升級
     */
    increaseLevel(currentResources = {}) {
        const check = this.canLevelUp(currentResources);
        if (!check.canLevelUp) {
            console.warn('無法升級:', check.reason);
            return false;
        }

        if (this.state.level < 10) {
            this.state.level += 1;

            // 2. 扣除資源
            const costLogParts = [];
            const eraId = this.state.eraId;
            // 注意：因為已經 level+1，計算 requirement 應該用原本的 level (即 this.state.level - 1)
            // 但 checkLevelUpRequirements 是檢查 "能不能升到下一級" 還是 "從當前級升上去"？
            // 看 EraManager logic: `getLevelUpResourceCost(eraId, currentLevel)`
            // 如果 currentLevel 是 1，回傳的是 "升到 2" 的消耗。
            // 我們現在已經 +1 了，所以我們應該用 `this.state.level - 1` 來獲取剛才那次升級的消耗。
            const prevLevel = this.state.level - 1;
            const resCosts = EraManager.getLevelUpResourceCost(eraId, prevLevel);

            // 計算天賦減免
            const talentReduction = this.getTalentBonus('five_elements_root');

            Object.entries(resCosts).forEach(([resId, baseAmount]) => {
                const amount = Math.floor(baseAmount * (1 - talentReduction));
                const res = window.game.resourceManager.getResource(resId);
                if (res) {
                    res.value -= amount;
                    const resName = LanguageManager.getInstance().t(EraManager._getResName(resId));
                    costLogParts.push(`${resName} -${amount}`);
                }
            });

            // 檢查 LV9 特殊消耗 (EraManager.checkLevelUpRequirements 也有這段邏輯)
            // 如果 prevLevel 是 9 (即從 9 升到 10)，可能有特殊道具消耗
            const era = EraManager.getEraById(eraId);
            if (prevLevel === 9 && era.lv9Item) {
                const lv9Type = era.lv9Item.type;
                const lv9Amount = Math.floor(era.lv9Item.amount * (1 - talentReduction));
                const res = window.game.resourceManager.getResource(lv9Type);
                if (res) {
                    res.value -= lv9Amount;
                    const resName = LanguageManager.getInstance().t(EraManager._getResName(lv9Type));
                    costLogParts.push(`${resName} -${lv9Amount}`);
                }
            }

            this._saveState(this.state);
            if (window.game && window.game.uiManager) {
                const msg = LanguageManager.getInstance().t('突破成功！當前等級提升至 <b>{0}</b>', { '0': this.state.level });
                window.game.uiManager.addLog(msg);

                // 顯示資源消耗日誌 (DEV TAG)
                if (costLogParts.length > 0) {
                    const costMsg = `<span style="color:#888; font-size:0.9em;">[DEV] ${LanguageManager.getInstance().t('消耗')}: ${costLogParts.join(', ')}</span>`;
                    window.game.uiManager.addLog(costMsg, 'DEV');
                }
            }
            return true;
        }
        return false;
    }

    /**
     * 重置所有進度
     */
    reset() {
        const newState = {
            ...this.defaultState,
            startTimestamp: Date.now(),
            totalStartTimestamp: Date.now(),
            learnedSkills: {},
            talents: {},
            rebirthCount: 0,
            daoHeart: 0,
            daoProof: 0
        };
        this.state = newState;
        this._saveState(this.state);

        // 重置建築與資源
        if (window.game) {
            if (window.game.buildingManager) window.game.buildingManager.reset();
            if (window.game.resourceManager) window.game.resourceManager.reset();

            // 清除 SaveSystem 的存檔
            if (window.game.saveSystem) {
                localStorage.removeItem(window.game.saveSystem.storageKey);
            } else {
                localStorage.removeItem('cultivation_game_save');
            }
        }

        // 重置宗門系統
        SectManager.reset();
        localStorage.removeItem('sectState');

        // 清除 PlayerManager 存檔
        localStorage.removeItem(this.storageKey);
    }
}

const playerManagerInstance = new PlayerManager();

// 暴露到 window 以便調試
if (typeof window !== 'undefined') {
    window.PlayerManager = playerManagerInstance;
}

export default playerManagerInstance;
