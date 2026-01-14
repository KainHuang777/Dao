/**
 * IRenderer.js - 渲染層抽象介面
 * 定義所有渲染器必須實現的方法
 */
export default class IRenderer {
    /**
     * 初始化渲染器
     * @param {HTMLElement} container - 渲染容器
     */
    init(container) {
        throw new Error('IRenderer.init() must be implemented');
    }

    /**
     * 每幀更新
     * @param {number} deltaTime - 時間增量
     */
    update(deltaTime) {
        throw new Error('IRenderer.update() must be implemented');
    }

    /**
     * 播放資源獲取特效
     * @param {string} resourceId - 資源 ID
     * @param {number} amount - 數量
     * @param {number} x - X 座標
     * @param {number} y - Y 座標
     */
    playResourceGainEffect(resourceId, amount, x, y) {
        // 預設空實作，HTML 渲染器可忽略
    }

    /**
     * 播放升級/突破特效
     * @param {string} type - 特效類型 ('levelUp', 'breakthrough', 'tribulation')
     */
    playUpgradeEffect(type) {
        // 預設空實作
    }

    /**
     * 更新靈力潮汐視覺效果
     * @param {object} surgeData - 潮汐數據 { name, bonus }
     */
    updateSpiritSurge(surgeData) {
        // 預設空實作
    }

    /**
     * 銷毀渲染器，釋放資源
     */
    destroy() {
        // 預設空實作
    }
}
