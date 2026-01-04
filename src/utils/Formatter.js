import LanguageManager from './LanguageManager.js';

export default class Formatter {
    /**
     * 格式化數字 (K, M, B, T, P, E, Z, Y)
     * K = 千 (10^3)
     * M = 百萬 (10^6)
     * B = 十億 (10^9)
     * T = 兆 (10^12)
     * P = 千兆 (10^15)
     * E = 百京 (10^18)
     * Z = 十垓 (10^21)
     * Y = 秭 (10^24)
     * @param {number} value - 原始數字
     * @returns {string} 格式化後的字串
     */
    static formatBigNumber(value) {
        if (value === null || value === undefined) return '0.0';
        const num = Number(value);
        if (isNaN(num)) return '0.0';

        const units = [
            { threshold: 1e24, divisor: 1e24, suffix: 'Y' }, // 秭
            { threshold: 1e21, divisor: 1e21, suffix: 'Z' }, // 十垓
            { threshold: 1e18, divisor: 1e18, suffix: 'E' }, // 百京
            { threshold: 1e15, divisor: 1e15, suffix: 'P' }, // 千兆
            { threshold: 1e12, divisor: 1e12, suffix: 'T' }, // 兆
            { threshold: 1e9, divisor: 1e9, suffix: 'B' }, // 十億
            { threshold: 1e7, divisor: 1e6, suffix: 'M' }, // 百萬 (10M+)
            { threshold: 1e4, divisor: 1e3, suffix: 'K' }  // 千 (10K+)
        ];

        for (const unit of units) {
            if (num >= unit.threshold) {
                const result = num / unit.divisor;
                return result.toFixed(1) + unit.suffix;
            }
        }

        // 小於 10000 的數字顯示一位小數點
        return num.toFixed(1);
    }

    /**
     * 格式化產出率
     */
    static formatRate(value) {
        const num = Number(value);
        if (num === 0) return '0';
        const formatted = this.formatBigNumber(Math.abs(num));
        return (num > 0 ? '+' : '-') + formatted;
    }

    /**
     * 格式化時間 (秒 -> 時:分:秒)
     * @param {number} seconds
     * @returns {string}
     */
    static formatTime(seconds) {
        const sUnit = LanguageManager.getInstance().t('秒');
        const mUnit = LanguageManager.getInstance().t('分');
        const hUnit = LanguageManager.getInstance().t('時');

        if (!seconds || seconds < 0) return `0${sUnit}`;
        if (seconds < 60) return `${Math.ceil(seconds)}${sUnit}`;

        const m = Math.floor(seconds / 60);
        const s = Math.ceil(seconds % 60);
        if (m < 60) return `${m}${mUnit} ${s}${sUnit}`;

        const h = Math.floor(m / 60);
        const rm = m % 60;
        return `${h}${hUnit} ${rm}${mUnit}`; // 超過一小時不顯示秒
    }
}
