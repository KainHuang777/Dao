import { Buildings } from '../data/Buildings.js';
import PlayerManager from '../utils/PlayerManager.js';
import Formatter from '../utils/Formatter.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class BuildingPanel {
    constructor(buildingManager, resourceManager) {
        this.buildingManager = buildingManager;
        this.resourceManager = resourceManager;
        this.container = document.getElementById('view-buildings');
        this.elements = {}; // Cache
        this.isCompactMode = true; // 預設為短描述模式
    }

    init() {
        this.render();
        // Start a loop to update button states (enable/disable)
        setInterval(() => this.update(), 500);
    }

    render() {
        this.container.innerHTML = '';
        this.elements = {}; // Clear cache

        // 添加切換按鈕
        const toggleContainer = document.createElement('div');
        toggleContainer.style.marginBottom = '15px';
        toggleContainer.style.textAlign = 'right';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn';
        toggleBtn.textContent = this.isCompactMode ? LanguageManager.getInstance().t('切換至長描述') : LanguageManager.getInstance().t('切換至短描述');
        toggleBtn.style.padding = '5px 15px';
        toggleBtn.style.fontSize = '0.9em';
        toggleBtn.onclick = () => {
            this.isCompactMode = !this.isCompactMode;
            this.render();
        };

        toggleContainer.appendChild(toggleBtn);
        this.container.appendChild(toggleContainer);

        const currentEraId = PlayerManager.getEraId();

        // 分類建築並檢查前置條件
        const producerIds = [];
        const storageIds = [];

        Object.keys(Buildings).forEach(id => {
            const def = Buildings[id];

            // 檢查前置條件 (Request 3)
            const state = this.buildingManager.getBuilding(id);
            if (state && state.level > 0) {
                // 已建造的建築始終顯示
            } else if (!this.checkPrerequisites(def, currentEraId)) {
                return;
            }

            const effects = def.effects || {};
            // 只要有任何非上限類的效果（且不是 skill_point），就優先歸類為生產建築
            const hasRate = Object.keys(effects).some(k =>
                !k.endsWith('_max') &&
                !k.endsWith('_mult') &&
                k !== 'skill_point' &&
                k !== 'daoHeart' &&
                k !== 'daoProof'
            );
            const isStorage = Object.keys(effects).some(k => k.endsWith('_max') || k.endsWith('_mult'));

            if (hasRate) producerIds.push(id);
            else if (isStorage) storageIds.push(id);
            else producerIds.push(id); // 預設歸類為生產
        });

        const renderSection = (title, ids) => {
            if (ids.length === 0) return;

            const section = document.createElement('div');
            section.className = 'building-section';
            section.style.marginBottom = '20px';

            const h2 = document.createElement('h2');
            h2.textContent = title;
            h2.className = 'section-title';
            h2.style.borderLeft = '4px solid var(--accent-color)';
            h2.style.paddingLeft = '10px';
            h2.style.marginBottom = '10px';
            h2.style.fontSize = '1.1em';
            section.appendChild(h2);

            const list = document.createElement('div');
            list.className = this.isCompactMode ? 'building-grid compact' : 'building-list detailed';

            ids.forEach(id => {
                const def = Buildings[id];
                const item = document.createElement('div');
                item.className = 'building-item';
                // 數據屬性用於查找
                item.dataset.id = id;

                const info = document.createElement('div');
                info.className = this.isCompactMode ? 'b-info compact' : 'b-info detailed';

                const titleLine = document.createElement('div');
                titleLine.className = 'b-title-line';

                const nameH3 = document.createElement('h3');
                nameH3.className = 'b-name';
                // 嘗試使用 ID 翻譯，找不到則回退到名稱翻譯
                const lm = LanguageManager.getInstance();
                let displayName = lm.t(def.id);
                if (displayName === def.id) {
                    displayName = lm.t(def.name);
                }
                nameH3.textContent = displayName + ' ';

                const levelInfo = document.createElement('span');
                levelInfo.className = 'b-level';
                levelInfo.textContent = 'Lv.0';

                nameH3.appendChild(levelInfo);
                titleLine.appendChild(nameH3);
                info.appendChild(titleLine);

                // 在緊湊模式下添加效果顯示區域
                let effectsEl = null;
                let effectEl = null;
                let costEl = null;
                let descEl = null;

                if (this.isCompactMode) {
                    effectsEl = document.createElement('div');
                    effectsEl.className = 'b-effects';
                    effectsEl.style.fontSize = '0.85em';
                    effectsEl.style.color = '#4caf50';
                    effectsEl.style.marginTop = '5px';
                    effectsEl.style.lineHeight = '1.3';
                    info.appendChild(effectsEl);
                } else {
                    // 長描述模式：添加效果、消耗、描述區域
                    effectEl = document.createElement('div');
                    effectEl.className = 'b-effect';
                    effectEl.style.fontSize = '0.9em';
                    effectEl.style.color = '#4caf50';
                    effectEl.style.marginTop = '5px';
                    info.appendChild(effectEl);

                    costEl = document.createElement('div');
                    costEl.className = 'cost-tip';
                    costEl.style.fontSize = '0.85em';
                    costEl.style.color = '#aaa';
                    costEl.style.marginTop = '5px';
                    info.appendChild(costEl);

                    descEl = document.createElement('div');
                    descEl.className = 'b-desc';
                    descEl.style.fontSize = '0.85em';
                    descEl.style.color = '#aaa';
                    descEl.style.fontStyle = 'italic';
                    descEl.style.marginTop = '5px';
                    descEl.textContent = LanguageManager.getInstance().t(def.description);
                    info.appendChild(descEl);
                }

                // 移除原有的 action 按鈕區域，改為點擊整個卡片或右上角小按鈕
                // 為了保持簡單，我們先保留一個點擊事件在 item 上，或者添加一個明確的按鈕
                // 需求說 "Upgrade Button (maybe icon or small text)"
                // 我們可以在卡片底部加一個小的 "升級" 字樣或進度條，或者直接讓 upgrade-available 樣式處理

                // 添加點擊升級事件
                item.onclick = () => {
                    if (this.buildingManager.upgrade(id)) {
                        this.updateEntry(id, true); // 點擊升級後強制更新一次
                    }
                };

                // 當鼠標進入時，強制更新一次 Tooltip，獲取最新時間
                item.onmouseenter = () => {
                    this.updateEntry(id, true);
                };

                // 特殊 UI：侍女 (Maid) 切換開關 (保持原樣，顯示在 Tooltip 或特殊處理？)
                // 由於壓縮空間，侍女開關可能需要獨立 UI。
                // 暫時將侍女開關放在 Tooltip 中可能不方便點擊。
                // 讓我們為侍女添加一個額外的小控制欄在卡片底部



                item.appendChild(info);
                list.appendChild(item);

                this.elements[id] = {
                    itemEl: item,
                    levelEl: levelInfo,
                    effectsEl: effectsEl,  // 緊湊模式
                    effectEl: effectEl,    // 長描述模式
                    costEl: costEl,        // 長描述模式
                    descEl: descEl,        // 長描述模式
                    maidControl: null
                };

                this.updateEntry(id);
            });

            section.appendChild(list);
            this.container.appendChild(section);
        };

        renderSection(LanguageManager.getInstance().t('資源產出'), producerIds);
        renderSection(LanguageManager.getInstance().t('資產儲存'), storageIds);
    }

    checkPrerequisites(def, currentEraId) {
        // 檢查時代
        if (def.era && currentEraId < def.era) {
            return false;
        }

        // 檢查前置建築 (假設至少要 1 級)
        if (def.prereqBuilding && def.prereqBuilding !== '0' && def.prereqBuilding !== 0) {
            const prereqState = this.buildingManager.getBuilding(def.prereqBuilding);
            if (!prereqState || prereqState.level < 1) return false;
        }

        // 特殊檢查：儲物戒指需擁有上品靈石 > 1
        if (def.id === 'storage_ring') {
            const highStone = this.resourceManager.getResource('high_stone');
            if (!highStone || highStone.value <= 1) return false;
        }

        return true;
    }

    /**
     * 更新單個建築的顯示內容
     * @param {string} id - 建築 ID
     * @param {boolean} forceTooltip - 是否強制更新 Tooltip（預設為 false，避免懸停時刷新導致閃動）
     */
    updateEntry(id, forceTooltip = false) {
        const state = this.buildingManager.getBuilding(id);
        const els = this.elements[id];
        if (!state || !els) return;

        // 1. 更新等級顯示
        const levelCap = this.buildingManager.getBuildingLevelCap(id);
        els.levelEl.textContent = `Lv. ${state.level}/${levelCap}`;

        if (state.level >= levelCap) {
            els.levelEl.style.color = '#ff9800'; // 滿級警告色
        } else {
            els.levelEl.style.color = '#ccc';
        }



        // 3. 構建 Tooltip 內容
        const tooltipLines = [];
        const lang = LanguageManager.getInstance();
        const def = Buildings[id];

        // --- 效果 ---
        if (def.effects) {
            const effectTexts = [];
            const tooltipEffectTexts = [];

            for (const [resKey, amountPerLevel] of Object.entries(def.effects)) {
                const buildingEffectBonus = PlayerManager.getTalentBonus('world_child');
                const finalAmount = amountPerLevel * (1 + buildingEffectBonus);
                const weight = def.effectWeight || 0;
                let currentBonus, nextBonus, nextNextBonus;

                if (resKey === 'all_max') {
                    currentBonus = finalAmount * state.level;
                    nextBonus = finalAmount * (state.level + 1);
                    nextNextBonus = finalAmount * (state.level + 2);

                    const displayBonus = state.level > 0 ? currentBonus : nextBonus;
                    effectTexts.push(`${lang.t('全資源上限')}: +${Formatter.formatBigNumber(displayBonus)}`);
                    tooltipEffectTexts.push(
                        `${lang.t('全資源上限')}: +${Formatter.formatBigNumber(currentBonus)}` +
                        (state.level < levelCap ? ` → +${Formatter.formatBigNumber(nextBonus)}` : '')
                    );
                } else if (resKey === 'all_rate') {
                    currentBonus = finalAmount * Math.pow(state.level + weight, 2);
                    nextBonus = finalAmount * Math.pow(state.level + 1 + weight, 2);
                    nextNextBonus = finalAmount * Math.pow(state.level + 2 + weight, 2);

                    const displayBonus = state.level > 0 ? currentBonus : nextBonus;
                    effectTexts.push(`${lang.t('全資源產出')}: ${Formatter.formatRate(displayBonus)}/${lang.t('秒')}`);
                    tooltipEffectTexts.push(
                        `${lang.t('全資源產出')}: ${Formatter.formatRate(currentBonus)}/${lang.t('秒')}` +
                        (state.level < levelCap ? ` → ${Formatter.formatRate(nextBonus)}/${lang.t('秒')}` : '')
                    );
                } else if (resKey.endsWith('_max')) {
                    const realKey = resKey.replace('_max', '');
                    const currentMaxVal = finalAmount * state.level;
                    const nextMaxVal = finalAmount * (state.level + 1);
                    const nextNextMaxVal = finalAmount * (state.level + 2);

                    const displayMaxVal = state.level > 0 ? currentMaxVal : nextMaxVal;
                    effectTexts.push(`${this.getResName(realKey)}${lang.t('上限')}: +${Formatter.formatBigNumber(displayMaxVal)}`);
                    tooltipEffectTexts.push(
                        `${this.getResName(realKey)}${lang.t('上限')}: +${Formatter.formatBigNumber(currentMaxVal)}` +
                        (state.level < levelCap ? ` → +${Formatter.formatBigNumber(nextMaxVal)}` : '')
                    );
                } else if (resKey === 'synthetic_max_mult') {
                    const currentBonus = Math.round(finalAmount * state.level * 100);
                    const nextBonus = Math.round(finalAmount * (state.level + 1) * 100);
                    const nextNextBonus = Math.round(finalAmount * (state.level + 2) * 100);

                    const displayBonus = state.level > 0 ? currentBonus : nextBonus;
                    effectTexts.push(`${lang.t('合成資源容量')}: +${displayBonus}%`);
                    tooltipEffectTexts.push(
                        `${lang.t('合成資源容量')}: +${currentBonus}%` +
                        (state.level < levelCap ? ` → +${nextBonus}%` : '')
                    );
                } else if (resKey === 'auto_build') {
                    // 自動升級功能
                    const isActive = state.level > 0;
                    const text = lang.t('自動升級建築');

                    if (isActive) {
                        effectTexts.push(text);
                        tooltipEffectTexts.push(text);
                    } else {
                        tooltipEffectTexts.push(`${lang.t('解鎖')}: ${text}`);
                    }
                } else if (resKey === 'maid_craft_boost') {
                    // 侍女合成量加成
                    const currentBonus = finalAmount * state.level;
                    const nextBonus = finalAmount * (state.level + 1);
                    const nextNextBonus = finalAmount * (state.level + 2);

                    const displayBonus = state.level > 0 ? currentBonus : nextBonus;
                    effectTexts.push(`${lang.t('侍女合成量')}: +${displayBonus}`);
                    tooltipEffectTexts.push(
                        `${lang.t('侍女合成量')}: +${currentBonus}` +
                        (state.level < levelCap ? ` → +${nextBonus}` : '')
                    );
                } else {
                    // 產出類效果
                    const res = this.resourceManager.getResource(resKey);
                    let currentRate, nextRate;

                    if (res && res.type !== 'basic') {
                        // 進階/合成資源採用線性成長
                        currentRate = finalAmount * (state.level + weight);
                        nextRate = finalAmount * (state.level + 1 + weight);
                    } else {
                        // 基礎資源採用平方成長
                        currentRate = finalAmount * Math.pow(state.level + weight, 2);
                        nextRate = finalAmount * Math.pow(state.level + 1 + weight, 2);
                    }

                    const displayRate = state.level > 0 ? currentRate : nextRate;
                    effectTexts.push(`${this.getResName(resKey)}: ${Formatter.formatRate(displayRate)}/${lang.t('秒')}`);
                    tooltipEffectTexts.push(
                        `${this.getResName(resKey)}: ${Formatter.formatRate(currentRate)}/${lang.t('秒')}` +
                        (state.level < levelCap ? ` → ${Formatter.formatRate(nextRate)}/${lang.t('秒')}` : '')
                    );
                }
            }

            if (effectTexts.length > 0) {
                // Tooltip 使用帶下一級預覽的文字
                tooltipLines.push(`【${lang.t('升級效果')}】\n${tooltipEffectTexts.join('\n')}`);

                // 在緊湊模式下，將效果顯示在卡片上
                if (this.isCompactMode && els.effectsEl) {
                    // 根據效果數量智能排版
                    if (effectTexts.length <= 2) {
                        // 1-2個效果：同一行顯示，用 / 分隔
                        els.effectsEl.innerHTML = effectTexts.join(' / ');
                    } else {
                        // 3個或更多效果：顯示前2個，其餘省略或換行
                        // 優先顯示最重要的效果（通常是產出類）
                        const displayTexts = effectTexts.slice(0, 2);
                        const remaining = effectTexts.length - 2;
                        if (remaining > 0) {
                            els.effectsEl.innerHTML = displayTexts.join(' / ') + `<br><span style="font-size: 0.9em; opacity: 0.8;">+${remaining}${lang.t('項效果')}</span>`;
                        } else {
                            els.effectsEl.innerHTML = displayTexts.join(' / ');
                        }
                    }
                }

                // 在長描述模式下，將效果顯示在 effectEl
                if (!this.isCompactMode && els.effectEl) {
                    els.effectEl.innerHTML = effectTexts.join(' / ');
                }
            }
        }

        // --- 消耗 ---
        if (state.level >= levelCap) {
            tooltipLines.push(`\n【${lang.t('狀態')}】\n${lang.t('已達等級上限')} (${lang.t('需建築精通技能')})`);

            // 在長描述模式下顯示狀態
            if (!this.isCompactMode && els.costEl) {
                els.costEl.innerHTML = `<span style="color: #ff9800;">${lang.t('已達等級上限')}</span>`;
            }
        } else {
            const cost = this.buildingManager.getNextCost(id);
            const resources = this.resourceManager.getAllResources();
            const costLines = [];
            const costHTMLLines = [];

            for (const [key, amount] of Object.entries(cost)) {
                const res = resources[key];
                const currentVal = res ? res.value : 0;
                const maxVal = res ? res.max : 0;
                const hasEnough = currentVal >= amount;
                const capacityBottleneck = maxVal < amount;

                const statusMark = hasEnough ? '✓' : '✗';
                const color = hasEnough ? '#8bc34a' : '#f44336';

                let lineText = `${this.getResName(key)}: ${Formatter.formatBigNumber(amount)} ${statusMark}`;
                let htmlLine = `${this.getResName(key)}: ${Formatter.formatBigNumber(amount)}`;

                if (capacityBottleneck) {
                    const bottleneckText = ` (${lang.t('當前')}: ${Formatter.formatBigNumber(maxVal)})`;
                    lineText += bottleneckText;
                    htmlLine += `<span style="font-size: 0.9em; opacity: 0.8;">${bottleneckText}</span>`;
                }

                costLines.push(lineText);
                costHTMLLines.push(`<span style="color: ${color}">${htmlLine}</span>`);
            }
            if (costLines.length > 0) {
                tooltipLines.push(`\n【${lang.t('升級消耗')}】\n${costLines.join('\n')}`);

                // 在長描述模式下顯示消耗
                if (!this.isCompactMode && els.costEl) {
                    els.costEl.innerHTML = costHTMLLines.join(' ');
                }
            }
        }

        // --- 描述 ---
        tooltipLines.push(`\n【${lang.t('描述')}】\n${lang.t(def.description)}`);

        // --- 提示 (等待時間/產能不足) ---
        if (state.level < levelCap) {
            const reason = this.buildingManager.getUpgradeBlockReason(id);
            if (reason) {
                // reason 已經包含 "資源不足: 需要 xxx" 或 "預計等待 xxx"
                // 我們只取其核心訊息
                tooltipLines.push(`\n【${lang.t('提示')}】\n${lang.t(reason)}`);

                // 在長描述模式下，將提示附加到 costEl
                if (!this.isCompactMode && els.costEl) {
                    els.costEl.innerHTML += ' <span style="color: #ff9800;">(' + reason + ')</span>';
                }
            }
        }

        // 設置 Tooltip
        // 為了防止 browser 原生 tooltip 在內容頻繁更新時閃爍 (特別是帶時間的訊息)
        // 當用戶正在 Hover 時，我們不主動更新 title，除非是剛進入 mouseenter 或點擊升級
        if (forceTooltip || !els.itemEl.matches(':hover')) {
            els.itemEl.title = tooltipLines.join('\n');
        }

        // 4. 更新可升級樣式（三種狀態）
        const canUpgrade = this.buildingManager.canUpgrade(id);
        const capForProgress = this.buildingManager.getBuildingLevelCap(id);
        const stateForProgress = this.buildingManager.getBuilding(id);

        // 已達最高等級不顯示任何進度
        if (stateForProgress && stateForProgress.level >= capForProgress) {
            els.itemEl.classList.remove('upgrade-available', 'cap-bottleneck');
            els.itemEl.style.background = '';
        } else if (canUpgrade) {
            // 狀態1：可升級 - 綠框
            els.itemEl.classList.add('upgrade-available');
            els.itemEl.classList.remove('cap-bottleneck');
            els.itemEl.style.background = '';
        } else {
            const cost = this.buildingManager.getNextCost(id);
            const { progress, hasCapBottleneck } = this.calculateUpgradeProgress(id, cost);

            if (hasCapBottleneck) {
                // 狀態3：上限不足 - 紅框
                els.itemEl.classList.remove('upgrade-available');
                els.itemEl.classList.add('cap-bottleneck');
                els.itemEl.style.background = '';
            } else {
                // 狀態2：資源累積中 - 進度條背景
                els.itemEl.classList.remove('upgrade-available', 'cap-bottleneck');
                const pct = Math.min(progress * 100, 100);
                els.itemEl.style.background =
                    `linear-gradient(to right, rgba(76,175,80,0.25) ${pct}%, transparent ${pct}%)`;
            }
        }
    }

    update() {
        // 定期更新所有顯示中的建築（用於刷新 Tooltip 中的時間和狀態）
        const currentEraId = PlayerManager.getEraId();
        let needReRender = false;

        Object.keys(Buildings).forEach(id => {
            const def = Buildings[id];

            // 檢查是否有新建築解鎖
            const isVisible = this.checkPrerequisites(def, currentEraId);
            const isRendered = !!this.elements[id];

            if (isVisible && !isRendered) {
                needReRender = true;
            }

            if (isRendered) {
                // 更新內容（包括 Tooltip 和樣式）
                this.updateEntry(id);
            }
        });

        if (needReRender) {
            this.render();
        }
    }

    /**
     * 計算建築升級進度
     * @returns {{ progress: number, hasCapBottleneck: boolean }}
     */
    calculateUpgradeProgress(id, cost) {
        const resources = this.resourceManager.getAllResources();
        let minProgress = 1;
        let hasCapBottleneck = false;

        for (const [key, amount] of Object.entries(cost)) {
            const res = resources[key];
            if (!res) continue;

            const currentVal = res.value;
            const maxVal = res.max;

            // 檢查上限是否足夠
            if (maxVal < amount) {
                hasCapBottleneck = true;
            }

            // 計算進度 (以當前值 / 需求量)
            const progress = amount > 0 ? Math.min(currentVal / amount, 1) : 1;
            minProgress = Math.min(minProgress, progress);
        }

        return { progress: minProgress, hasCapBottleneck };
    }

    getResName(key) {
        // 從 ResourceManager 取得資源名稱並翻譯
        const res = this.resourceManager.getResource(key);
        if (res) {
            return LanguageManager.getInstance().t(res.name);
        }
        return key;
    }
}
