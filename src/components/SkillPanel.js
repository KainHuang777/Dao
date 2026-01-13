
import SkillManager from '../utils/SkillManager.js';
import PlayerManager from '../utils/PlayerManager.js';
import Formatter from '../utils/Formatter.js';
import EraManager from '../utils/EraManager.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class SkillPanel {
    constructor() {
        this.container = document.getElementById('view-skills');
        this.elements = {};
        this.hideLearned = false;
    }

    init() {
        this.render();
        // 定期更新按鈕狀態與顯色
        setInterval(() => this.updateState(), 500);
    }

    render() {
        this.container.innerHTML = '';
        this.elements = {}; // 重要：重繪時清空快取，避免 updateState 指向舊元素

        // 頂部控制列
        const controls = document.createElement('div');
        controls.className = 'panel-controls';
        controls.style.marginBottom = '10px';
        controls.style.padding = '5px';
        controls.style.borderBottom = '1px solid #444';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'hide-learned-check';
        checkbox.checked = this.hideLearned;
        checkbox.addEventListener('change', (e) => {
            this.hideLearned = e.target.checked;
            this.render();
        });

        const label = document.createElement('label');
        label.htmlFor = 'hide-learned-check';
        label.textContent = ' ' + LanguageManager.getInstance().t('隱藏已修成功法');
        label.style.fontSize = '0.9em';
        label.style.cursor = 'pointer';

        controls.appendChild(checkbox);
        controls.appendChild(label);
        this.container.appendChild(controls);

        const skills = SkillManager.getSkills();
        const learnedSkills = PlayerManager.getLearnedSkills();
        const currentEraId = PlayerManager.getEraId();

        const list = document.createElement('div');
        list.className = 'skill-grid'; // 改為 grid 佈局

        Object.entries(skills).forEach(([id, skill]) => {
            const currentLevel = PlayerManager.getSkillLevel(id);
            const isMaxed = currentLevel >= skill.maxLevel;

            if (this.hideLearned && isMaxed) return;

            // 檢查前置條件
            const req = SkillManager.checkRequirements(id, currentEraId, learnedSkills);
            if (!req.canLearn && currentLevel === 0) {
                return;
            }

            const eraDef = EraManager.getEraById(skill.requirements.era);
            const eraName = eraDef ? eraDef.eraName : `時期 ${skill.requirements.era}`;

            const item = document.createElement('div');
            item.className = 'skill-item';

            const info = document.createElement('div');
            info.className = 'skill-info compact';

            const titleLine = document.createElement('div');
            titleLine.className = 'b-title-line';

            const title = document.createElement('h3');
            title.textContent = `${LanguageManager.getInstance().t(skill.name)} `;
            title.className = 'b-name';
            title.style.color = '#00bcd4';

            const levelSpan = document.createElement('span');
            levelSpan.className = 'skill-level-badge';
            levelSpan.textContent = `Lv.${currentLevel}/${skill.maxLevel}`;
            levelSpan.title = LanguageManager.getInstance().t("此功法當前的修煉等級與上限");
            levelSpan.style.fontSize = '0.75em';
            levelSpan.style.color = '#ffd700';
            levelSpan.style.marginLeft = '5px';

            const eraInfo = document.createElement('span');
            eraInfo.className = 'b-level skill-era-req';
            eraInfo.textContent = ` (${LanguageManager.getInstance().t('需求')}: ${eraName})`;
            eraInfo.title = LanguageManager.getInstance().t("修煉或提升此功法所需的最低境界等級");
            eraInfo.dataset.reqEra = skill.requirements.era;
            eraInfo.style.fontSize = '0.75em';
            eraInfo.style.marginLeft = '5px';

            title.appendChild(levelSpan);
            title.appendChild(eraInfo);

            titleLine.appendChild(title);

            const desc = document.createElement('div');
            desc.className = 'b-desc';
            desc.textContent = LanguageManager.getInstance().t(skill.description);
            desc.style.marginTop = '4px';

            const effectDiv = document.createElement('div');
            effectDiv.className = 'b-effect';
            effectDiv.textContent = `${LanguageManager.getInstance().t('效果')}: ${this.getEffectText(skill, currentLevel)}`;

            info.appendChild(titleLine);
            info.appendChild(desc);
            info.appendChild(effectDiv);

            const action = document.createElement('div');
            action.className = 'b-action';

            const costTip = document.createElement('div');
            costTip.className = 'cost-tip skill-cost-tip';
            costTip.dataset.costType = skill.cost.type;
            costTip.dataset.costAmount = skill.cost.amount;

            const btn = document.createElement('button');
            btn.className = 'btn learn-btn';

            if (isMaxed) {
                btn.textContent = '已修成';
                costTip.textContent = '已修成';
                costTip.style.color = '#4caf50';
            } else {
                btn.textContent = currentLevel === 0 ? LanguageManager.getInstance().t('領悟') : LanguageManager.getInstance().t('提升等級');
                const costReduction = PlayerManager.getTalentBonus('five_elements_root');
                const finalCost = Math.floor(skill.cost.amount * (1 - costReduction));
                costTip.textContent = `${LanguageManager.getInstance().t('消耗')}: ${this.getResName(skill.cost.type)} ${Formatter.formatBigNumber(finalCost)}`;
                costTip.style.color = '#ffffff';
            }

            btn.addEventListener('click', () => {
                this.learnSkill(id);
            });

            action.appendChild(costTip);
            action.appendChild(btn);

            item.appendChild(info);
            item.appendChild(action);
            list.appendChild(item);

            this.elements[id] = {
                btnEl: btn,
                costEl: costTip,
                eraEl: eraInfo,
                levelEl: levelSpan,
                currentLevel: currentLevel,
                isMaxed: isMaxed
            };
        });

        if (list.children.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'empty-message';
            emptyMsg.textContent = this.hideLearned ? LanguageManager.getInstance().t('暫無未修成的功法') : LanguageManager.getInstance().t('暫無可修煉的功法');
            list.appendChild(emptyMsg);
        }

        this.container.appendChild(list);
    }

    getEffectText(skill, level = 0) {
        const { type, amount } = skill.effects;
        const displayLevel = Math.max(1, level); // 預覽時顯示 Lv.1 效果
        const finalAmount = amount * displayLevel;
        const lang = LanguageManager.getInstance();

        if (type === 'all_max') return `${lang.t('所有基礎資源上限')} +${Formatter.formatBigNumber(finalAmount)}`;
        if (type === 'all_max_multiplier') return `${lang.t('所有基礎資源上限')} x${finalAmount.toFixed(2)}`;
        if (type === 'time_reduction') {
            const reduction = (1 - amount) * displayLevel;
            const targetPercent = Math.max(10, (1 - reduction) * 100);
            return `${lang.t('修煉所需時間減少至')} ${targetPercent.toFixed(0)}%`;
        }
        if (type === 'building_level_cap') return `${lang.t('建築等級上限')} +${Formatter.formatBigNumber(finalAmount)}`;

        if (type.endsWith('_multiplier')) {
            const resName = this.getResName(type.replace('_multiplier', ''));
            return `${resName}${lang.t('收益效能')} x${finalAmount.toFixed(2)}`;
        }
        if (type.endsWith('_max')) {
            const resName = this.getResName(type.replace('_max', ''));
            return `${resName}${lang.t('上限')} +${Formatter.formatBigNumber(finalAmount)}`;
        }
        if (type.endsWith('_rate')) {
            const resName = this.getResName(type.replace('_rate', ''));
            return `${resName}${lang.t('基礎產出')} ${Formatter.formatRate(finalAmount)}/${lang.t('秒')}`;
        }

        const resName = this.getResName(type);
        return `${resName} +${Formatter.formatBigNumber(finalAmount)}`;
    }

    getResName(key) {
        // 從 ResourceManager 取得資源名稱並翻譯
        const res = window.game.resourceManager.getResource(key);
        if (res) {
            return LanguageManager.getInstance().t(res.name);
        }
        // 特殊處理技能面板專用 key
        if (key === 'building_level_cap') return LanguageManager.getInstance().t('建築等級上限');

        return key;
    }

    updateState() {
        const learnedSkills = PlayerManager.getLearnedSkills();
        const currentEraId = PlayerManager.getEraId();
        const resources = window.game.resourceManager.getAllResources();
        const allSkillDefs = SkillManager.getSkills();

        let needReRender = false;

        Object.keys(allSkillDefs).forEach(id => {
            const skill = allSkillDefs[id];
            const currentLevel = learnedSkills[id] || 0;
            const isMaxed = currentLevel >= skill.maxLevel;
            const req = SkillManager.checkRequirements(id, currentEraId, learnedSkills);

            // 判斷功法是否應該顯示（考慮「隱藏已修功法」選項）
            let isVisible = req.canLearn || currentLevel > 0;
            if (this.hideLearned && isMaxed) {
                isVisible = false; // 如果啟用隱藏且已達到上限，則不可見
            }

            const isRendered = !!this.elements[id];

            if (isVisible && !isRendered) {
                needReRender = true;
            }
        });

        if (needReRender) {
            this.render();
            return;
        }

        Object.entries(this.elements).forEach(([id, els]) => {
            const skill = SkillManager.getSkill(id);
            if (!skill) return;

            const currentLevel = PlayerManager.getSkillLevel(id);
            const isMaxed = currentLevel >= skill.maxLevel;

            // 更新等級顯示
            els.levelEl.textContent = `Lv.${currentLevel}/${skill.maxLevel}`;

            const eraDef = EraManager.getEraById(skill.requirements.era);
            const eraName = eraDef ? LanguageManager.getInstance().t(eraDef.eraName) : `${LanguageManager.getInstance().t('時期')} ${skill.requirements.era}`;
            els.eraEl.textContent = ` (${LanguageManager.getInstance().t('需求')}: ${eraName})`;

            // 如果某個技能剛達到滿級且我們啟用了「隱藏已修成」，則觸發重繪
            if (isMaxed && !els.isMaxed && this.hideLearned) {
                this.render();
                return;
            }

            if (isMaxed) {
                els.btnEl.textContent = LanguageManager.getInstance().t('已修成');
                els.btnEl.disabled = true;
                els.btnEl.classList.add('disabled');
                els.costEl.textContent = LanguageManager.getInstance().t('已修成');
                els.costEl.style.color = '#4caf50';
                els.eraEl.style.color = '#4caf50';
                return;
            }

            // 檢查條件顯示顏色
            const costReduction = PlayerManager.getTalentBonus('five_elements_root');
            const finalCost = Math.floor(skill.cost.amount * (1 - costReduction));

            const canAfford = resources[skill.cost.type] &&
                window.game.resourceManager.getResource(skill.cost.type).value >= finalCost;

            // 更新按鈕文字
            els.btnEl.textContent = currentLevel === 0 ? LanguageManager.getInstance().t('領悟') : LanguageManager.getInstance().t('提升等級');

            // 資源顏色
            els.costEl.textContent = `${LanguageManager.getInstance().t('消耗')}: ${this.getResName(skill.cost.type)} ${Formatter.formatBigNumber(finalCost)}`;
            els.costEl.style.color = canAfford ? '#ffffff' : '#ff4444';
            els.costEl.style.display = 'block';

            // 時代顏色
            const eraMet = currentEraId >= skill.requirements.era;
            els.eraEl.style.color = eraMet ? '#ffffff' : '#ff4444';

            // 按鈕狀態與 Tooltip
            const req = SkillManager.checkRequirements(id, currentEraId, learnedSkills);
            els.btnEl.disabled = !(req.canLearn && canAfford);

            if (els.btnEl.disabled) els.btnEl.classList.add('disabled');
            else els.btnEl.classList.remove('disabled');

            // 設定 Tooltip
            let tooltip = "";
            if (!req.canLearn) {
                tooltip = req.reason; // TODO: req.reason 需要國際化
            } else if (!canAfford) {
                const res = window.game.resourceManager.getResource(skill.cost.type);
                if (res) {
                    // 優先檢查上限是否足夠 (Request Fix)
                    if (res.max < finalCost) {
                        tooltip = `${LanguageManager.getInstance().t('資源上限不足')} (${LanguageManager.getInstance().t('上限')}: ${Formatter.formatBigNumber(res.max)})，${LanguageManager.getInstance().t('請升級建築')}`;
                    } else if (res.rate > 0) {
                        const missing = finalCost - res.value;
                        tooltip = `${LanguageManager.getInstance().t('預計還需')}: ${Formatter.formatTime(missing / res.rate)}`;
                    } else {
                        tooltip = LanguageManager.getInstance().t("資源未生產或產量為 0");
                    }
                }
            } else {
                tooltip = currentLevel === 0 ? LanguageManager.getInstance().t('開始修煉此功法') : LanguageManager.getInstance().t('提升功法等級');
            }
            els.btnEl.title = tooltip;
        });
    }

    learnSkill(id) {
        if (PlayerManager.learnSkill(id)) {
            // 移除 alert，直接重新渲染
            this.render();
            window.game.buildingManager.recalculateRates();

            // 如果是建築精通技能，需要刷新 BuildingPanel 以更新等級上限顯示
            const skill = SkillManager.getSkill(id);
            if (skill && skill.effects.type === 'building_level_cap') {
                if (window.game.uiManager && window.game.uiManager.buildingPanel) {
                    window.game.uiManager.buildingPanel.render();
                }
            }
        }
    }
}
