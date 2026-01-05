
import PlayerManager from './PlayerManager.js';

export default class SaveSystem {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.storageKey = 'cultivation_game_save';
    }

    // 獲取當前遊戲數據物件
    getGameData() {
        if (!this.game || !this.game.resourceManager || !this.game.buildingManager) {
            console.error('SaveSystem: Managers not initialized in game instance');
            return null;
        }

        return {
            timestamp: Date.now(),
            player: PlayerManager ? PlayerManager.exportData() : null,
            resources: this.game.resourceManager.exportData(),
            buildings: this.game.buildingManager.exportData()
        };
    }

    // 生成 Base64 存檔代碼
    generateSaveCode() {
        console.log('SaveSystem: Starting generateSaveCode');
        try {
            const data = this.getGameData();
            if (!data) return '';

            console.log('SaveSystem: Game data exported');
            const jsonString = JSON.stringify(data);

            // UTF-8 to Base64 (Modern way)
            const utf8Bytes = new TextEncoder().encode(jsonString);
            let binary = '';
            const bytes = new Uint8Array(utf8Bytes);
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            console.log('SaveSystem: Base64 generated, length:', base64.length);
            return base64;
        } catch (e) {
            console.error('Save encoding error', e);
            return '';
        }
    }

    // 解析存檔代碼
    parseSaveCode(code) {
        try {
            const binary = atob(code);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const jsonString = new TextDecoder().decode(bytes);
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
