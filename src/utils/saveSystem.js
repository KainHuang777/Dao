
export default class SaveSystem {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.storageKey = 'cultivation_game_save';
    }

    // 獲取當前遊戲數據物件
    getGameData() {
        return {
            timestamp: Date.now(),
            resources: this.game.resourceManager.exportData(),
            buildings: this.game.buildingManager.exportData()
            // future: skills
        };
    }

    // 生成 Base64 存檔代碼
    generateSaveCode() {
        const data = this.getGameData();
        const jsonString = JSON.stringify(data);
        // UTF-8 to Base64 (handle chinese characters)
        try {
            return btoa(unescape(encodeURIComponent(jsonString)));
        } catch (e) {
            console.error('Save encoding error', e);
            return '';
        }
    }

    // 解析存檔代碼
    parseSaveCode(code) {
        try {
            const jsonString = decodeURIComponent(escape(atob(code)));
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('Save decoding error', e);
            return null;
        }
    }

    // 保存到 LocalStorage (自動存檔用)
    saveToStorage() {
        const data = this.getGameData();
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        console.log('Auto saved');
    }

    // 從 LocalStorage 讀取
    loadFromStorage() {
        const json = localStorage.getItem(this.storageKey);
        if (json) {
            try {
                return JSON.parse(json);
            } catch (e) {
                console.error('Storage load error', e);
            }
        }
        return null;
    }
}
