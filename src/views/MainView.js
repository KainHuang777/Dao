import ResourcePanel from '../components/ResourcePanel.js';
import BuildingPanel from '../components/BuildingPanel.js';
import CraftingPanel from '../components/CraftingPanel.js';
import SkillPanel from '../components/SkillPanel.js';
import TalentPanel from '../components/TalentPanel.js';
import HelpPanel from '../components/HelpPanel.js';
import DebugPanel from '../components/DebugPanel.js';
import SectPanel from '../components/SectPanel.js';
import TabSystem from '../components/TabSystem.js';
import PlayerManager from '../utils/PlayerManager.js';
import EraManager from '../utils/EraManager.js';
import SectManager from '../utils/SectManager.js';
import LanguageManager from '../utils/LanguageManager.js';
import { ReleaseNotes } from '../data/ReleaseNotes.js';

export default class UIManager {
    constructor(game) {
        this.game = game;
        this.resourcePanel = new ResourcePanel(game.resourceManager);
        this.buildingPanel = new BuildingPanel(game.buildingManager, game.resourceManager);
        this.craftingPanel = new CraftingPanel(game.resourceManager, game.buildingManager);
        this.skillPanel = new SkillPanel();
        this.talentPanel = new TalentPanel();
        this.helpPanel = new HelpPanel();
        this.debugPanel = new DebugPanel();
        this.sectPanel = new SectPanel();
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

        // Version modal elements
        this.versionBtn = document.getElementById('version-btn');
        this.versionModal = document.getElementById('version-modal');
        this.closeVersionModalBtn = document.getElementById('close-version-modal');
        this.versionContent = document.getElementById('version-content');
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
        this.helpPanel.init();
        this.debugPanel.init();

        if (this.sectPanel) {
            this.sectPanel.init();
        } else {
            console.warn('SectPanel missing, re-initializing...');
            this.sectPanel = new SectPanel();
            this.sectPanel.init();
        }

        this.tabSystem.init();

        // 註冊分頁刷新回調
        this.tabSystem.registerCallback('debug', () => {
            this.debugPanel.refresh();
        });
        this.tabSystem.registerCallback('crafting', () => {
            this.craftingPanel.refresh();
        });
        this.tabSystem.registerCallback('buildings', () => this.buildingPanel.update());
        this.tabSystem.registerCallback('sect', () => this.sectPanel.update());
        this.tabSystem.registerCallback('opportunities', () => this.sectPanel.update());

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
        // 右側日誌標題
        const logHeader = document.querySelector('#log-header');
        if (logHeader) {
            // Check if filter exists
            if (!logHeader.querySelector('.log-filter-container')) {
                const titleText = lang.t('修仙日誌');
                logHeader.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">${titleText}</h3>
                        <div class="log-filter-container" style="display: flex; gap: 5px; font-size: 0.8em;">
                             <span class="log-filter-btn active" data-filter="ALL" style="cursor: pointer; padding: 2px 5px; background: #555; border-radius: 3px;">ALL</span>
                             <span class="log-filter-btn" data-filter="INFO" style="cursor: pointer; padding: 2px 5px; color: #888;">INFO</span>
                             <span class="log-filter-btn" data-filter="SYSTEM" style="cursor: pointer; padding: 2px 5px; color: #888;">SYS</span>
                             <span class="log-filter-btn" data-filter="DEV" style="cursor: pointer; padding: 2px 5px; color: #888;">DEV</span>
                        </div>
                    </div>
                `;

                // Bind click events
                const btns = logHeader.querySelectorAll('.log-filter-btn');
                btns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        // Update UI
                        btns.forEach(b => {
                            b.classList.remove('active');
                            b.style.background = 'transparent';
                            b.style.color = '#888';
                        });
                        btn.classList.add('active');
                        btn.style.background = '#555';
                        btn.style.color = '#fff';

                        // Apply filter
                        this.filterLogs(btn.dataset.filter);
                    });
                });
            } else {
                // Update title text only
                const h3 = logHeader.querySelector('h3');
                if (h3) h3.textContent = lang.t('修仙日誌');
            }
        }

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

        // 初始化版本號顯示 (新增)
        if (ReleaseNotes && ReleaseNotes.length > 0) {
            const latestVer = ReleaseNotes[0].version;
            const currentVerId = document.getElementById('current-version-id');
            if (currentVerId) currentVerId.textContent = latestVer;
            if (this.versionBtn) this.versionBtn.textContent = latestVer;
        }
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
                'sect': '宗門',
                'opportunities': '機緣',
                'help': '遊戲說明',
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
            li.dataset.type = 'SYSTEM';
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
                    if (data.player) PlayerManager.loadData(data.player);
                    this.game.resourceManager.loadData(data.resources);
                    if (data.buildings) this.game.buildingManager.loadData(data.buildings);

                    this.saveModal.classList.add('hidden');
                    alert('讀取成功！');
                    // 重新加載介面
                    window.location.reload();
                } else {
                    alert('存檔代碼無效！');
                }
            });
        }
        window.addEventListener('click', (e) => {
            if (e.target === this.saveModal) {
                this.saveModal.classList.add('hidden');
            }
            if (e.target === this.versionModal) {
                this.versionModal.classList.add('hidden');
            }
        });

        if (this.versionBtn) {
            this.versionBtn.addEventListener('click', () => this.openVersionModal());
        }
        if (this.closeVersionModalBtn) {
            this.closeVersionModalBtn.addEventListener('click', () => this.versionModal.classList.add('hidden'));
        }
    }

    openVersionModal() {
        if (!this.versionModal || !this.versionContent) return;
        this.versionModal.classList.remove('hidden');

        // Render Release Notes
        let html = '';
        const currentLang = LanguageManager.getInstance().getCurrentLang();

        ReleaseNotes.forEach((ver, index) => {
            html += `<div style="margin-bottom: 25px; ${index !== 0 ? 'border-top: 1px solid #333; padding-top: 15px;' : ''}">`;
            html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="color: #4fc3f7; font-size: 1.1em; font-weight: bold;">${ver.version}</span>
                        <span style="color: #666; font-size: 0.85em;">${ver.date}</span>
                    </div>`;
            html += '<ul style="padding-left: 20px; margin: 0;">';

            // 獲取對應語言的筆記，如果沒有則回退到 zh-TW
            let notes = ver.notes[currentLang] || ver.notes['zh-TW'] || ver.notes['zh-CN'];

            // 如果 notes 仍然是 undefined (資料結構不符)，嘗試直接使用 ver.notes (如果還是陣列)
            if (!notes && Array.isArray(ver.notes)) {
                notes = ver.notes;
            }

            if (notes && Array.isArray(notes)) {
                notes.forEach(note => {
                    html += `<li style="margin-bottom: 8px;">${note}</li>`;
                });
            } else {
                html += `<li style="margin-bottom: 8px; color: #888;">(No notes available for this language)</li>`;
            }
            html += '</ul></div>';
        });

        this.versionContent.innerHTML = html;

        const latestVer = ReleaseNotes[0].version;
        const verId = document.getElementById('current-version-id');
        if (verId) verId.textContent = latestVer;
        if (this.versionBtn) this.versionBtn.textContent = latestVer;
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
            upgradeTooltip = `${LanguageManager.getInstance().t('渡劫成功率')}: ${(tribulationRate * 100).toFixed(1)}%\n${upgradeCheck.reason}`;
        }

        // 渡劫成功率顏色
        let tribulationColor = '#fff'; // 白色 (90%+)
        if (tribulationRate < 0.9) tribulationColor = '#2196f3'; // 藍色 (70-90%)
        if (tribulationRate < 0.7) tribulationColor = '#4caf50'; // 綠色 (50-70%)
        if (tribulationRate <= 0.5) tribulationColor = '#f44336'; // 紅色 (50%或以下)

        // 渡劫成功率顯示（僅在需要渡劫時顯示）
        const tribulationDisplay = needsTribulation
            ? `<div class="player-info-line" style="font-size: 0.85em; margin-bottom: 8px;">
                   <span id="tribulation-success-rate" style="color: ${tribulationColor}; font-weight: bold;">${LanguageManager.getInstance().t('渡劫成功率')}: ${(tribulationRate * 100).toFixed(1)}%</span>
               </div>`
            : '';

        // 構建等級提升按鈕的 tooltip：顯示資源需求
        const lang = LanguageManager.getInstance();
        let levelUpTooltip = levelUpCheck.reason;

        // 獲取資源需求清單
        const resourceCosts = EraManager.getLevelUpResourceCost(eraId, level);
        const talentReduction = PlayerManager.getTalentBonus('five_elements_root');
        const costLines = [];

        Object.entries(resourceCosts).forEach(([resId, baseAmount]) => {
            const amount = Math.floor(baseAmount * (1 - talentReduction));
            const res = currentResources[resId];
            const currentVal = (res && typeof res === 'object') ? Math.floor(res.value || 0) : 0;
            const resName = lang.t(EraManager._getResName(resId));
            const isMet = currentVal >= amount;
            costLines.push(`${resName}: ${currentVal}/${amount} ${isMet ? '✓' : '✗'}`);
        });

        // LV9 特殊物品
        if (level === 9 && era && era.lv9Item) {
            const lv9Type = era.lv9Item.type;
            const lv9Amount = Math.floor(era.lv9Item.amount * (1 - talentReduction));
            const res = currentResources[lv9Type];
            const currentVal = (res && typeof res === 'object') ? Math.floor(res.value || 0) : 0;
            const resName = lang.t(EraManager._getResName(lv9Type));
            const isMet = currentVal >= lv9Amount;
            costLines.push(`${resName}: ${currentVal}/${lv9Amount} ${isMet ? '✓' : '✗'}`);
        }

        if (costLines.length > 0) {
            levelUpTooltip = `${lang.t('升級消耗')}:\n${costLines.join('\n')}`;
            if (!levelUpCheck.canLevelUp) {
                // 如果是資源不足以外的原因（如技能），則加上
                if (Object.keys(levelUpCheck.missingResources || {}).length === 0 && levelUpCheck.reason && !levelUpCheck.reason.includes('時間')) {
                    levelUpTooltip += `\n\n${levelUpCheck.reason}`;
                }
            }
        }

        // 計算修煉進度條
        const trainingTime = PlayerManager.getTrainingTime();
        const requiredTime = levelUpCheck.requiredTime || 0;
        const trainingProgress = requiredTime > 0 ? Math.min(1, trainingTime / requiredTime) : 0;
        const progressPercent = (trainingProgress * 100).toFixed(1);
        const progressBarColor = trainingProgress >= 1 ? '#4caf50' : '#2196f3';

        this.playerInfoDiv.innerHTML = `
            ${tribulationDisplay}
            <div class="player-info-line">
                <span>${LanguageManager.getInstance().t('境界')}: <b style="color:var(--gold-color)">${era ? LanguageManager.getInstance().t(era.eraName) : '...'}</b> <span style="font-size:0.8em; color:#aaa;">(Era ${eraId})</span></span>
                <button id="upgrade-btn" class="mini-btn ${upgradeCheck.canUpgrade ? 'btn-active' : 'btn-disabled'}">${LanguageManager.getInstance().t(upgradeButtonText.replace('⚡ ', '').replace('✨ ', ''))}</button>
            </div>
            <div class="player-info-line">
                <span>${LanguageManager.getInstance().t('等級')}: <b style="color:#fff">${level}</b></span>
                <button id="level-up-btn" class="mini-btn ${levelUpCheck.canLevelUp ? 'btn-active' : 'btn-disabled'}">📈 ${LanguageManager.getInstance().t('提升')}</button>
            </div>
            <!-- 修煉進度條 -->
            <div id="training-progress-container" style="width: 75%; margin: 5px 0 8px 0;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75em; color: #aaa; margin-bottom: 2px;">
                    <span>${lang.t('修練進度')}</span>
                    <span id="training-progress-percent">${progressPercent}%</span>
                </div>
                <div style="background: rgba(255,255,255,0.1); border-radius: 3px; height: 8px; overflow: hidden;">
                    <div id="training-progress-bar" style="width: ${progressPercent}%; height: 100%; background: ${progressBarColor}; transition: width 0.3s ease;"></div>
                </div>
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
     * @param {string} type - 日誌類型 'DEV' | 'INFO' | 'SYSTEM'
     */
    addLog(message, type = 'INFO') {
        const lang = LanguageManager.getInstance();
        const yearUnit = lang.t('祀');
        const currentYear = PlayerManager.getLifespan().toFixed(1);
        const formattedMessage = `<span style="color:#aaa">[${currentYear} ${yearUnit}]</span> ${message}`;

        // 添加到右側日誌頁面
        const logList = document.getElementById('log-list');
        const logContainer = document.getElementById('log-list-container');

        if (logList) {
            const li = document.createElement('li');
            li.innerHTML = formattedMessage;
            li.dataset.type = type;

            // Apply current filter visibility
            const activeFilter = document.querySelector('.log-filter-btn.active');
            if (activeFilter) {
                const filterType = activeFilter.dataset.filter;
                if (filterType !== 'ALL' && filterType !== type) {
                    li.style.display = 'none';
                }
            }

            // 保持最新在最上
            if (logList.firstChild) {
                logList.insertBefore(li, logList.firstChild);
            } else {
                logList.appendChild(li);
            }

            // 限制數量
            while (logList.children.length > 200) {
                logList.removeChild(logList.lastChild);
            }

            // 確保容器滾動到頂部
            if (logContainer) {
                logContainer.scrollTop = 0;
            }
        }
    }

    filterLogs(type) {
        const logList = document.getElementById('log-list');
        if (!logList) return;

        const logs = logList.children;
        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            if (type === 'ALL' || log.dataset.type === type) {
                log.style.display = '';
            } else {
                log.style.display = 'none';
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

        // 宗門任務提示 [宗]
        const surgeContainer = document.getElementById('spirit-surge-info');
        if (surgeContainer) {
            let sectNotify = document.getElementById('sect-notify-badge');
            if (!sectNotify) {
                sectNotify = document.createElement('span');
                sectNotify.id = 'sect-notify-badge';
                sectNotify.style = 'color: #ffd700; margin-left: 10px; font-weight: bold; cursor: pointer;';
                sectNotify.textContent = '[宗]';
                sectNotify.onclick = () => {
                    if (this.tabSystem) this.tabSystem.switchTab('sect');
                };
                surgeContainer.appendChild(sectNotify);
            }

            // Check visibility
            const hasTasks = SectManager.hasAvailableTasks && SectManager.hasAvailableTasks();
            const activeTask = SectManager.state.activeTask;
            const activeEvent = SectManager.state.activeEvent;

            let notifyText = '';
            // 宗門任務提示：有可用任務且目前沒在做任務
            if (hasTasks && !activeTask) {
                notifyText += '[宗]';
            }
            // 天機事件提示：有活動進行中
            if (activeEvent) {
                notifyText += '[天]';
            }

            if (notifyText) {
                sectNotify.textContent = notifyText;
                sectNotify.style.display = 'inline';
            } else {
                sectNotify.style.display = 'none';
            }
        }

        // 更新渡劫成功率顯示（金丹期及以後）
        const eraId = PlayerManager.getEraId();
        const needsTribulation = eraId >= 3;
        if (needsTribulation) {
            const tribulationRate = PlayerManager.getTribulationSuccessRate();

            // 更新渡劫成功率文字
            const tribulationSpan = document.getElementById('tribulation-success-rate');
            if (tribulationSpan) {
                // 更新顏色
                let tribulationColor = '#fff'; // 白色 (90%+)
                if (tribulationRate < 0.9) tribulationColor = '#2196f3'; // 藍色 (70-90%)
                if (tribulationRate < 0.7) tribulationColor = '#4caf50'; // 綠色 (50-70%)
                if (tribulationRate <= 0.5) tribulationColor = '#f44336'; // 紅色 (50%或以下)

                tribulationSpan.style.color = tribulationColor;
                tribulationSpan.textContent = `${LanguageManager.getInstance().t('渡劫成功率')}: ${(tribulationRate * 100).toFixed(1)}%`;
            }

        }

        const upBtn = document.getElementById('upgrade-btn');
        if (upBtn) {
            const check = PlayerManager.canUpgrade(currentResources);
            upBtn.className = `mini-btn ${check.canUpgrade ? 'btn-active' : 'btn-disabled'}`;
        }

        const lvlBtn = document.getElementById('level-up-btn');
        if (lvlBtn) {
            const check = PlayerManager.canLevelUp(currentResources);
            lvlBtn.className = `mini-btn ${check.canLevelUp ? 'btn-active' : 'btn-disabled'}`;

            // 更新進度條與百分比 (動態刷新)
            const progressBar = document.getElementById('training-progress-bar');
            const progressPercent = document.getElementById('training-progress-percent');
            if (progressBar && progressPercent) {
                const trainingTime = PlayerManager.getTrainingTime();
                const requiredTime = check.requiredTime || 0;
                const ratio = requiredTime > 0 ? Math.min(1, trainingTime / requiredTime) : 0;
                const percent = (ratio * 100).toFixed(1);

                progressBar.style.width = `${percent}%`;
                progressBar.style.background = ratio >= 1 ? '#4caf50' : '#2196f3';
                progressPercent.textContent = `${percent}%`;
            }

            // 僅在資源狀態改變時更新 tooltip，且排除時間倒數以防止閃動
            // 這裡我們簡單處理：如果本來就在顯示 tooltip，且內容沒變，就不重新賦值
            // 由於我們在 updatePlayerInfo 已經建構了 levelUpTooltip (排除時間)，
            // 這裡如果只是狀態檢查，我們可以選擇不更新 title，或者只更新資源部分。
            // 為了簡化，既然主要解決閃爍(時間)問題，我們在 updatePlayerStatus 就不再頻繁更新 title 的時間部分。
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
        // Make sure to handle older saves where hints might not have displayedEraHints
        const lang = LanguageManager.getInstance();
        const hints = PlayerManager.getHints();
        const shownEraHints = hints.shownEraHints || [];

        // 0. 升階後立即顯示境界提示
        if (!shownEraHints.includes(eraId)) {
            const eraHints = {
                1: 'hint_era_1',
                2: 'hint_era_2',
                3: 'hint_era_3',
                4: 'hint_era_4'
            };

            const hintKey = eraHints[eraId];
            if (hintKey) {
                this.addLog(`<span style="color:#00bcd4">${lang.t(hintKey)}</span>`, 'SYSTEM');
            }

            // 無論有無提示文本，都標記為已顯示，避免重複檢查
            const newShownList = [...shownEraHints, eraId];
            PlayerManager.updateHints({ shownEraHints: newShownList });

            // 更新本地 hints 變量以供後續邏輯使用
            hints.shownEraHints = newShownList;
        }

        // 提示 1：金丹期及以前 (Era <= 3)，壽元達到 1/3
        if (eraId <= 3 && ratio >= 1 / 3 && !hints.rule1Triggered) {
            this.addLog(`<span style="color:#ffa726">${lang.t('hint_lifespan_warning')}</span>`, 'SYSTEM');
            PlayerManager.updateHints({ rule1Triggered: true });
        }

        // 提示 2：元嬰期及以後 (Era >= 4)，壽元剩餘不到一半（比率過半），每 60 年提醒一次
        if (eraId >= 4 && ratio >= 0.5) {
            const currentYearFloor = Math.floor(current);
            const interval = Math.floor(currentYearFloor / 60);
            const lastInterval = Math.floor(hints.lastRule2Year / 60);

            if (interval > lastInterval) {
                // 如果是 Era 4，優先使用 hint_era_4 (User Request)
                const periodicKey = (eraId === 4) ? 'hint_era_4' : 'hint_reincarnation_periodic';
                this.addLog(`<span style="color:#ffa726">${lang.t(periodicKey)}</span>`, 'SYSTEM');
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
                const check = PlayerManager.canUpgrade(currentResources);

                if (!check.canUpgrade) {
                    // 無法升階：顯示 SYSTEM 級別 LOG
                    const msg = `<span style="color:#ff9800">⚠️ ${LanguageManager.getInstance().t('無法升階')}: ${check.reason}</span>`;
                    this.addLog(msg, 'SYSTEM');
                    return;
                }

                PlayerManager.upgrade(currentResources);
                // 無論成功失敗（如渡劫失敗導致掉級），都需要更新 UI
                this.updatePlayerInfo();
                window.game.buildingManager.recalculateRates();
            };
        }

        if (levelUpBtn) {
            levelUpBtn.onclick = () => {
                const currentResources = this.game.resourceManager.getUnlockedResources();
                const check = PlayerManager.canLevelUp(currentResources);

                if (!check.canLevelUp) {
                    // 無法提升等級：顯示 SYSTEM 級別 LOG
                    const msg = `<span style="color:#ff9800">⚠️ ${LanguageManager.getInstance().t('無法提升等級')}: ${check.reason}</span>`;
                    this.addLog(msg, 'SYSTEM');
                    return;
                }

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
        this.checkTabUnlocks();
    }

    checkTabUnlocks() {
        const eraId = PlayerManager.getEraId();
        const sectLevel = SectManager.getSectLevel();

        // 宗門分頁: 築基期 (Era 2) 解鎖
        const sectBtn = document.querySelector('.tab-btn[data-tab="sect"]');
        if (sectBtn) {
            if (eraId >= 2) {
                if (sectBtn.style.display === 'none') sectBtn.style.display = '';
            } else {
                if (sectBtn.style.display !== 'none') sectBtn.style.display = 'none';
            }
        }

        // 機緣分頁: 宗門等級 2 解鎖
        const oppBtn = document.querySelector('.tab-btn[data-tab="opportunities"]');
        if (oppBtn) {
            if (sectLevel >= 2) {
                if (oppBtn.style.display === 'none') oppBtn.style.display = '';
            } else {
                if (oppBtn.style.display !== 'none') oppBtn.style.display = 'none';
            }
        }
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

    /**
     * 偵測瀏覽器語系
     * @returns {string} 語系代碼
     */
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;

        // 映射瀏覽器語系到遊戲支援的語系
        if (browserLang.startsWith('zh')) {
            if (browserLang.includes('CN') || browserLang.includes('Hans')) {
                return 'zh-CN';
            }
            return 'zh-TW'; // 預設繁體
        } else if (browserLang.startsWith('ja')) {
            return 'ja';
        } else if (browserLang.startsWith('en')) {
            return 'en';
        }

        return 'zh-TW'; // 預設繁體中文
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

        const currentLang = LanguageManager.getInstance().getCurrentLang();
        const detectedLang = this.detectBrowserLanguage();

        // 語系代碼顯示（在按鈕上方）
        const detectedLabel = document.createElement('div');
        detectedLabel.style.fontSize = '11px';
        detectedLabel.style.color = detectedLang !== currentLang ? '#ffd700' : '#888';
        detectedLabel.style.marginBottom = '3px';
        detectedLabel.style.textAlign = 'center';
        detectedLabel.textContent = `Browser: ${detectedLang}`;
        detectedLabel.style.fontWeight = detectedLang !== currentLang ? 'bold' : 'normal';
        container.appendChild(detectedLabel);

        // 按鈕容器
        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '4px';
        btnGroup.style.alignItems = 'center';

        const languages = [
            { value: 'en', label: 'EN' },
            { value: 'zh-TW', label: 'TC' },
            { value: 'zh-CN', label: 'SC' },
            { value: 'ja', label: 'JP' }
        ];

        languages.forEach(lang => {
            const btn = document.createElement('button');
            btn.textContent = lang.label;
            btn.style.padding = '4px 8px';
            btn.style.fontSize = '12px';
            btn.style.border = '1px solid #555';
            btn.style.borderRadius = '3px';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.2s';
            btn.style.fontWeight = '500';

            // 選中狀態樣式（類似輪迴天賦的反白樣式）
            if (lang.value === currentLang) {
                btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                btn.style.color = '#fff';
                btn.style.borderColor = '#764ba2';
                btn.style.boxShadow = '0 0 8px rgba(118, 75, 162, 0.6)';
            } else {
                btn.style.background = '#2a2a2a';
                btn.style.color = '#aaa';
                btn.style.borderColor = '#444';
            }

            // Hover 效果
            btn.addEventListener('mouseenter', () => {
                if (lang.value !== currentLang) {
                    btn.style.background = '#3a3a3a';
                    btn.style.color = '#fff';
                    btn.style.borderColor = '#666';
                }
            });

            btn.addEventListener('mouseleave', () => {
                if (lang.value !== currentLang) {
                    btn.style.background = '#2a2a2a';
                    btn.style.color = '#aaa';
                    btn.style.borderColor = '#444';
                }
            });

            btn.addEventListener('click', async () => {
                if (lang.value !== currentLang) {
                    await LanguageManager.getInstance().loadLanguage(lang.value);
                    location.reload();
                }
            });

            btnGroup.appendChild(btn);
        });

        container.appendChild(btnGroup);
        controls.appendChild(container);
    }
}
