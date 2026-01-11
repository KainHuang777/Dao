import PlayerManager from '../utils/PlayerManager.js';
import Formatter from '../utils/Formatter.js';
import LanguageManager from '../utils/LanguageManager.js';
import { Buildings } from '../data/Buildings.js';

export default class ResourcePanel {
    constructor(resourceManager) {
        this.resourceManager = resourceManager;
        this.container = document.getElementById('resources-container');
        this.elements = {}; // Cache DOM elements: { key: { el, valueEl } }
        this.currentCraftCounts = [5, 10];
        this.buffBar = null;
    }

    init() {
        this.initBuffBar();
        this.render();
    }

    /**
     * 初始化 Buff 狀態列
     */
    initBuffBar() {
        if (!this.buffBar) {
            this.buffBar = document.createElement('div');
            this.buffBar.id = 'buff-bar';
            this.buffBar.className = 'buff-bar';
            this.buffBar.style.cssText = `
                display: none;
                gap: 8px;
                padding: 6px 10px;
                background: rgba(0, 0, 0, 0.5);
                border-radius: 6px;
                margin-bottom: 8px;
                flex-wrap: wrap;
            `;
            this.container.parentNode.insertBefore(this.buffBar, this.container);
        }
    }

    /**
     * 渲染 Buff 狀態列
     */
    renderBuffBar() {
        if (!this.buffBar) return;

        const buffs = [];

        // 蘊靈丹 buff (靈力產出 2 倍)
        const lingliRemainingMs = PlayerManager.getLingliBuffRemainingMs();
        if (lingliRemainingMs > 0) {
            const seconds = Math.ceil(lingliRemainingMs / 1000);
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
            buffs.push({
                label: '蘊',
                time: timeStr,
                color: '#00bcd4',
                title: '蘊靈丹效果：靈力產出 2 倍'
            });
        }

        // 修煉暴擊 BUFF（靈潮爆發丹）
        const trainingBuff = PlayerManager.state?.activePillBuffs?.trainingBoost;
        if (trainingBuff && Date.now() < trainingBuff.endTime) {
            const remainingMs = trainingBuff.endTime - Date.now();
            const seconds = Math.ceil(remainingMs / 1000);
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
            const lang = LanguageManager.getInstance();
            buffs.push({
                label: '🎯',
                time: timeStr,
                color: '#ff9800',
                title: `${lang.t('修煉暴擊')} ×${trainingBuff.multiplier.toFixed(1)}`
            });
        }

        // 劍侍糯美子 (自動建築)
        if (window.game?.buildingManager?.buildings['sword_maid']?.level >= 1 &&
            window.game.buildingManager.autoBuildEnabled) {
            buffs.push({
                label: '美',
                color: '#9c27b0',
                title: '劍侍糯美子：自動升級建築中'
            });
        }

        // Debug 自動建築
        if (window.game?.buildingManager?.debugAutoBuildEnabled) {
            buffs.push({
                label: '調',
                color: '#ff9800',
                title: 'Debug 自動建築啟用中'
            });
        }

        // 渲染 buff 標籤
        if (buffs.length > 0) {
            this.buffBar.innerHTML = buffs.map(b => `
                <span class="buff-tag" title="${b.title}" style="
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 0.85em;
                    font-weight: bold;
                    background: ${b.color}33;
                    border: 1px solid ${b.color};
                    color: ${b.color};
                    animation: buff-pulse 2s infinite;
                ">[${b.label}${b.time ? ' ' + b.time : ''}]</span>
            `).join('');
            this.buffBar.style.display = 'flex';
        } else {
            this.buffBar.style.display = 'none';
        }
    }

    render() {
        this.container.innerHTML = '';
        const resources = this.resourceManager.getUnlockedResources();

        // 按類型排序：basic → advanced → crafted
        const typeOrder = { basic: 0, advanced: 1, crafted: 2 };
        const sortedEntries = Object.entries(resources)
            .filter(([key]) => this.resourceManager.shouldDisplay(key))
            .sort((a, b) => {
                const orderA = typeOrder[a[1].type] ?? 1;
                const orderB = typeOrder[b[1].type] ?? 1;
                return orderA - orderB;
            });

        let lastType = null;
        const categories = {
            basic: '基礎資源',
            advanced: '進階資源',
            crafted: '合成資源'
        };

        sortedEntries.forEach(([key, res]) => {
            // 只渲染應該顯示的資源
            if (!this.resourceManager.shouldDisplay(key)) {
                return;
            }

            // 檢查分類是否變化，若是則插入標題
            if (res.type !== lastType) {
                // 如果是第一次出現或是類型改變，且該類型有定義標題
                if (categories[res.type]) {
                    const header = document.createElement('div');
                    header.className = 'res-category-header';
                    header.textContent = LanguageManager.getInstance().t(categories[res.type]);
                    header.style.cssText = `
                        font-size: 0.8em;
                        color: #888;
                        margin: 10px 0 5px 0;
                        padding-bottom: 3px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    `;
                    this.container.appendChild(header);
                }
                lastType = res.type;
            }

            const item = document.createElement('div');
            item.className = 'resource-item';
            item.dataset.key = key;
            item.draggable = true; // Enable drag native

            const nameSpan = document.createElement('span');
            nameSpan.className = 'res-name';
            // 優先嘗試翻譯 ID，若無翻譯則 fallback 到資源名稱
            const translatedName = LanguageManager.getInstance().t(key) !== key
                ? LanguageManager.getInstance().t(key)
                : LanguageManager.getInstance().t(res.name);
            nameSpan.textContent = translatedName;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'res-value';
            valueSpan.textContent = Formatter.formatBigNumber(res.value);

            const infoDiv = document.createElement('div');
            infoDiv.className = 'res-info';

            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(valueSpan);
            item.appendChild(infoDiv);
            this.container.appendChild(item);

            this.elements[key] = {
                el: item,
                valueEl: valueSpan,
                nameEl: nameSpan,
                infoEl: infoDiv
            };

            // 為所有資源配置 Tooltip (來源說明)
            // 基礎資源在 Era 2+ 顯示，其他資源始終顯示
            const currentEra = PlayerManager.getEraId();
            if (res.type !== 'basic' || currentEra >= 2) {
                item.title = this.buildResourceTooltip(key);
            }

            // 為基礎資源加入點擊採集功能 (僅 Era 1)
            if (res.type === 'basic') {
                if (currentEra >= 2) {
                    // Era 2+: 不可點擊
                    item.style.cursor = 'default';
                    item.classList.add('not-clickable');
                    this.bindDragEvents(item);
                } else {
                    // Era 1: 可點擊採集
                    nameSpan.classList.add('clickable');
                    item.title = '點擊採集 +' + (this.resourceManager.manualGatherAmount[key] || 1);
                    item.style.cursor = 'pointer';
                    item.draggable = false;

                    item.addEventListener('click', (e) => {
                        const before = this.resourceManager.getResource(key).value;
                        const result = this.resourceManager.manualGather(key);

                        if (result) {
                            const after = this.resourceManager.getResource(key).value;
                            const translatedName = LanguageManager.getInstance().t(res.name);
                            console.log(`採集 ${translatedName}: ${before} -> ${after} (+${after - before})`);
                            this.showGatherEffect(nameSpan);
                        }
                    });
                }
            } else if (res.type === 'crafted') {
                // 合成類資源：顯示快速合成按鈕
                const btnContainer = document.createElement('div');
                btnContainer.className = 'craft-buttons';

                this.currentCraftCounts.forEach(count => {
                    const btn = document.createElement('button');
                    btn.textContent = Formatter.formatBigNumber(count);
                    btn.className = 'btn-tiny';
                    btn.title = `快速合成 ${count} 個`;

                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (this.resourceManager.canCraft(key, count)) {
                            this.resourceManager.craft(key, count);
                            this.update();
                        }
                    });

                    btnContainer.appendChild(btn);
                });

                // MAX 按鈕
                const maxBtn = document.createElement('button');
                maxBtn.textContent = 'MAX';
                maxBtn.className = 'btn-tiny btn-max';
                maxBtn.dataset.resKey = key;
                maxBtn.title = '合成最大數量';

                maxBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const maxCount = this.getMaxCraftable(key);
                    if (maxCount > 0 && this.resourceManager.canCraft(key, maxCount)) {
                        this.resourceManager.craft(key, maxCount);
                        this.update();
                    }
                });

                btnContainer.appendChild(maxBtn);

                item.appendChild(btnContainer);
                this.elements[key].craftBtns = btnContainer;
                this.elements[key].maxBtn = maxBtn;

                // 非基礎資源不可點擊 item 本身
                item.style.cursor = 'default';
                item.classList.add('not-clickable');
                this.bindDragEvents(item);
            } else {
                // 其他資源
                item.style.cursor = 'default';
                item.classList.add('not-clickable');
                this.bindDragEvents(item);
            }
        });
    }

    bindDragEvents(item) {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.dataset.key);
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        // 此處需要更多邏輯來處理容器的 drop，為簡化先略過容器端的排序邏輯
    }

    update() {
        // 更新 Buff 狀態列
        this.renderBuffBar();

        const resources = this.resourceManager.getUnlockedResources();
        const currentKeys = Object.keys(this.elements);
        const craftCounts = this.getCraftCounts();
        const displayKeys = Object.keys(resources).filter(key =>
            this.resourceManager.shouldDisplay(key)
        );

        // 檢查是否有新解鎖資源，或合成按鈕級級別發生變化
        const countsChanged = JSON.stringify(craftCounts) !== JSON.stringify(this.currentCraftCounts);
        if (currentKeys.length !== displayKeys.length || countsChanged) {
            // 需要重新渲染
            this.currentCraftCounts = craftCounts;
            this.render();
            return;
        }

        // 計算靈力消耗率（與 Resources.js 中的公式保持一致）
        const currentEra = PlayerManager.getEraId();
        const currentLevel = PlayerManager.getLevel();
        const lingliConsumption = (currentEra - 1) * 10 + currentLevel - 2;

        // 更新現有資源的數值
        Object.entries(resources).forEach(([key, res]) => {
            if (this.elements[key] && this.resourceManager.shouldDisplay(key)) {
                // 更新 Tooltip (動態刷新來源資訊)
                const currentEra = PlayerManager.getEraId();
                if (res.type !== 'basic' || currentEra >= 2) {
                    this.elements[key].el.title = this.buildResourceTooltip(key);
                }

                // 特殊處理靈力：顯示淨產出率（產出 - 消耗）
                let displayRate = res.rate;
                if (key === 'lingli') {
                    displayRate = res.rate - lingliConsumption;
                }

                // 顯示產出率（包括負數）
                const rateText = displayRate !== 0 ? `(${Formatter.formatRate(displayRate)}) ` : "";
                // 合成資源不顯示上限
                let valText;
                if (res.type === 'crafted') {
                    valText = Formatter.formatBigNumber(res.value);
                } else {
                    valText = `${Formatter.formatBigNumber(res.value)}/${Formatter.formatBigNumber(res.max)}`;
                }
                this.elements[key].valueEl.textContent = rateText + valText;

                // 顏色控制：達到上限使用金色/綠色（目前 CSS 定義），未達上限使用白色
                if (res.value >= res.max) {
                    this.elements[key].valueEl.style.color = ''; // 恢復 CSS 定義的顏色
                } else {
                    this.elements[key].valueEl.style.color = '#ffffff'; // 強制白色
                }

                // 更新合成按鈕狀態
                if (res.type === 'crafted' && this.elements[key].craftBtns) {
                    const btns = this.elements[key].craftBtns.children;
                    this.currentCraftCounts.forEach((count, index) => {
                        const btn = btns[index];
                        if (btn) {
                            const can = this.resourceManager.canCraft(key, count);
                            btn.disabled = !can;
                            if (can) {
                                btn.style.color = '#ffffff';
                                btn.style.borderColor = '#ffffff';
                                btn.style.opacity = '1';
                            } else {
                                btn.style.color = '#ff4444';
                                btn.style.borderColor = '#ff4444';
                                btn.style.opacity = '0.7';
                            }
                        }
                    });
                }
            }
        });
    }

    /**
     * 計算資源的最大可合成數量
     */
    getMaxCraftable(key) {
        const res = this.resourceManager.getResource(key);
        if (!res || res.type !== 'crafted' || !res.recipe) return 0;

        // 計算材料能合成的最大數量
        let maxByMaterials = Number.MAX_SAFE_INTEGER;
        for (const [ingredientKey, amount] of Object.entries(res.recipe)) {
            const ingredient = this.resourceManager.getResource(ingredientKey);
            if (!ingredient || !ingredient.unlocked) return 0;
            if (amount > 0) {
                const affordable = Math.floor(ingredient.value / amount);
                maxByMaterials = Math.min(maxByMaterials, affordable);
            }
        }

        // 計算儲存空間能容納的數量
        const storageSpace = Math.floor(res.max - res.value);

        return Math.min(maxByMaterials, storageSpace);
    }


    /**
     * 建構資源來源提示框內容 (Era 2+)
     */
    buildResourceTooltip(resourceKey) {
        const lang = LanguageManager.getInstance();
        const res = this.resourceManager.getResource(resourceKey);
        if (!res) return '';

        const lines = [];
        const productionSources = [];
        const capSources = [];

        // 核心基礎資源列表 (與 BuildingManager.js 同步)
        const coreBasicResources = ['lingli', 'money', 'wood', 'stone_low', 'spirit_grass_low'];

        // 查詢建築
        if (window.game && window.game.buildingManager) {
            const buildingStates = window.game.buildingManager.buildings;

            for (const def of Object.values(Buildings)) {
                const state = buildingStates[def.id];
                if (!state || state.level <= 0) continue;

                if (def.effects) {
                    let hasProduction = false;
                    let hasCap = false;

                    for (const [effType, effAmount] of Object.entries(def.effects)) {
                        if (effAmount <= 0) continue;

                        // 產出判定
                        if (effType === resourceKey) {
                            hasProduction = true;
                        } else if (effType === 'all_rate' && coreBasicResources.includes(resourceKey)) {
                            hasProduction = true;
                        }

                        // 上限判定
                        if (effType === `${resourceKey}_max`) {
                            hasCap = true;
                        } else if (effType === 'all_max' && coreBasicResources.includes(resourceKey)) {
                            hasCap = true;
                        } else if (effType === 'synthetic_max_mult' && res.type === 'crafted') {
                            hasCap = true;
                        }
                    }

                    const buildingName = lang.t(def.name);
                    const sourceInfo = `${buildingName} LV${state.level}`;

                    if (hasProduction && !productionSources.includes(sourceInfo)) {
                        productionSources.push(sourceInfo);
                    }
                    if (hasCap && !capSources.includes(sourceInfo)) {
                        capSources.push(sourceInfo);
                    }
                }
            }
        }
        // 建構提示框文字
        if (productionSources.length > 0) {
            lines.push(lang.t('獲取來源'));
            productionSources.forEach(src => lines.push(`  ${src}`));
        } else {
            // 如果沒有建築產出，區分資源類型顯示
            if (res.type === 'basic') {
                lines.push(`${lang.t('獲取來源')}: ${lang.t('基礎產出/採集')}`);
            } else if (res.type === 'crafted') {
                lines.push(`${lang.t('獲取來源')}: ${lang.t('合成製作')}`);
            }
        }

        if (capSources.length > 0) {
            lines.push(lang.t('上限來源'));
            capSources.forEach(src => lines.push(`  ${src}`));
        } else if (res.type !== 'crafted') {
            // 合成資源目前無上限顯示，其他資源若無建築上限則顯示基礎上限
            lines.push(`${lang.t('上限來源')}: ${lang.t('基礎空間')}`);
        }

        return lines.length > 0 ? lines.join('\n') : lang.t(resourceKey);
    }

    /**
     * 獲取當前合成按鈕的額度 (基於虛空寶庫等級)
     */
    getCraftCounts() {
        if (!window.game || !window.game.buildingManager) return [5, 10];
        const vt = window.game.buildingManager.getBuilding('void_treasury');
        if (!vt) return [5, 10];

        if (vt.level >= 10) return [1000, 10000];
        if (vt.level >= 5) return [100, 1000];
        return [5, 10];
    }

    showGatherEffect(element) {
        // 添加動畫效果
        element.classList.add('gather-pulse');
        setTimeout(() => {
            element.classList.remove('gather-pulse');
        }, 300);
    }
}
