import PlayerManager from '../utils/PlayerManager.js';
import Formatter from '../utils/Formatter.js';
import LanguageManager from '../utils/LanguageManager.js';
export default class ResourcePanel {
    constructor(resourceManager) {
        this.resourceManager = resourceManager;
        this.container = document.getElementById('resources-container');
        this.elements = {}; // Cache DOM elements: { key: { el, valueEl } }
        this.currentCraftCounts = [1, 5, 10];
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

        Object.entries(resources).forEach(([key, res]) => {
            // 只渲染應該顯示的資源
            if (!this.resourceManager.shouldDisplay(key)) {
                return;
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

            // 為基礎資源加入點擊採集功能
            if (res.type === 'basic') {
                nameSpan.classList.add('clickable');
                item.title = '點擊採集 +' + (this.resourceManager.manualGatherAmount[key] || 1);
                item.style.cursor = 'pointer';

                // 禁用基礎資源的拖曳，避免干擾點擊
                item.draggable = false;

                // 點擊事件綁定到整個 item
                item.addEventListener('click', (e) => {
                    const before = this.resourceManager.getResource(key).value;
                    const result = this.resourceManager.manualGather(key);

                    if (result) {
                        const after = this.resourceManager.getResource(key).value;
                        const translatedName = LanguageManager.getInstance().t(res.name);
                        console.log(`採集 ${translatedName}: ${before} -> ${after} (+${after - before})`);


                        // 添加視覺反饋
                        this.showGatherEffect(nameSpan);
                    }
                });
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
                        e.stopPropagation(); // 防止觸發 item 的點擊
                        if (this.resourceManager.canCraft(key, count)) {
                            this.resourceManager.craft(key, count);
                            // 觸發更新
                            this.update();
                        }
                    });

                    btnContainer.appendChild(btn);
                });

                item.appendChild(btnContainer);
                this.elements[key].craftBtns = btnContainer;

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
                // 特殊處理靈力：顯示淨產出率（產出 - 消耗）
                let displayRate = res.rate;
                if (key === 'lingli') {
                    displayRate = res.rate - lingliConsumption;
                }

                // 顯示產出率（包括負數）
                const rateText = displayRate !== 0 ? `(${Formatter.formatRate(displayRate)}) ` : "";
                const valText = `${Formatter.formatBigNumber(res.value)}/${Formatter.formatBigNumber(res.max)}`;
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
     * 獲取當前合成按鈕的額度 (基於虛空寶庫等級)
     */
    getCraftCounts() {
        if (!window.game || !window.game.buildingManager) return [1, 5, 10];
        const vt = window.game.buildingManager.getBuilding('void_treasury');
        if (!vt) return [1, 5, 10];

        if (vt.level >= 10) return [100, 1000, 10000];
        if (vt.level >= 5) return [10, 100, 1000];
        return [1, 5, 10];
    }

    showGatherEffect(element) {
        // 添加動畫效果
        element.classList.add('gather-pulse');
        setTimeout(() => {
            element.classList.remove('gather-pulse');
        }, 300);
    }
}
