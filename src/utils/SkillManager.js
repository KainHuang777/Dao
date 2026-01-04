import CSVLoader from './CSVLoader.js?v=2';
import LanguageManager from './LanguageManager.js';

class SkillManager {
    constructor() {
        this.skills = {};
        this.isLoaded = false;
    }

    /**
     * 初始化功法資料
     */
    async init() {
        if (this.isLoaded) return;

        console.log('Loading Skills...');
        const rawData = await CSVLoader.loadCSV('./src/data/skills.csv');
        this.skills = CSVLoader.convertToSkills(rawData);

        this.isLoaded = true;
        console.log('Skills Loaded:', Object.keys(this.skills).length);
    }

    /**
     * 獲取所有功法
     */
    getSkills() {
        return this.skills;
    }

    /**
     * 根據 ID 獲取功法
     */
    getSkill(skillId) {
        return this.skills[skillId] || null;
    }

    /**
     * 檢查是否滿足學習條件
     * @param {string} skillId - 功法 ID
     * @param {number} currentEraId - 當前時代 ID
     * @param {Array} learnedSkills - 已學習的功法 ID 陣列
     * @returns {Object} { canLearn: boolean, reason: string }
     */
    checkRequirements(skillId, currentEraId, learnedSkills = {}) {
        const skill = this.getSkill(skillId);
        if (!skill) return { canLearn: false, reason: LanguageManager.getInstance().t('找不到此功法') };

        // 檢查時代
        if (currentEraId < skill.requirements.era) {
            return { canLearn: false, reason: LanguageManager.getInstance().t('需要達到等級: {level}', { level: skill.requirements.era }) };
        }

        // 檢查前置功法
        const missingSkillNames = [];
        skill.requirements.skills.forEach(reqStr => {
            const parts = reqStr.split(':');
            const reqId = parts[0];
            const reqLevel = parts.length > 1 ? parseInt(parts[1]) : 1;
            const currentLevel = learnedSkills[reqId] || 0;

            if (currentLevel < reqLevel) {
                const s = this.getSkill(reqId);
                missingSkillNames.push(s ? s.name : reqId);
            }
        });

        if (missingSkillNames.length > 0) {
            return { canLearn: false, reason: LanguageManager.getInstance().t('需要前置功法: {skills}', { skills: missingSkillNames.join(', ') }) };
        }

        return { canLearn: true, reason: '' };
    }
}

export default new SkillManager();
