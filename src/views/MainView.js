
import ResourcePanel from '../components/ResourcePanel.js';
import BuildingPanel from '../components/BuildingPanel.js';
import CraftingPanel from '../components/CraftingPanel.js';
import SkillPanel from '../components/SkillPanel.js';
import TalentPanel from '../components/TalentPanel.js';
import DebugPanel from '../components/DebugPanel.js';
import TabSystem from '../components/TabSystem.js';
import PlayerManager from '../utils/PlayerManager.js';
import EraManager from '../utils/EraManager.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class UIManager {
    constructor(game) {
        this.game = game;
        this.resourcePanel = new ResourcePanel(game.resourceManager);
        this.buildingPanel = new BuildingPanel(game.buildingManager, game.resourceManager);
        this.craftingPanel = new CraftingPanel(game.resourceManager, game.buildingManager);
        this.skillPanel = new SkillPanel();
        this.talentPanel = new TalentPanel();
        this.debugPanel = new DebugPanel();
        this.tabSystem = new TabSystem();

        // Dom elements
        this.saveBtn = document.getElementById('save-btn');
        this.loadBtn = document.getElementById('load-btn');
        this.saveModal = document.getElementById('save-modal');
        this.closeModalBtn = document.querySelector('.close-modal');
        this.copyBtn = document.getElementById('copy-btn');
        this.playerInfoDiv = document.getElementById('player-info');
        this.confirmLoadBtn = document.getElementById('confirm-load-btn');
        this.saveDataArea = document.getElementById('save-data-area');
        this.modalTitle = document.getElementById('modal-title');
    }

    async init() {
        // Init Language Manager
        await LanguageManager.getInstance().init();

        // Init Components
        this.resourcePanel.init();
        this.buildingPanel.init();
        this.craftingPanel.init();
        this.skillPanel.init();
        this.talentPanel.init();
        this.debugPanel.init();
        this.tabSystem.init();

        // 註冊 Debug 分頁的刷新回調
        this.tabSystem.registerCallback('debug', () => {
            this.debugPanel.refresh();
        });

        this.bindEvents();
        this.updatePlayerInfo();
        this.initResourceToggle(); // 初始化資源摺疊功能
        this.updateInitialLog();   // 處理初始日誌訊息
        this.initLanguageSwitcher(); // 初始化語言切換器
        this.updateTabNames();       // 初始化頁籤名稱
        this.updateStaticText();     // 初始化靜態文本
    }

    updateStaticText() {
        const lang = LanguageManager.getInstance();

        // 網頁標題
        document.title = lang.t('修仙問道 - 放置網頁遊戲');
        const mainHeader = document.querySelector('.main-header h1');
        if (mainHeader) mainHeader.textContent = lang.t('修仙問道');

        // 資源面板標題
        const resHeader = document.querySelector('#resources-header h2');
        if (resHeader) resHeader.textContent = lang.t('資源');

        // 左側按鈕
        if (this.saveBtn) this.saveBtn.textContent = lang.t('保存進度');
        if (this.loadBtn) this.loadBtn.textContent = lang.t('讀取進度');

        // 右側日誌標題
        const logHeader = document.querySelector('#log-header h3');
        if (logHeader) logHeader.textContent = lang.t('修仙日誌');

        // Modal 內容 (部分動態生成，但初始靜態部分也可更新)
        const modalP = document.querySelector('#save-modal p');
        if (modalP) modalP.textContent = lang.t('請複製以上代碼保存，或貼上代碼讀取。');

        // 輪迴相關 (壽元耗盡框)
        const reincarnateBox = document.getElementById('reincarnate-box');
        if (reincarnateBox) {
            const p = reincarnateBox.querySelector('p');
            if (p) p.textContent = '⏳ ' + lang.t('壽元已盡，天命難違');
            const btn = reincarnateBox.querySelector('button');
            if (btn) btn.textContent = '🪷 ' + lang.t('輪迴證道');
        }

        // 輪迴按鈕 (主動)
        const rebirthBtn = document.getElementById('rebirth-action-btn');
        if (rebirthBtn) rebirthBtn.textContent = lang.t('輪迴證道');
    }

    updateTabNames() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            const key = tab.textContent.trim();
            // 嘗試翻譯，如果 key 本身就是中文，可以直接用 LanguageManager.t
            // 但因為 tab.textContent 可能已經被翻譯過（如果我們多次調用），這依賴於初始 HTML 是中文
            // 更好的做法是給 tab 一個 data-i18n-key
            // 這裡我們先假設 tab.textContent 是預設中文

            // 由於 tab 的文本是寫死在 index.html 中的，我們需要一個映射或者直接翻譯
            // 為了避免重複翻譯問題，我們可以用 data-tab 作為 key 前綴，或者我們手動維護一個映射

            const tabKeyMap = {
                'buildings': '洞府建築',
                'crafting': '煉製合成',
                'skills': '功法修煉',
                'talents': '輪迴天賦',
                'debug': 'Debug' // Debug 通常不翻譯
            };

            const originalText = tabKeyMap[tab.dataset.tab];
            if (originalText) {
                tab.textContent = LanguageManager.getInstance().t(originalText);
            }
        });
    }

    /** 處理初始日誌訊息，顯示當前天時效果 */
    updateInitialLog() {
        const logList = document.getElementById('log-list');
        if (!logList) return;

        // 如果日誌為空，添加歡迎訊息
        if (!logList.firstElementChild) {
            // Use base key without dots to ensure match with existing JSON key at line 8
            const welcomeText = LanguageManager.getInstance().t('歡迎來到修仙世界') + '...';
            const li = document.createElement('li');
            li.textContent = welcomeText;
            logList.appendChild(li);
        }

        // 如果壽元大於 0.001 (表示有現有進度或是載入存檔)
        if (PlayerManager.getLifespan() > 0.001) {
            const surge = PlayerManager.getSpiritSurge();
            if (logList && logList.firstElementChild) {
                const welcomeMsg = logList.firstElementChild;
                const welcomeKey = LanguageManager.getInstance().t('歡迎來到修仙世界');
                // 寬鬆檢查，只要包含歡迎文字即可
                if (welcomeMsg.textContent.includes(welcomeKey) || welcomeMsg.textContent.includes('Welcome')) {
                    const bonusText = surge.bonus >= 0 ? `+${(surge.bonus * 100).toFixed(0)}%` : `${(surge.bonus * 100).toFixed(0)}%`;
                    // Check if already appended
                    if (!welcomeMsg.textContent.includes(LanguageManager.getInstance().t('當前天時'))) {
                        welcomeMsg.innerHTML += ` <span style="color: #00bcd4;">[${LanguageManager.getInstance().t('當前天時')}：${LanguageManager.getInstance().t(surge.name)} (${bonusText}${LanguageManager.getInstance().t('靈力產出')})]</span>`;
                    }
                }
            }
        }
    }

    bindEvents() {
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.openSaveModal('save'));
        }
        if (this.loadBtn) {
            this.loadBtn.addEventListener('click', () => this.openSaveModal('load'));
        }
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.saveModal.classList.add('hidden'));
        }
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => {
                this.saveDataArea.select();
                document.execCommand('copy');
                alert('存檔代碼已複製！');
            });
        }
        if (this.confirmLoadBtn) {
            this.confirmLoadBtn.addEventListener('click', () => {
                const code = this.saveDataArea.value;
                if (!code) return;
                const data = this.game.saveSystem.parseSaveCode(code);
                if (data) {
                    this.game.resourceManager.loadData(data.resources);
                    this.saveModal.classList.add('hidden');
                    alert('讀取成功！');
                } else {
                    alert('存檔代碼無效！');
                }
            });
        }
        window.addEventListener('click', (e) => {
            if (e.target === this.saveModal) {
                this.saveModal.classList.add('hidden');
            }
        });
    }

    openSaveModal(mode) {
        if (!this.saveModal) return;
        this.saveModal.classList.remove('hidden');
        this.saveDataArea.value = '';

        if (mode === 'save') {
            this.modalTitle.textContent = LanguageManager.getInstance().t('保存進度');
            this.saveDataArea.readOnly = true;
            const code = this.game.saveSystem.generateSaveCode();
            this.saveDataArea.value = code;
            this.copyBtn.classList.remove('hidden');
            this.confirmLoadBtn.classList.add('hidden');
        } else {
            this.modalTitle.textContent = LanguageManager.getInstance().t('讀取進度');
            this.saveDataArea.readOnly = false;
            this.copyBtn.classList.add('hidden');
            this.confirmLoadBtn.classList.remove('hidden');
            this.saveDataArea.placeholder = LanguageManager.getInstance().t('請在此貼上存檔代碼...');
        }
    }

    /** 更新玩家資訊區塊 */
    updatePlayerInfo() {
        const eraId = PlayerManager.getEraId();
        const era = EraManager.getEraById(eraId);
        const level = PlayerManager.getLevel();

        const currentResources = this.game.resourceManager.getUnlockedResources();
        const upgradeCheck = PlayerManager.canUpgrade(currentResources);
        const levelUpCheck = PlayerManager.canLevelUp(currentResources);
        const isExhausted = PlayerManager.isLifespanExhausted();

        // 判斷是否需要渡劫（金丹期及以後）
        const needsTribulation = eraId >= 3;
        const tribulationRate = needsTribulation ? PlayerManager.getTribulationSuccessRate() : 0;
        const upgradeButtonText = needsTribulation ? '⚡ 渡劫' : '✨ 升階';

        // 構建升階按鈕的 tooltip
        let upgradeTooltip = upgradeCheck.reason;
        if (needsTribulation && upgradeCheck.canUpgrade) {
            upgradeTooltip = `渡劫成功率: ${(tribulationRate * 100).toFixed(1)}%\n${upgradeCheck.reason}`;
        }

        // 渡劫成功率顏色
        let tribulationColor = '#fff'; // 白色 (90%+)
        if (tribulationRate < 0.9) tribulationColor = '#2196f3'; // 藍色 (70-90%)
        if (tribulationRate < 0.7) tribulationColor = '#4caf50'; // 綠色 (50-70%)
        if (tribulationRate <= 0.5) tribulationColor = '#f44336'; // 紅色 (50%或以下)

        // 渡劫成功率顯示（僅在需要渡劫時顯示）
        const tribulationDisplay = needsTribulation
            ? `<div class="player-info-line" style="font-size: 0.85em; margin-bottom: 8px;">
                   <span style="color: ${tribulationColor}; font-weight: bold;">${LanguageManager.getInstance().t('渡劫成功率')}: ${(tribulationRate * 100).toFixed(1)}%</span>
               </div>`
            : '';

        this.playerInfoDiv.innerHTML = `
            ${tribulationDisplay}
            <div class="player-info-line">
                <span>${LanguageManager.getInstance().t('境界')}: <b style="color:var(--gold-color)">${era ? LanguageManager.getInstance().t(era.eraName) : '...'}</b></span>
                <button id="upgrade-btn" class="mini-btn ${upgradeCheck.canUpgrade ? 'btn-active' : 'btn-disabled'}" 
                    title="${upgradeTooltip}">${LanguageManager.getInstance().t(upgradeButtonText.replace('⚡ ', '').replace('✨ ', ''))}</button>
            </div>
            <div class="player-info-line">
                <span>${LanguageManager.getInstance().t('等級')}: <b style="color:#fff">${level}</b></span>
                <button id="level-up-btn" class="mini-btn ${levelUpCheck.canLevelUp ? 'btn-active' : 'btn-disabled'}" 
                    title="${levelUpCheck.reason}">📈 ${LanguageManager.getInstance().t('提升')}</button>
            </div>
            <div class="player-info-line" style="font-size: 0.85em; color: #aaa;">
                <span>${LanguageManager.getInstance().t('境界年歲')}: <span id="player-time-era">0h 0m 0s</span></span>
            </div>
            <div class="player-info-line" style="font-size: 0.85em; color: #aaa;">
                <span>${LanguageManager.getInstance().t('修練時間')}: <span id="player-time-total">0h 0m 0s</span></span>
            </div>
            <div class="player-info-line" style="font-size: 0.85em; color: #aaa; margin-bottom: 5px;">
                <span>${LanguageManager.getInstance().t('壽元')}: <span id="player-lifespan" style="color:#ffd700">0</span> / <span id="player-lifespan-max">0 年</span></span>
                <button id="goto-rebirth-btn" class="mini-btn btn-active" style="display:none; margin-left: 10px; padding: 0 5px; font-size: 0.8em; background: #9c27b0; border-color: #7b1fa2;">🌀 ${LanguageManager.getInstance().t('輪迴')}</button>
            </div>
            <div id="spirit-surge-info" class="player-info-line" style="font-size: 0.85em; color: #00bcd4; margin-bottom: 5px;">
                <span>${LanguageManager.getInstance().t('天時')}: <b id="surge-name">載入中...</b> (<span id="surge-effect">0%</span>)</span>
            </div>
            <div id="reincarnate-box" style="${isExhausted ? '' : 'display:none;'} background: rgba(230, 126, 34, 0.2); padding: 8px; border-radius: 4px; border: 1px solid #e67e22; margin-bottom: 10px;">
                <p style="font-size: 0.85em; color: #e67e22; text-align: center; margin: 0 0 8px 0; font-weight:bold;">⏳ ${LanguageManager.getInstance().t('壽元已盡，天命難違')}</p>
                <button id="reincarnate-btn" class="btn" style="width:100%; height:36px; background:#e67e22; color:white; font-weight:bold; font-size: 1em; border:none; border-radius:4px; cursor:pointer;">🪷 輪迴證道</button>
            </div>
            
            <!-- 輪迴按鈕區域（根據建築顯示） -->
            <div id="rebirth-action-box" style="display:none; background: rgba(156, 39, 176, 0.2); padding: 8px; border-radius: 4px; border: 1px solid #9c27b0; margin-bottom: 10px;">
                <button id="rebirth-action-btn" class="btn" style="width:100%; height:36px; background:#9c27b0; color:white; font-weight:bold; font-size: 1em; border:none; border-radius:4px; cursor:pointer;">輪迴證道</button>
            </div>
        `;

        this.bindPlayerEvents();
        this.updatePlayerStatus();
    }

    /**
     * 新增日誌
     * @param {string} message - 日誌內容
     */
    addLog(message) {
        const lang = LanguageManager.getInstance();
        const yearUnit = lang.t('年');
        const currentYear = PlayerManager.getLifespan().toFixed(1);
        const formattedMessage = `<span style="color:#aaa">[${currentYear} ${yearUnit}]</span> ${message}`;

        // 添加到右側日誌頁面
        const logList = document.getElementById('log-list');
        const logContainer = document.getElementById('log-list-container');

        if (logList) {
            const li = document.createElement('li');
            li.innerHTML = formattedMessage;

            // 保持最新在底部，符合聊天室/日誌習慣，或者頂部？
            // 原有邏輯是 insertBefore (最新在最上)。
            // 為了配合自動滾動到底部，通常最新在最下。
            // 但如果用戶想要最新在最上，就不需要滾動到底部。
            // 讓我們改為最新在最上，這樣不需要滾動，且符合"日誌"查看習慣。
            // 修正：原左側CSS是 overflow-y: auto。

            if (logList.firstChild) {
                logList.insertBefore(li, logList.firstChild);
            } else {
                logList.appendChild(li);
            }

            // 限制數量
            while (logList.children.length > 200) {
                logList.removeChild(logList.lastChild);
            }

            // 確保容器滾動到頂部（如果用戶向上滾動查看歷史，可能不需要強制？但最新消息通常需要看到）
            // 如果最新在最上，則scrollTop應該是0
            if (logContainer) {
                logContainer.scrollTop = 0;
            }
        }
    }




    updatePlayerStatus() {
        const maxLifeYears = PlayerManager.getMaxLifespan();
        const maxLifeMs = maxLifeYears * 60000;
        const totalElapsedMs = Date.now() - PlayerManager.getTotalStartTimestamp();
        const isDead = totalElapsedMs >= maxLifeMs;
        const deathTimestamp = PlayerManager.getTotalStartTimestamp() + maxLifeMs;

        const updateTimer = (id, startTimestamp, isTotal = false) => {
            const el = document.getElementById(id);
            if (!el) return;

            let effectiveElapsedMs;
            if (isTotal) {
                effectiveElapsedMs = Math.min(totalElapsedMs, maxLifeMs);
            } else {
                const effectiveNow = isDead ? deathTimestamp : Date.now();
                effectiveElapsedMs = Math.max(0, effectiveNow - startTimestamp);
            }

            const years = effectiveElapsedMs / 60000;
            const yearText = LanguageManager.getInstance().t('年');
            el.textContent = `${years.toFixed(1)} ${yearText}`;
        };

        updateTimer('player-time-era', PlayerManager.getStartTimestamp());
        updateTimer('player-time-total', PlayerManager.getTotalStartTimestamp(), true);

        const spanLifespan = document.getElementById('player-lifespan');
        const spanMax = document.getElementById('player-lifespan-max');
        const reincarnateBox = document.getElementById('reincarnate-box');
        const currentResources = this.game.resourceManager.getUnlockedResources();

        if (spanLifespan && spanMax) {
            const current = PlayerManager.getLifespan();
            const max = PlayerManager.getMaxLifespan();
            const yearText = LanguageManager.getInstance().t('年');
            spanLifespan.textContent = current.toFixed(1) + (current >= max ? ' ' + LanguageManager.getInstance().t('[已盡]') : '');
            spanMax.textContent = max + ' ' + yearText;

            if (current >= max && reincarnateBox && reincarnateBox.style.display === 'none') {
                reincarnateBox.style.display = 'block';
            }
        }

        // 檢查遊玩提示
        this.checkGameHints();

        // 靈力潮汐更新
        const surge = PlayerManager.getSpiritSurge();
        const nameEl = document.getElementById('surge-name');
        const effectEl = document.getElementById('surge-effect');
        if (nameEl && effectEl) {
            if (nameEl.textContent !== surge.name) {
                nameEl.textContent = LanguageManager.getInstance().t(surge.name);
                effectEl.textContent = (surge.bonus >= 0 ? '+' : '') + (surge.bonus * 100).toFixed(0) + '%';
                // 當運勢變換時，即時重新計算產出率
                this.game.buildingManager.recalculateRates();
            }
        }

        // 更新渡劫成功率顯示（金丹期及以後）
        const eraId = PlayerManager.getEraId();
        const needsTribulation = eraId >= 3;
        if (needsTribulation) {
            const tribulationRate = PlayerManager.getTribulationSuccessRate();

            // 更新渡劫成功率文字
            const tribulationSpan = document.querySelector('#player-info .player-info-line span[style*="font-weight: bold"]');
            if (tribulationSpan && tribulationSpan.textContent.includes('渡劫成功率')) {
                // 更新顏色
                let tribulationColor = '#fff'; // 白色 (90%+)
                if (tribulationRate < 0.9) tribulationColor = '#2196f3'; // 藍色 (70-90%)
                if (tribulationRate < 0.7) tribulationColor = '#4caf50'; // 綠色 (50-70%)
                if (tribulationRate <= 0.5) tribulationColor = '#f44336'; // 紅色 (50%或以下)

                tribulationSpan.style.color = tribulationColor;
                tribulationSpan.textContent = `渡劫成功率: ${(tribulationRate * 100).toFixed(1)}%`;
            }

            // 更新升階按鈕的 tooltip
            const upBtn = document.getElementById('upgrade-btn');
            if (upBtn) {
                const check = PlayerManager.canUpgrade(currentResources);
                if (check.canUpgrade) {
                    upBtn.title = `渡劫成功率: ${(tribulationRate * 100).toFixed(1)}%\n${check.reason}`;
                } else {
                    upBtn.title = check.reason;
                }
            }
        }

        const upBtn = document.getElementById('upgrade-btn');
        if (upBtn) {
            const check = PlayerManager.canUpgrade(currentResources);
            upBtn.className = `mini-btn ${check.canUpgrade ? 'btn-active' : 'btn-disabled'}`;
            // tooltip 已在上面的渡劫成功率更新中處理
            if (!needsTribulation) {
                upBtn.title = check.reason;
            }
        }

        const lvlBtn = document.getElementById('level-up-btn');
        if (lvlBtn) {
            const check = PlayerManager.canLevelUp(currentResources);
            lvlBtn.className = `mini-btn ${check.canLevelUp ? 'btn-active' : 'btn-disabled'}`;
            lvlBtn.title = check.reason;
        }

        // 更新輪迴按鈕顯示
        this.updateRebirthButton();

        // 資源壽元旁邊的輪迴快捷按鈕
        const gotoRebirthBtn = document.getElementById('goto-rebirth-btn');
        if (gotoRebirthBtn) {
            const buildingsData = window.game.buildingManager.exportData();
            const buildings = buildingsData.buildings || buildingsData; // 相容兩種格式
            const hasLotus = buildings['rebirth_lotus'] && buildings['rebirth_lotus'].level > 0;
            const hasMirror = buildings['void_mirror'] && buildings['void_mirror'].level > 0;

            if (isDead || hasLotus || hasMirror) {
                gotoRebirthBtn.style.display = 'inline-block';
                if (isDead) {
                    gotoRebirthBtn.style.background = '#e67e22'; // 壽命耗盡顯示橘色
                    gotoRebirthBtn.textContent = '⏳ 已盡';
                } else {
                    gotoRebirthBtn.style.background = '#9c27b0'; // 提前輪迴顯示紫色
                    gotoRebirthBtn.textContent = '🌀 輪迴';
                }
            } else {
                gotoRebirthBtn.style.display = 'none';
            }
        }
    }

    /** 檢查並觸發遊玩提示 */
    checkGameHints() {
        const eraId = PlayerManager.getEraId();
        const current = PlayerManager.getLifespan();
        const max = PlayerManager.getMaxLifespan();
        if (max <= 0) return;

        const ratio = current / max;
        const hints = PlayerManager.getHints();

        // 提示 1：金丹期及以前 (Era <= 3)，壽元達到 1/3
        if (eraId <= 3 && ratio >= 1 / 3 && !hints.rule1Triggered) {
            this.addLog(`<span style="color:#ffa726">${LanguageManager.getInstance().t('🏃【修煉提示】目前壽元已過三分之一，建議抓緊時間修煉功法。同時別忘了透過「合成」面板準備丹藥，以提高未來渡劫的成功率！')}</span>`);
            PlayerManager.updateHints({ rule1Triggered: true });
        }

        // 提示 2：元嬰期及以後 (Era >= 4)，壽元剩餘不到一半（比率過半），每 60 年提醒一次
        if (eraId >= 4 && ratio >= 0.5) {
            const currentYearFloor = Math.floor(current);
            const interval = Math.floor(currentYearFloor / 60);
            const lastInterval = Math.floor(hints.lastRule2Year / 60);

            if (interval > lastInterval) {
                this.addLog(`<span style="color:#ffa726">${LanguageManager.getInstance().t('🧘【修煉提示】目前壽元剩餘不到一半。若覺本世突破無望，可考慮建造「🪷 往生蓮臺」提前輪迴，以積累更多道心與道證，助下世修仙路更順遂。')}</span>`);
                PlayerManager.updateHints({ lastRule2Year: currentYearFloor });
            }
        }
    }


    bindPlayerEvents() {
        const upgradeBtn = document.getElementById('upgrade-btn');
        const levelUpBtn = document.getElementById('level-up-btn');
        const reincarnateBtn = document.getElementById('reincarnate-btn');
        const gotoRebirthBtn = document.getElementById('goto-rebirth-btn');

        if (gotoRebirthBtn) {
            gotoRebirthBtn.onclick = () => {
                if (this.tabSystem) {
                    this.tabSystem.switchTab('talents');
                }
            };
        }

        if (upgradeBtn) {
            upgradeBtn.onclick = () => {
                const currentResources = this.game.resourceManager.getUnlockedResources();
                if (PlayerManager.upgrade(currentResources)) {
                    this.updatePlayerInfo();
                    window.game.buildingManager.recalculateRates();
                }
            };
        }

        if (levelUpBtn) {
            levelUpBtn.onclick = () => {
                const currentResources = this.game.resourceManager.getAllResources();
                if (PlayerManager.increaseLevel(currentResources)) {
                    this.updatePlayerInfo();
                    window.game.buildingManager.recalculateRates();
                }
            };
        }

        if (reincarnateBtn) {
            reincarnateBtn.onclick = () => {
                const buildingsData = window.game.buildingManager.exportData();
                const buildings = buildingsData.buildings || buildingsData;
                let totalLevel = 0;
                Object.values(buildings).forEach(b => {
                    if (b && typeof b === 'object' && 'level' in b) {
                        totalLevel += b.level;
                    }
                });

                const confirmMsg = `${LanguageManager.getInstance().t('大期已至，是否投入輪迴？')}\n${LanguageManager.getInstance().t('當前建築總數')}: ${totalLevel}\n${LanguageManager.getInstance().t('預計獲得道心')}: ${Math.floor(totalLevel / 10)}`;
                if (confirm(confirmMsg)) {
                    const result = PlayerManager.reincarnate(totalLevel);
                    alert(`${LanguageManager.getInstance().t('輪迴成功！獲得道心')} +${result.daoHeart}, ${LanguageManager.getInstance().t('獲得道證')} +${result.daoProof}`);
                    location.reload();
                }
            };
        }

        // 綁定輪迴按鈕事件
        const rebirthActionBtn = document.getElementById('rebirth-action-btn');
        if (rebirthActionBtn) {
            rebirthActionBtn.onclick = () => {
                const buildingsData = window.game.buildingManager.exportData();
                const buildings = buildingsData.buildings || buildingsData;
                let totalLevel = 0;
                Object.values(buildings).forEach(b => {
                    if (b && typeof b === 'object' && 'level' in b) {
                        totalLevel += b.level;
                    }
                });

                // 檢查是否有太虛輪迴境
                const voidMirror = buildings['void_mirror'];
                const hasVoidMirror = voidMirror && voidMirror.level > 0;

                if (hasVoidMirror) {
                    // 大道輪迴
                    const estHeart = Math.floor(totalLevel / 10);
                    const estProof = Math.floor(totalLevel / 30); // 大道輪迴道證更多（50 -> 30）

                    const confirmMsg = `${LanguageManager.getInstance().t('是否進行大道輪迴？')}\n${LanguageManager.getInstance().t('當前建築總數')}: ${totalLevel}\n${LanguageManager.getInstance().t('預計獲得道心')}: ${estHeart}\n${LanguageManager.getInstance().t('預計獲得道證')}: ${estProof}`;
                    if (confirm(confirmMsg)) {
                        const result = PlayerManager.advancedReincarnate(totalLevel);
                        alert(`${LanguageManager.getInstance().t('大道輪迴成功！')}\n${LanguageManager.getInstance().t('獲得道心')} +${result.daoHeart}\n${LanguageManager.getInstance().t('獲得道證')} +${result.daoProof}`);
                        location.reload();
                    }
                } else {
                    // 普通輪迴證道
                    const estHeart = Math.floor(totalLevel / 10);
                    const estProof = Math.floor(totalLevel / 50);

                    const confirmMsg = `${LanguageManager.getInstance().t('是否進行輪迴證道？')}\n${LanguageManager.getInstance().t('當前建築總數')}: ${totalLevel}\n${LanguageManager.getInstance().t('預計獲得道心')}: ${estHeart}\n${LanguageManager.getInstance().t('預計獲得道證')}: ${estProof}`;
                    if (confirm(confirmMsg)) {
                        const result = PlayerManager.reincarnate(totalLevel);
                        alert(`${LanguageManager.getInstance().t('輪迴成功！獲得道心')} +${result.daoHeart}\n${LanguageManager.getInstance().t('獲得道證')} +${result.daoProof}`);
                        location.reload();
                    }
                }
            };
        }
    }

    updateRebirthButton() {
        const rebirthBox = document.getElementById('rebirth-action-box');
        const rebirthBtn = document.getElementById('rebirth-action-btn');
        const reincarnateBox = document.getElementById('reincarnate-box');

        if (!rebirthBox || !rebirthBtn) return;

        // 檢查壽元是否已盡
        const isLifespanExhausted = reincarnateBox && reincarnateBox.style.display !== 'none';

        // 如果壽元已盡,隱藏提前輪迴按鈕
        if (isLifespanExhausted) {
            rebirthBox.style.display = 'none';
            return;
        }

        const buildingsData = window.game.buildingManager.exportData();
        const buildings = buildingsData.buildings || buildingsData; // 相容兩種格式
        const rebirthLotus = buildings['rebirth_lotus'];
        const voidMirror = buildings['void_mirror'];

        // 檢查是否有往生蓮臺或太虛輪迴境
        const hasRebirthLotus = rebirthLotus && rebirthLotus.level > 0;
        const hasVoidMirror = voidMirror && voidMirror.level > 0;

        if (hasVoidMirror) {
            // 顯示大道輪迴按鈕
            rebirthBox.style.display = '';
            rebirthBtn.textContent = '🪞 大道輪迴';
            rebirthBtn.style.background = '#7b1fa2'; // 深紫色
        } else if (hasRebirthLotus) {
            // 顯示輪迴證道按鈕
            rebirthBox.style.display = '';
            rebirthBtn.textContent = '🪷 輪迴證道';
            rebirthBtn.style.background = '#9c27b0'; // 紫色
        } else {
            // 隱藏按鈕
            rebirthBox.style.display = 'none';
        }
    }

    update() {
        if (this.resourcePanel) this.resourcePanel.update();
        this.updatePlayerStatus();
    }

    /**
     * 初始化資源摺疊功能
     */
    initResourceToggle() {
        const toggleBtn = document.getElementById('toggle-resources');
        const container = document.getElementById('resources-container');

        if (!toggleBtn || !container) return;

        const icon = toggleBtn.querySelector('.toggle-icon');

        // 綁定點擊事件
        toggleBtn.addEventListener('click', () => {
            container.classList.toggle('collapsed');
            icon.classList.toggle('collapsed');

            // 保存狀態到 localStorage
            localStorage.setItem('resourcesCollapsed', container.classList.contains('collapsed'));
        });

        // 恢復上次的摺疊狀態
        const isCollapsed = localStorage.getItem('resourcesCollapsed') === 'true';
        if (isCollapsed) {
            container.classList.add('collapsed');
            icon.classList.add('collapsed');
        }

        // 定期檢查是否需要顯示摺疊按鈕
        this.checkToggleButtonVisibility();
        setInterval(() => this.checkToggleButtonVisibility(), 2000);
    }

    /**
     * 檢查是否需要顯示摺疊按鈕
     */
    checkToggleButtonVisibility() {
        const toggleBtn = document.getElementById('toggle-resources');
        const container = document.getElementById('resources-container');

        if (!toggleBtn || !container) return;

        const resourceCount = container.querySelectorAll('.resource-item').length;

        // 資源超過 10 個時顯示摺疊按鈕
        if (resourceCount > 10) {
            toggleBtn.style.display = 'block';
        } else {
            toggleBtn.style.display = 'none';
        }
    }

    initLanguageSwitcher() {
        // 如果已經存在切換器則不重複創建
        if (document.getElementById('language-switcher')) return;

        const controls = document.querySelector('.game-controls');
        if (!controls) return;

        const container = document.createElement('div');
        container.id = 'language-switcher';
        container.style.display = 'inline-block';
        container.style.marginLeft = '10px';
        container.style.verticalAlign = 'middle';

        const select = document.createElement('select');
        select.style.padding = '5px 10px';
        select.style.backgroundColor = '#333';
        select.style.color = '#fff';
        select.style.border = '1px solid #555';
        select.style.borderRadius = '4px';
        select.style.fontSize = '13px';
        select.style.cursor = 'pointer';

        const options = [
            { value: 'zh-TW', text: '繁體中文' },
            { value: 'zh-CN', text: '简体中文' },
            { value: 'en', text: 'English' },
            { value: 'ja', text: '日本語' }
        ];

        const currentLang = LanguageManager.getInstance().getCurrentLang();

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            if (opt.value === currentLang) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        select.addEventListener('change', async (e) => {
            const lang = e.target.value;
            await LanguageManager.getInstance().loadLanguage(lang);
            // Reload page to apply changes fully
            location.reload();
        });

        container.appendChild(select);
        controls.appendChild(container);
    }
}
