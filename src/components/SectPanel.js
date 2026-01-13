
import SectManager from '../utils/SectManager.js';
import LanguageManager from '../utils/LanguageManager.js';
import Formatter from '../utils/Formatter.js';
import ResourceManager from '../data/Resources.js';

export default class SectPanel {
    constructor() {
        this.container = document.getElementById('view-sect');
        this.oppContainer = document.getElementById('view-opportunities');
    }

    init() {
        if (!this.container) return;
        this.render();
        this.update();

        // Timer for updates (1s)
        setInterval(() => this.update(), 1000);
    }

    render() {
        const lang = LanguageManager.getInstance();

        // --- Sect Panel ---
        this.container.innerHTML = `
            <!-- Header Section: Title, Info, Contribution -->
            <div class="sect-header" style="background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); padding: 15px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 5px;">
                            <h2 style="margin: 0; color: #ffd700; font-size: 1.4em;">${lang.t('我的宗門')}</h2>
                            <span style="font-size: 1.1em; color: #fff;">LV.<span id="sect-level">1</span></span>
                        </div>
                        <div id="sect-level-desc" style="font-size: 0.85em; color: #aaa; margin-left: 2px;"></div>
                    </div>

                    <div style="text-align: right;">
                        <div style="margin-bottom: 5px;">
                            <button id="btn-sect-contribute" class="btn" style="padding: 5px 15px; font-weight: bold; background: #4caf50; border-color: #388e3c;">${lang.t('宗門貢獻')}</button>
                        </div>
                        <div style="font-size: 0.8em; color: #bbb;">
                            ${lang.t('次數')}: <span id="sect-contrib-count" style="color: #fff;">0</span>/3
                            <span style="font-size: 0.9em; margin-left: 5px;">(<span id="btn-sect-refresh-contribution" style="cursor: pointer;" title="刷新次數">🔄</span> <span id="sect-contrib-timer">00:00:00</span>)</span>
                        </div>
                         <div id="contrib-cost-preview" style="font-size: 0.75em; color: #e57373; margin-top: 2px;"></div>
                    </div>
                </div>

                <div class="progress-container" style="background: #333; height: 12px; border-radius: 6px; position: relative; margin-top: 5px;">
                    <div id="sect-dev-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4caf50, #81c784); border-radius: 6px; transition: width 0.3s; box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);"></div>
                    <div id="sect-dev-text" style="position: absolute; width: 100%; top: 0; left: 0; line-height: 12px; font-size: 10px; text-align: center; color: #fff; text-shadow: 1px 1px 2px #000; font-weight: bold;">0/100</div>
                </div>
                <!-- Contribution Money Display -->
                <div style="margin-top: 8px; font-size: 0.9em; text-align: right; color: #ffd700;">
                    ${lang.t('個人貢獻')}: <span id="player-contribution">0</span>
                </div>
            </div>

            <!-- Tabs -->
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <button id="tab-sect-tasks" class="btn active-tab" style="flex: 1; padding: 8px; background: #4caf50;">${lang.t('任務')}</button>
                <button id="tab-sect-market" class="btn" style="flex: 1; padding: 8px; background: #333;">${lang.t('雲海天市')}</button>
                <button id="tab-sect-events" class="btn" style="flex: 1; padding: 8px; background: #333;">${lang.t('天機事件')}</button>
            </div>

            <!-- Content Container -->
            <div id="sect-content-area">
                <!-- Content will be injected by render methods -->
            </div>
        `;

        this.bindHeaderEvents();
        this.renderTasks(); // Default view

        // --- Opportunities Panel ---
        if (this.oppContainer) {
            this.oppContainer.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h2 style="color: #9c27b0;">${lang.t('機緣')}</h2>
                    <p>${lang.t('宗門大比即將開啟...')}</p>
                    <div style="font-size: 3em; margin: 20px;">🎲</div>
                </div>
            `;
        }
    }

    // Helper to switch tabs
    switchTab(tabId) {
        document.querySelectorAll('.active-tab').forEach(el => {
            el.classList.remove('active-tab');
            el.style.background = '#333';
        });
        document.getElementById(`tab-${tabId}`).classList.add('active-tab');
        document.getElementById(`tab-${tabId}`).style.background = '#4caf50';

        if (tabId === 'sect-tasks') this.renderTasks();
        else if (tabId === 'sect-market') this.renderMarket();
        else if (tabId === 'sect-events') this.renderEvents();
    }

    bindHeaderEvents() {
        const btnContrib = document.getElementById('btn-sect-contribute');
        if (btnContrib) {
            btnContrib.onclick = () => {
                const result = SectManager.contribute();
                if (!result.success) {
                    if (window.game && window.game.uiManager) window.game.uiManager.addLog(result.msg, 'INFO');
                } else {
                    this.update();
                }
            };
        }

        const btnRefreshContrib = document.getElementById('btn-sect-refresh-contribution');
        if (btnRefreshContrib) {
            btnRefreshContrib.onclick = () => {
                const result = SectManager.manualRefreshContribution();
                if (window.game && window.game.uiManager) window.game.uiManager.addLog(result.msg, result.success ? 'INFO' : 'SYSTEM');
                if (result.success) this.update();
            };
        }

        // Tabs
        ['sect-tasks', 'sect-market', 'sect-events'].forEach(id => {
            document.getElementById(`tab-${id}`).onclick = () => this.switchTab(id);
        });
    }

    renderTasks() {
        const lang = LanguageManager.getInstance();
        const container = document.getElementById('sect-content-area');
        container.innerHTML = `
            <div class="sect-tasks" style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 1.1em;">${lang.t('宗門任務')}</h3>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 0.85em; color: #888;">${lang.t('刷新')}: <span id="sect-task-timer">00:00:00</span></span>
                        <button id="btn-sect-refresh-tasks" class="btn" style="padding: 2px 8px; font-size: 0.75em;" title="${lang.t('手動刷新任務')}">🔄 <span id="sect-refresh-cost"></span></button>
                    </div>
                </div>
                
                <!-- Active Task -->
                <div id="sect-active-task" style="margin-bottom: 15px; padding: 12px; border: 1px solid #4fc3f7; border-radius: 6px; background: rgba(33, 150, 243, 0.1); display: none;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <h4 id="active-task-name" style="margin: 0; color: #4fc3f7;"></h4>
                        <span id="active-task-timer" style="font-size: 0.9em; font-weight: bold; color: #fff;">00:00</span>
                    </div>
                    <div id="active-task-desc" style="font-size: 0.85em; color: #ccc; margin-bottom: 5px; font-style: italic;"></div>
                    <div id="active-task-reward" style="font-size: 0.85em; color: #ffd700; margin-bottom: 8px;"></div>
                    <div class="progress-container" style="background: rgba(0,0,0,0.5); height: 8px; border-radius: 4px; margin-bottom: 8px;">
                        <div id="active-task-bar" style="width: 0%; height: 100%; background: #2196f3; border-radius: 4px; transition: width 0.5s linear;"></div>
                    </div>
                    <div style="text-align: right;">
                        <button id="btn-sect-claim" class="btn btn-active" style="display: none; padding: 4px 12px; font-size: 0.9em;">${lang.t('領取獎勵')}</button>
                    </div>
                </div>

                <!-- Task List -->
                <div id="sect-task-list" class="grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;"></div>
            </div>
        `;

        // Bind Task Events (Refresh, Claim, Start) - done in update() often, but initial bind needed for Refresh & Claim
        const btnClaim = document.getElementById('btn-sect-claim');
        if (btnClaim) {
            btnClaim.onclick = () => {
                const result = SectManager.claimTaskReward();
                if (result.success) this.renderTasks(); // Re-render to enable task buttons
            };
        }

        const btnRefresh = document.getElementById('btn-sect-refresh-tasks');
        if (btnRefresh) {
            btnRefresh.onclick = () => {
                const result = SectManager.manualRefreshTasks();
                if (window.game && window.game.uiManager) window.game.uiManager.addLog(result.msg, result.success ? 'INFO' : 'INFO');
                if (result.success) this.renderTasks();
            };
        }

        this.update(); // Trigger update to fill list
    }

    renderMarket() {
        const lang = LanguageManager.getInstance();
        const container = document.getElementById('sect-content-area');

        // Timer calculation
        const diff = Math.max(0, SectManager.state.nextMarketReset - Date.now());
        const timerText = Formatter.formatTime(diff / 1000);

        container.innerHTML = `
            <div style="padding: 15px; background: rgba(156, 39, 176, 0.1); border-radius: 8px; border: 1px solid rgba(156, 39, 176, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="margin: 0; color: #e1bee7;">${lang.t('雲海天市')} <span style="font-size:0.7em; color:#aaa;">(${lang.t('消耗宗門貢獻')})</span></h3>
                    <div style="font-size: 0.8em; color: #ddd;">
                        ${lang.t('刷新')}: <span id="market-reset-timer" style="color: #fff; margin-right: 10px;">${timerText}</span>
                        <button id="btn-refresh-market" class="btn" style="padding: 2px 8px; font-size: 0.8em; background: #ab47bc;">${lang.t('刷新')}</button>
                    </div>
                </div>
                <div id="market-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <!-- Market Items -->
                </div>
            </div>
        `;

        // Refresh Button
        const btnRefresh = document.getElementById('btn-refresh-market');
        if (btnRefresh) {
            const isDebug = window.game?.buildingManager?.debugAutoBuildEnabled;
            // Tooltip
            const costName = isDebug ? lang.t('金錢') : lang.t('丹液');
            const costAmount = isDebug ? 1 : 50;
            btnRefresh.title = `${lang.t('立即刷新')} (${costName}x${costAmount})`;

            btnRefresh.onclick = () => {
                const result = SectManager.manualRefreshMarket();
                if (window.game && window.game.uiManager) window.game.uiManager.addLog(result.msg, result.success ? 'INFO' : 'SYSTEM');
                if (result.success) this.renderMarket();
                this.update();
            };
        }

        const list = document.getElementById('market-list');
        const items = SectManager.getMarketItems();

        Object.values(items).forEach(item => {
            const div = document.createElement('div');
            div.style = 'background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;';

            const currentCount = SectManager.state.marketPurchaseCounts ? (SectManager.state.marketPurchaseCounts[item.id] || 0) : 0;
            const isSoldOut = currentCount >= item.limit;

            div.innerHTML = `
                <div>
                    <div style="font-weight: bold; color: #ce93d8;">${lang.t(item.id)}</div>
                    <div style="font-size: 0.8em; color: #bbb; margin: 2px 0;">${lang.t(item.id + '_desc')}</div>
                    <div style="font-size: 0.8em; color: #aaa;">${lang.t('消耗')}: <span style="color: #ffd700;">${item.cost} ${lang.t('貢獻')}</span></div>
                    <div style="font-size: 0.75em; color: #666;">${lang.t('限購')}: ${currentCount}/${item.limit}</div>
                </div>
                <button class="btn-buy-market btn" data-id="${item.id}" style="padding: 4px 12px; font-size: 0.8em;" ${isSoldOut ? 'disabled' : ''}>
                    ${isSoldOut ? lang.t('售罄') : lang.t('兌換')}
                </button>
            `;

            div.querySelector('.btn-buy-market').onclick = () => {
                const result = SectManager.buyMarketItem(item.id);
                if (window.game && window.game.uiManager) window.game.uiManager.addLog(result.msg, result.success ? 'INFO' : 'SYSTEM');
                if (result.success) this.renderMarket(); // Re-render to update counts
                this.update(); // Update header currency
            };

            list.appendChild(div);
        });
    }

    renderEvents() {
        const lang = LanguageManager.getInstance();
        const container = document.getElementById('sect-content-area');
        const activeEvent = SectManager.state.activeEvent;
        const nextTime = SectManager.state.nextEventTime;

        if (activeEvent) {
            const isFull = activeEvent.currentCompletions >= activeEvent.limit;

            container.innerHTML = `
                <div style="padding: 20px; background: rgba(33, 150, 243, 0.1); border-radius: 8px; text-align: center; border: 1px solid #2196f3;">
                    <h2 style="color: #64b5f6; margin-bottom: 5px;">${lang.t(activeEvent.name)}</h2>
                    <p style="color: #ccc; margin-bottom: 15px;">${lang.t(activeEvent.desc)}</p>
                    
                    <div style="margin: 20px 0; font-size: 1.2em;">
                        ${lang.t('求購')}: <span style="color: #ffd700;">${lang.t(activeEvent.target)} x${activeEvent.batchSize || 1}</span>
                    </div>
                    
                    <div style="margin-bottom: 15px; font-size: 0.9em; color: #aaa;">
                        ${lang.t('剩餘次數')}: <span style="color: #fff;">${activeEvent.limit - activeEvent.currentCompletions}/${activeEvent.limit}</span>
                    </div>

                    <div style="margin-bottom: 20px; font-size: 0.9em; color: #888;">
                        ${lang.t('剩餘時間')}: <span id="event-timer">00:00</span>
                    </div>

                    <button id="btn-submit-event" class="btn" style="padding: 10px 30px; background: ${isFull ? '#666' : '#2196f3'}; font-weight: bold;" ${isFull ? 'disabled' : ''}>
                        ${isFull ? lang.t('已達上限') : lang.t('提交物品')}
                    </button>
                </div>
            `;

            const btnSubmit = document.getElementById('btn-submit-event');
            if (btnSubmit && !isFull) {
                btnSubmit.onclick = () => {
                    const result = SectManager.submitEventItem();
                    if (window.game && window.game.uiManager) window.game.uiManager.addLog(result.msg, result.success ? 'INFO' : 'SYSTEM');
                    this.renderEvents(); // Re-render to update counts
                };
            }
        } else {
            const diff = Math.max(0, nextTime - Date.now());
            const minutes = Math.ceil(diff / 60000);
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #666;">
                    <h3>${lang.t('暫無事件')}</h3>
                    <p>${lang.t('下一次天機顯現')}: ${minutes}${lang.t('分鐘後')}</p>
                    <button id="btn-force-event" class="btn" style="margin-top:20px; font-size:0.8em; opacity:0.5;">(Debug) 觸發事件</button>
                </div>
            `;
            const btnForce = document.getElementById('btn-force-event');
            if (btnForce) {
                btnForce.onclick = () => {
                    SectManager.triggerRandomEvent();
                    this.renderEvents();
                };
            }
        }
    }

    update() {
        const lang = LanguageManager.getInstance();
        const level = SectManager.getSectLevel();
        const dev = SectManager.state.developmentPoints;
        const req = SectManager.getRequiredDevelopment();
        const contribCount = SectManager.state.contributionCount;
        const playerContrib = SectManager.state.playerContribution || 0;

        // Update Info
        const elLevel = document.getElementById('sect-level');
        const elDevText = document.getElementById('sect-dev-text');
        const elDevBar = document.getElementById('sect-dev-bar');
        const elLevelDesc = document.getElementById('sect-level-desc');
        const elPlayerContrib = document.getElementById('player-contribution');

        if (elPlayerContrib) elPlayerContrib.textContent = playerContrib;
        if (elLevel) elLevel.textContent = level;
        if (elDevText) elDevText.textContent = `${dev}/${req}`;
        if (elDevBar) elDevBar.style.width = `${Math.min(100, (dev / req) * 100)}%`;

        // Level Description
        if (elLevelDesc) {
            let descKey = `宗門_desc_${level}`;
            const descText = lang.t(descKey);
            elLevelDesc.innerText = descText === descKey ? lang.t('可接取宗門任務') : descText;
        }

        // Active Task Update (If visible)
        const activeTask = SectManager.state.activeTask;
        const elActiveBox = document.getElementById('sect-active-task');
        if (elActiveBox && elActiveBox.style.display !== 'none') {
            const elActiveTimer = document.getElementById('active-task-timer');
            const elActiveBar = document.getElementById('active-task-bar');
            const btnClaim = document.getElementById('btn-sect-claim');

            if (activeTask && elActiveTimer && elActiveBar) {
                const now = Date.now();
                if (now >= activeTask.endTime) {
                    elActiveTimer.textContent = lang.t('已完成');
                    if (btnClaim) btnClaim.style.display = 'block';
                    elActiveBar.style.width = '100%';
                    elActiveBar.style.background = '#4caf50';
                } else {
                    const remain = Math.max(0, (activeTask.endTime - now) / 1000);
                    elActiveTimer.textContent = Formatter.formatTime(remain);
                }
            }
        }

        // Event Timer Update
        const elEventTimer = document.getElementById('event-timer');
        if (elEventTimer && SectManager.state.activeEvent) {
            const diff = Math.max(0, SectManager.state.activeEvent.endTime - Date.now());
            elEventTimer.textContent = Formatter.formatTime(diff / 1000);
        }

        // Update Contrib
        const elContribCount = document.getElementById('sect-contrib-count');
        const elContribTimer = document.getElementById('sect-contrib-timer');
        const elCost = document.getElementById('contrib-cost-preview');

        if (elContribCount) elContribCount.textContent = contribCount;
        if (elContribTimer) {
            const diff = Math.max(0, SectManager.state.nextContributionReset - Date.now());
            elContribTimer.textContent = Formatter.formatTime(diff / 1000);
        }

        // Market Timer Update
        const elMarketTimer = document.getElementById('market-reset-timer');
        if (elMarketTimer && SectManager.state.nextMarketReset) {
            const diff = Math.max(0, SectManager.state.nextMarketReset - Date.now());
            elMarketTimer.textContent = Formatter.formatTime(diff / 1000);
        }

        // Update Refresh Contrib Tooltip
        const btnRefreshContrib = document.getElementById('btn-sect-refresh-contribution');
        if (btnRefreshContrib) {
            const isDebug = window.game?.buildingManager?.debugAutoBuildEnabled;
            const costName = isDebug ? lang.t('金錢') : lang.t('丹液');
            const costAmount = isDebug ? 1 : '10000';
            btnRefreshContrib.title = `${lang.t('刷新次數')} (${costName}x${costAmount})`;
        }

        if (elCost) {
            const cost = SectManager.getContributionCost();
            const costText = Object.entries(cost).map(([k, v]) => `${lang.t(k)}x${v}`).join(', ');
            elCost.textContent = `${lang.t('消耗')}: ${costText}`;

            // Check sufficiency to set color
            let affordable = true;
            if (window.game && window.game.resourceManager) {
                for (const [key, val] of Object.entries(cost)) {
                    const res = window.game.resourceManager.getResource(key);
                    const current = res ? res.value : 0;
                    if (current < val) {
                        affordable = false;
                        break;
                    }
                }
            }
            elCost.style.color = affordable ? '#ffffff' : '#e57373';
        }

        // Update Active Task Display Logic from previous structure 
        // (Re-using logic elements defined within renderTasks or querying them)
        const elActiveName = document.getElementById('active-task-name');
        const elActiveDesc = document.getElementById('active-task-desc');
        const elActiveReward = document.getElementById('active-task-reward');
        const elActiveBar = document.getElementById('active-task-bar');
        const elActiveTimer = document.getElementById('active-task-timer');
        const btnClaim = document.getElementById('btn-sect-claim');

        if (elActiveBox) {
            if (activeTask) {
                elActiveBox.style.display = 'block';

                // Rarity Styling
                const rarityColor = activeTask.rarityColor || '#4fc3f7';
                elActiveBox.style.borderColor = rarityColor;
                elActiveBox.style.background = `${rarityColor}1a`; // Low opacity background
                if (elActiveName) elActiveName.style.color = rarityColor;

                // Name & Descripton & Reward
                const rarityName = activeTask.rarityName ? `[${lang.t(activeTask.rarityName)}] ` : '';
                if (elActiveName) elActiveName.textContent = rarityName + lang.t(activeTask.name);

                if (elActiveDesc) elActiveDesc.textContent = lang.t(activeTask.desc);

                if (elActiveReward) {
                    let rewardText = Object.entries(activeTask.reward).map(([k, v]) => `${lang.t(k)}x${v}`).join(' ');
                    if (activeTask.specialEffect) {
                        const val = Math.round(activeTask.specialEffect.value * 100) + '%';
                        const effectStr = lang.t(`effect_${activeTask.specialEffect.type}`, { '0': val });
                        rewardText += ` + ✨ ${effectStr}`;
                    }
                    elActiveReward.textContent = `${lang.t('獎勵')}: ${rewardText}`;
                }

                const now = Date.now();
                const total = activeTask.endTime - activeTask.startTime;
                const elapsed = now - activeTask.startTime;
                const pct = Math.min(100, (elapsed / total) * 100);

                if (elActiveBar) elActiveBar.style.width = `${pct}%`;

                if (now >= activeTask.endTime) {
                    if (elActiveTimer) elActiveTimer.textContent = lang.t('已完成');
                    if (btnClaim) btnClaim.style.display = 'block';
                    if (elActiveBar) elActiveBar.style.background = '#4caf50';
                } else {
                    const remain = Math.max(0, (activeTask.endTime - now) / 1000);
                    if (elActiveTimer) elActiveTimer.textContent = Formatter.formatTime(remain);
                    if (btnClaim) btnClaim.style.display = 'none';
                    if (elActiveBar) elActiveBar.style.background = '#2196f3';
                }
            } else {
                elActiveBox.style.display = 'none';
            }
        }

        // Update Task List
        const elTaskList = document.getElementById('sect-task-list');
        const elTaskTimer = document.getElementById('sect-task-timer');

        if (elTaskTimer) {
            const diff = Math.max(0, SectManager.state.nextTaskRefresh - Date.now());
            elTaskTimer.textContent = Formatter.formatTime(diff / 1000);
        }

        // Update Refresh Cost Display
        const elRefreshCost = document.getElementById('sect-refresh-cost');
        if (elRefreshCost) {
            const isDebug = window.game?.buildingManager?.debugAutoBuildEnabled;
            if (isDebug) {
                elRefreshCost.textContent = `${lang.t('金錢')}x1`;
                elRefreshCost.style.color = '#ffd700';
            } else {
                elRefreshCost.textContent = `${lang.t('丹液')}x10`;
                elRefreshCost.style.color = '#ff9800';
            }
        }

        if (elTaskList && elTaskList.innerHTML === '') {
            // Initial render of tasks if empty (optional safety)
            // But usually renderTasks handles this. 
            // We should iterate tasks here only if we want dynamic updates without full re-render
            // For now, let's just clear and rebuild for simplicity as in original code
            elTaskList.innerHTML = '';
            SectManager.state.tasks.forEach((task, index) => {
                const div = document.createElement('div');
                div.className = 'task-card';

                // Apply rarity color to border and glow
                const rarityColor = task.rarityColor || '#444';
                div.style = `background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; border: 2px solid ${rarityColor}; box-shadow: 0 0 8px ${rarityColor}40;`;

                const rewardText = Object.entries(task.reward).map(([k, v]) => `${lang.t(k)}x${v}`).join(' ');
                const durationMins = Math.floor(task.duration / 60000);

                // Rarity label
                const rarityLabel = task.rarityName ? `[${lang.t(task.rarityName)}]` : '';

                let specialText = '';
                if (task.specialEffect && task.specialEffect.type === 'reduce_training_time') {
                    const percent = Math.round(task.specialEffect.value * 100);
                    specialText = `<div style="font-size: 0.8em; color: #ff9800; margin-bottom: 5px;">✨ ${lang.t('effect_reduce_training_time', { '0': percent + '%' })}</div>`;
                }

                div.innerHTML = `
                    <div style="font-weight: bold; color: ${rarityColor}; margin-bottom: 5px;">${rarityLabel} ${lang.t(task.name)}</div>
                    <div style="font-size: 0.8em; color: #aaa; margin-bottom: 5px;">${lang.t(task.desc)}</div>
                    <div style="font-size: 0.8em; color: #ffd700; margin-bottom: 5px;">${lang.t('獎勵')}: ${rewardText}</div>
                    ${specialText}
                    <div style="font-size: 0.8em; color: #999; margin-bottom: 8px;">${lang.t('需時')}: ${durationMins}${lang.t('分鐘')}</div>
                    <button class="btn-start-task btn" style="width: 100%; padding: 2px; font-size: 0.8em;">${lang.t('接受')}</button>
                `;

                if (activeTask) {
                    div.querySelector('button').disabled = true;
                    div.querySelector('button').classList.add('btn-disabled');
                }

                div.querySelector('.btn-start-task').onclick = () => {
                    const res = SectManager.startTask(index);
                    if (res.success) {
                        this.renderTasks();
                    } else {
                        if (window.game && window.game.uiManager) {
                            window.game.uiManager.addLog(res.msg, 'INFO');
                        }
                    }
                };

                elTaskList.appendChild(div);
            });
        }
    }
}
