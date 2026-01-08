
import PlayerManager from '../utils/PlayerManager.js';
import EraManager from '../utils/EraManager.js';
import Formatter from '../utils/Formatter.js';
import { Buildings } from '../data/Buildings.js';

export default class DebugPanel {
    constructor() {
        this.container = document.getElementById('view-debug');
    }

    init() {
        this.render();
    }

    /**
     * 刷新 Debug 面板資訊（當切換到此分頁時調用）
     */
    refresh() {
        this.updateRebirthInfo();
        this.updateMaxBuildingInfo();
        this.updateLevelInfo();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const debugBox = document.createElement('div');
        debugBox.className = 'debug-panel';
        debugBox.style = 'padding: 20px;';

        debugBox.innerHTML = `
            <div style="background: rgba(255, 152, 0, 0.1); border: 2px solid #ff9800; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #ff9800; margin-top: 0;">⚠️ Debug 工具面板</h2>
                <p style="color: #ccc; font-size: 0.9em;">此面板僅供開發測試使用，請謹慎操作！</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <!-- 輪迴證道 -->
                <div class="debug-card">
                    <h3 style="color: #e67e22;">輪迴證道</h3>
                    <p style="color: #aaa; font-size: 0.9em;">直接執行輪迴證道，根據當前建築總等級獲得道心與道證。</p>
                    <div id="rebirth-info" style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.9em;">
                        <div>建築總等級: <span id="total-building-level">0</span></div>
                        <div>預計道心: <span id="estimated-heart">0</span></div>
                        <div>預計道證: <span id="estimated-proof">0</span></div>
                    </div>
                    <button id="debug-reincarnate-btn" class="btn" style="width: 100%; background: #e67e22;">
                        執行輪迴證道
                    </button>
                </div>

                <!-- 建築全滿 -->
                <div class="debug-card">
                    <h3 style="color: #4caf50;">建築全滿</h3>
                    <p style="color: #aaa; font-size: 0.9em;">將所有當前時期可建造的建築升級至最大等級上限。</p>
                    <div id="max-building-info" style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.9em;">
                        <div>當前時期: <span id="current-era">練氣期</span></div>
                        <div>建築上限: <span id="building-cap">10</span></div>
                        <div>可升級建築: <span id="upgradeable-count">0</span></div>
                    </div>
                    <button id="debug-max-buildings-btn" class="btn" style="width: 100%; background: #4caf50;">
                        建築全滿
                    </button>
                </div>

                <!-- 時期等級全滿 -->
                <div class="debug-card">
                    <h3 style="color: #2196f3;">時期等級全滿</h3>
                    <p style="color: #aaa; font-size: 0.9em;">將當前時期的等級提升到滿級（10級）。</p>
                    <div id="level-info" style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.9em;">
                        <div>當前時期: <span id="level-current-era">練氣期</span></div>
                        <div>當前等級: <span id="current-level">1</span></div>
                        <div>最大等級: <span id="max-level">10</span></div>
                    </div>
                    <button id="debug-max-level-btn" class="btn" style="width: 100%; background: #2196f3;">
                        時期等級全滿
                    </button>
                </div>

                <!-- 重置進度 -->
                <div class="debug-card">
                    <h3 style="color: #f44336;">重置進度</h3>
                    <p style="color: #aaa; font-size: 0.9em;">完全重置遊戲進度，包括建築、資源、技能、天賦等所有數據。</p>
                    <div style="margin: 10px 0; padding: 10px; background: rgba(244, 67, 54, 0.2); border-radius: 4px; font-size: 0.9em; color: #f44336;">
                        ⚠️ 此操作不可逆，請謹慎使用！
                    </div>
                    <button id="debug-reset-btn" class="btn danger-btn" style="width: 100%;">
                        重置進度
                    </button>
                </div>

                <!-- 自動建築 (DEBUG) -->
                <div class="debug-card">
                    <h3 style="color: #9c27b0;">自動建築 (DEBUG)</h3>
                    <p style="color: #aaa; font-size: 0.9em;">啟用後每 30 秒自動升級一個資源充足的建築，不受時期限制。</p>
                    <div id="auto-build-status" style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.9em;">
                        <div>狀態: <span id="auto-build-state" style="color: #f44336;">已關閉</span></div>
                    </div>
                    <button id="debug-auto-build-btn" class="btn" style="width: 100%; background: #9c27b0;">
                        啟用自動建築
                    </button>
                </div>
            </div>
        `;

        this.container.appendChild(debugBox);

        // 更新資訊
        this.updateRebirthInfo();
        this.updateMaxBuildingInfo();

        // 綁定事件
        this.bindEvents();
    }

    updateRebirthInfo() {
        const buildingsData = window.game.buildingManager.exportData();
        const buildings = buildingsData.buildings || buildingsData;
        let totalLevel = 0;
        Object.values(buildings).forEach(b => {
            if (b && typeof b === 'object' && 'level' in b) {
                totalLevel += b.level;
            }
        });

        const estHeart = Math.floor(totalLevel / 10);
        const estProof = Math.floor(totalLevel / 50);

        const totalLevelEl = document.getElementById('total-building-level');
        const estHeartEl = document.getElementById('estimated-heart');
        const estProofEl = document.getElementById('estimated-proof');

        if (totalLevelEl) totalLevelEl.textContent = Formatter.formatBigNumber(totalLevel);
        if (estHeartEl) estHeartEl.textContent = Formatter.formatBigNumber(estHeart);
        if (estProofEl) estProofEl.textContent = Formatter.formatBigNumber(estProof);
    }

    updateMaxBuildingInfo() {
        const eraId = PlayerManager.getEraId();
        const era = EraManager.getEraById(eraId);
        const eraName = era?.eraName || '未知';

        const buildingCap = window.game.buildingManager.getBuildingLevelCap('hut');

        let upgradeableCount = 0;
        Object.keys(Buildings).forEach(id => {
            const def = Buildings[id];
            const building = window.game.buildingManager.getBuilding(id);

            // 檢查是否可以在當前時期建造
            if (def.era && def.era <= eraId) {
                upgradeableCount++;
            }
        });

        const currentEraEl = document.getElementById('current-era');
        const buildingCapEl = document.getElementById('building-cap');
        const upgradeableCountEl = document.getElementById('upgradeable-count');

        if (currentEraEl) currentEraEl.textContent = eraName;
        if (buildingCapEl) buildingCapEl.textContent = buildingCap;
        if (upgradeableCountEl) upgradeableCountEl.textContent = upgradeableCount;
    }

    updateLevelInfo() {
        const eraId = PlayerManager.getEraId();
        const era = EraManager.getEraById(eraId);
        const eraName = era?.eraName || '未知';
        const currentLevel = PlayerManager.getLevel();
        const maxLevel = 10; // 每個時期最大等級都是 10

        const levelCurrentEraEl = document.getElementById('level-current-era');
        const currentLevelEl = document.getElementById('current-level');
        const maxLevelEl = document.getElementById('max-level');

        if (levelCurrentEraEl) levelCurrentEraEl.textContent = eraName;
        if (currentLevelEl) currentLevelEl.textContent = currentLevel;
        if (maxLevelEl) maxLevelEl.textContent = maxLevel;
    }

    bindEvents() {
        // 輪迴證道按鈕
        const reincarnateBtn = document.getElementById('debug-reincarnate-btn');
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

                const estHeart = Math.floor(totalLevel / 10);
                const estProof = Math.floor(totalLevel / 50);

                if (confirm(`確定要執行輪迴證道嗎？\n\n建築總等級: ${totalLevel}\n預計獲得道心: ${estHeart}\n預計獲得道證: ${estProof}`)) {
                    const result = PlayerManager.reincarnate(totalLevel);
                    alert(`輪迴成功！\n獲得道心 +${result.daoHeart}\n獲得道證 +${result.daoProof}`);
                    location.reload();
                }
            };
        }

        // 建築全滿按鈕
        const maxBuildingsBtn = document.getElementById('debug-max-buildings-btn');
        if (maxBuildingsBtn) {
            maxBuildingsBtn.onclick = () => {
                if (confirm('確定要將所有建築升級至最大等級嗎？')) {
                    this.maxAllBuildings();
                }
            };
        }

        // 時期等級全滿按鈕
        const maxLevelBtn = document.getElementById('debug-max-level-btn');
        if (maxLevelBtn) {
            maxLevelBtn.onclick = () => {
                if (confirm('確定要將當前時期的等級提升到滿級（10級）嗎？')) {
                    this.maxLevel();
                }
            };
        }

        // 重置進度按鈕
        const resetBtn = document.getElementById('debug-reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                const confirmation = prompt('此操作將清除所有進度！\n請輸入 "RESET" 確認重置：');
                if (confirmation === 'RESET') {
                    PlayerManager.reset();
                    alert('進度已重置！');
                    location.reload();
                } else if (confirmation !== null) {
                    alert('輸入錯誤，取消重置。');
                }
            };
        }

        // 自動建築按鈕
        const autoBuildBtn = document.getElementById('debug-auto-build-btn');
        if (autoBuildBtn) {
            autoBuildBtn.onclick = () => {
                const newState = window.game.buildingManager.toggleDebugAutoBuild();
                this.updateAutoBuildStatus(newState);

                if (newState) {
                    alert('已啟用自動建築！每 30 秒將自動升級一個資源充足的建築。');
                } else {
                    alert('已關閉自動建築。');
                }
            };
        }
    }

    updateAutoBuildStatus(enabled) {
        const stateEl = document.getElementById('auto-build-state');
        const btn = document.getElementById('debug-auto-build-btn');

        if (stateEl) {
            stateEl.textContent = enabled ? '已啟用' : '已關閉';
            stateEl.style.color = enabled ? '#4caf50' : '#f44336';
        }
        if (btn) {
            btn.textContent = enabled ? '關閉自動建築' : '啟用自動建築';
            btn.style.background = enabled ? '#666' : '#9c27b0';
        }
    }

    maxAllBuildings() {
        const eraId = PlayerManager.getEraId();
        const buildingCap = window.game.buildingManager.getBuildingLevelCap('hut');
        let upgradedCount = 0;

        Object.keys(Buildings).forEach(id => {
            const def = Buildings[id];
            const building = window.game.buildingManager.getBuilding(id);

            // 檢查是否可以在當前時期建造
            // 如果沒有 era 屬性，表示是初始建築，也應該升級
            if (!def.era || def.era <= eraId) {
                // 使用建築自身的 maxLevel 和全局 buildingCap 中的較小值
                const targetLevel = Math.min(def.maxLevel || buildingCap, buildingCap);
                building.level = targetLevel;
                upgradedCount++;
            }
        });

        // 重新計算資源產出率
        window.game.buildingManager.recalculateRates();

        // 保存遊戲狀態
        if (window.game.saveSystem) {
            window.game.saveSystem.saveToStorage();
        }

        alert(`已將 ${upgradedCount} 個建築升級至 Lv.${buildingCap}！`);

        // 刷新頁面以更新 UI
        location.reload();
    }

    maxLevel() {
        const eraId = PlayerManager.getEraId();
        const era = EraManager.getEraById(eraId);
        const maxLevel = era?.maxLevel || 10;
        const currentLevel = PlayerManager.getLevel();

        if (currentLevel >= maxLevel) {
            alert('當前等級已經是滿級了！');
            return;
        }

        // 直接設置等級為滿級
        PlayerManager.state.level = maxLevel;

        // 額外：將修煉時間也設為「滿」，即將開始時間往前推
        // 這樣就不會顯示「還需 X 祀」
        const requiredTime = EraManager.getLevelUpRequiredTime(eraId, maxLevel - 1); // 這裡理論上應該是累計時間
        // 簡單起見，直接推 10 小時，絕對夠了
        PlayerManager.state.startTimestamp = Date.now() - (36000 * 1000);

        PlayerManager._saveState(PlayerManager.state);

        // 重要：保存到統一存檔
        if (window.game && window.game.saveSystem) {
            window.game.saveSystem.saveToStorage();
        }

        alert(`等級已提升至 Lv.${maxLevel}！`);

        // 刷新頁面以更新 UI
        location.reload();
    }
}
