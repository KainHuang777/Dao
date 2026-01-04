
export default class TabSystem {
    constructor() {
        this.tabs = document.querySelectorAll('.tab-btn');
        this.views = document.querySelectorAll('.tab-view');
        this.callbacks = {}; // 儲存分頁切換時的回調函數
    }

    init() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    }

    /**
     * 註冊分頁切換時的回調函數
     * @param {string} tabId - 分頁 ID
     * @param {Function} callback - 切換到該分頁時執行的回調函數
     */
    registerCallback(tabId, callback) {
        this.callbacks[tabId] = callback;
    }

    switchTab(tabId) {
        // Update Buttons
        this.tabs.forEach(tab => {
            if (tab.dataset.tab === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update Views
        this.views.forEach(view => {
            if (view.id === `view-${tabId}`) {
                view.classList.remove('hidden');
                view.classList.add('active');
            } else {
                view.classList.add('hidden');
                view.classList.remove('active');
            }
        });

        // 執行回調函數（如果有註冊）
        if (this.callbacks[tabId]) {
            this.callbacks[tabId]();
        }
    }
}
