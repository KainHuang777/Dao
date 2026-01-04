
import Formatter from '../utils/Formatter.js';
import PlayerManager from '../utils/PlayerManager.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class CraftingPanel {
    constructor(resourceManager, buildingManager) {
        this.resourceManager = resourceManager;
        this.buildingManager = buildingManager;
        this.container = document.getElementById('view-crafting');
        this.elements = {}; // Cache
    }

    init() {
        this.render();
        // 定期更新按鈕狀態
        setInterval(() => this.updateButtons(), 500);
    }

    render() {
        this.container.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'crafting-list';

        const resources = this.resourceManager.getAllResources();

        // 只顯示合成類型的資源
        Object.entries(resources).forEach(([key, res]) => {
            if (res.type !== 'crafted' || !res.unlocked) return;

            const item = document.createElement('div');
            item.className = 'crafting-item';

            // Info Section
            const info = document.createElement('div');
            info.className = 'craft-info';

            const title = document.createElement('h3');
            title.textContent = LanguageManager.getInstance().t(res.name);

            const desc = document.createElement('p');
            desc.className = 'craft-desc';
            desc.textContent = `${LanguageManager.getInstance().t('當前')}: ${Formatter.formatBigNumber(res.value)} / ${Formatter.formatBigNumber(res.max)}`;

            // 檢查是否為丹藥
            const pillConfig = PlayerManager.getPillConfig(key);
            let effectDiv = null; // 宣告在外層作用域

            if (pillConfig) {
                const consumedCount = PlayerManager.getConsumedPillCount(key);
                const pillInfo = document.createElement('p');
                pillInfo.className = 'pill-info';
                pillInfo.style.fontSize = '0.85em';
                pillInfo.style.color = '#4caf50';
                pillInfo.style.margin = '3px 0';
                pillInfo.textContent = `${LanguageManager.getInstance().t('已服用')}: ${consumedCount}/${pillConfig.maxCount}`;
                desc.appendChild(document.createElement('br'));
                desc.appendChild(pillInfo);

                // 顯示丹藥效果（取代配方位置）
                effectDiv = document.createElement('div');
                effectDiv.className = 'craft-effect';
                effectDiv.style.marginTop = '8px';
                effectDiv.style.padding = '8px';
                effectDiv.style.background = 'rgba(156, 39, 176, 0.15)';
                effectDiv.style.borderRadius = '4px';
                effectDiv.style.borderLeft = '3px solid #9c27b0';

                const effectLabel = document.createElement('strong');
                effectLabel.textContent = LanguageManager.getInstance().t('效果') + ': ';
                effectLabel.style.color = '#9c27b0';

                const effectDescription = this.getPillEffectText(pillConfig);
                const effectText = document.createTextNode(effectDescription);

                effectDiv.appendChild(effectLabel);
                effectDiv.appendChild(effectText);
            }

            // 建立配方元素（稍後決定放置位置）
            const recipeDiv = document.createElement('div');
            recipeDiv.className = 'craft-recipe';
            recipeDiv.style.fontSize = '0.85em';
            recipeDiv.style.color = '#aaa';
            recipeDiv.style.marginTop = '5px';
            recipeDiv.textContent = LanguageManager.getInstance().t('配方') + ': ';

            if (res.recipe) {
                const recipeText = Object.entries(res.recipe)
                    .map(([ingredientKey, amount]) => {
                        const ingredient = resources[ingredientKey];
                        const name = ingredient?.name ? LanguageManager.getInstance().t(ingredient.name) : ingredientKey;
                        return `${name} ×${Formatter.formatBigNumber(amount)}`;
                    })
                    .join(', ');
                recipeDiv.textContent += recipeText;
            } else {
                recipeDiv.textContent += LanguageManager.getInstance().t('尚未解鎖或配方缺失');
            }

            info.appendChild(title);
            info.appendChild(desc);
            if (pillConfig) {
                // 丹藥：顯示效果
                info.appendChild(effectDiv);
            } else {
                // 非丹藥：顯示配方
                info.appendChild(recipeDiv);
            }

            // Action Section
            const action = document.createElement('div');
            action.className = 'craft-action';

            // 檢查侍女自動化功能
            if (this.buildingManager) {
                const maid = this.buildingManager.getBuilding('maid');
                if (maid && maid.level > 0) {
                    const autoContainer = document.createElement('div');
                    autoContainer.style.marginBottom = '5px';
                    autoContainer.style.textAlign = 'right';

                    const isAuto = this.buildingManager.isMaidAutoEnabled(key);
                    const autoBtn = document.createElement('button');
                    autoBtn.className = 'btn';
                    autoBtn.textContent = isAuto ? 'AUTO: ON' : 'AUTO: OFF';
                    autoBtn.style.fontSize = '0.75em';
                    autoBtn.style.padding = '2px 8px';
                    autoBtn.style.backgroundColor = isAuto ? '#4caf50' : '#424242';
                    autoBtn.style.color = '#fff';
                    autoBtn.style.border = '1px solid #666';

                    autoBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.buildingManager.toggleMaidAuto(key);
                        this.render();
                    };

                    autoContainer.appendChild(autoBtn);
                    action.appendChild(autoContainer);
                }
            }

            // 計算最大可合成數量
            const maxCraftable = this.getMaxCraftableAmount(key, res.recipe);

            // 合成按鈕容器
            const craftBtnContainer = document.createElement('div');
            craftBtnContainer.className = 'craft-buttons';
            craftBtnContainer.style.marginBottom = '8px';

            // 動態生成合成按鈕（根據資源數量）
            const craftAmounts = this.getCraftAmounts(maxCraftable);
            const craftButtons = [];

            craftAmounts.forEach(amount => {
                const btn = document.createElement('button');
                btn.className = 'btn craft-btn';
                btn.textContent = `${LanguageManager.getInstance().t('合成')} ×${amount}`;
                btn.addEventListener('click', () => {
                    if (this.resourceManager.craft(key, amount)) {
                        this.render(); // 重新渲染以更新所有狀態
                    }
                });
                craftBtnContainer.appendChild(btn);
                craftButtons.push({ btn, amount });
            });

            action.appendChild(craftBtnContainer);

            // 如果是丹藥，在合成按鈕下方顯示配方
            if (pillConfig) {
                action.appendChild(recipeDiv);
            }

            // 如果是丹藥，添加服用按鈕（獨立容器）
            let consumeBtn = null;
            if (pillConfig) {
                const consumeBtnContainer = document.createElement('div');
                consumeBtnContainer.style.borderTop = '1px solid rgba(255,255,255,0.1)';
                consumeBtnContainer.style.paddingTop = '8px';
                consumeBtnContainer.style.marginTop = '4px';

                consumeBtn = document.createElement('button');
                consumeBtn.className = 'btn consume-pill-btn';
                consumeBtn.textContent = LanguageManager.getInstance().t('服用丹藥');
                consumeBtn.style.background = '#9c27b0';
                consumeBtn.style.width = '100%';
                consumeBtn.addEventListener('click', () => {
                    if (PlayerManager.consumePill(key)) {
                        this.render(); // 重新渲染以更新服用次數
                    }
                });
                consumeBtnContainer.appendChild(consumeBtn);
                action.appendChild(consumeBtnContainer);
            }

            item.appendChild(info);
            item.appendChild(action);
            list.appendChild(item);

            this.elements[key] = {
                descEl: desc,
                craftButtons: craftButtons,
                consumeBtnEl: consumeBtn,
                maxCraftable: maxCraftable
            };

            this.updateEntry(key);
        });

        if (Object.keys(this.elements).length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'empty-message';
            emptyMsg.textContent = LanguageManager.getInstance().t('暫無可用的合成配方');
            list.appendChild(emptyMsg);
        }

        this.container.appendChild(list);
    }

    /**
     * 計算最大可合成數量
     */
    getMaxCraftableAmount(resourceKey, recipe) {
        if (!recipe) return 0;

        const allResources = this.resourceManager.getAllResources();
        let maxAmount = Infinity;

        for (const [ingredientKey, requiredAmount] of Object.entries(recipe)) {
            const ingredient = allResources[ingredientKey];
            if (!ingredient) return 0;

            const possibleAmount = Math.floor(ingredient.value / requiredAmount);
            maxAmount = Math.min(maxAmount, possibleAmount);
        }

        return maxAmount === Infinity ? 0 : maxAmount;
    }

    /**
     * 根據最大可合成數量，智能生成合成按鈕數量
     */
    getCraftAmounts(maxCraftable) {
        if (maxCraftable === 0) return [1]; // 即使不能合成也顯示 ×1
        if (maxCraftable < 5) return [1];
        if (maxCraftable < 10) return [1, 5];
        if (maxCraftable < 50) return [1, 10, maxCraftable];
        if (maxCraftable < 100) return [1, 10, 50, maxCraftable];
        return [1, 10, 50, 100];
    }

    updateEntry(key) {
        const res = this.resourceManager.getResource(key);
        const els = this.elements[key];
        if (!res || !els) return;

        els.descEl.textContent = `${LanguageManager.getInstance().t('當前')}: ${Formatter.formatBigNumber(res.value)} / ${Formatter.formatBigNumber(res.max)}`;

        // 更新最大可合成數量
        els.maxCraftable = this.getMaxCraftableAmount(key, res.recipe);
    }

    updateButtons() {
        Object.keys(this.elements).forEach(key => {
            const els = this.elements[key];
            const res = this.resourceManager.getResource(key);
            if (!els || !res) return;

            // 更新合成按鈕狀態
            if (els.craftButtons) {
                els.craftButtons.forEach(({ btn, amount }) => {
                    const canCraft = els.maxCraftable >= amount;
                    this.updateButtonState(btn, canCraft);
                });
            }

            // 更新服用按鈕狀態
            if (els.consumeBtnEl) {
                const pillConfig = PlayerManager.getPillConfig(key);
                const consumedCount = PlayerManager.getConsumedPillCount(key);
                const canConsume = res.value >= 1 && consumedCount < pillConfig.maxCount;
                this.updateButtonState(els.consumeBtnEl, canConsume);
            }
        });
    }

    /**
     * 獲取丹藥效果描述文字
     */
    getPillEffectText(pillConfig) {
        const lang = LanguageManager.getInstance();
        const effectNames = {
            trainingSpeed: lang.t('修煉速度'),
            lingliProduction: lang.t('靈力產出'),
            allProduction: lang.t('所有資源產出'),
            tribulationSuccess: lang.t('渡劫成功率')
        };

        const effectName = effectNames[pillConfig.effect] || '未知效果';
        const bonusPerPill = pillConfig.effect === 'tribulationSuccess'
            ? `+${(pillConfig.bonus * 100).toFixed(0)}%`
            : `+${(pillConfig.bonus * 100).toFixed(1)}%`;

        const maxBonus = pillConfig.effect === 'tribulationSuccess'
            ? `+${(pillConfig.bonus * pillConfig.maxCount * 100).toFixed(0)}%`
            : `+${(pillConfig.bonus * pillConfig.maxCount * 100).toFixed(1)}%`;

        return `${effectName} ${bonusPerPill}/${lang.t('顆')}（${lang.t('最多')}${maxBonus}）`;
    }

    updateButtonState(btn, canUse) {
        if (canUse) {
            btn.removeAttribute('disabled');
            btn.classList.remove('disabled');
        } else {
            btn.setAttribute('disabled', 'true');
            btn.classList.add('disabled');
        }
    }
}
