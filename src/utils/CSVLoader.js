/**
 * CSV 載入與解析工具
 * 用於載入遊戲資料檔案（建築、資源等）
 */

export default class CSVLoader {
    /**
     * 載入並解析 CSV 檔案
     * @param {string} filePath - CSV 檔案路徑
     * @returns {Promise<Array>} 解析後的資料陣列
     */
    static async loadCSV(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`無法載入 CSV 檔案: ${filePath}`);
            }
            const text = await response.text();
            return this.parseCSV(text);
        } catch (error) {
            console.error('CSV 載入錯誤:', error);
            return [];
        }
    }

    /**
     * 解析 CSV 文字內容
     * @param {string} csvText - CSV 文字內容
     * @returns {Array} 解析後的物件陣列
     */
    static parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            console.warn('CSV 檔案內容不足');
            return [];
        }

        // 解析標題列
        const headers = this.parseCSVLine(lines[0]);

        // 解析資料列
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = this.convertValue(values[index]);
                });
                data.push(row);
            }
        }

        return data;
    }

    /**
     * 解析單行 CSV（處理逗號分隔）
     * @param {string} line - CSV 行
     * @returns {Array} 分割後的值陣列
     */
    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                // 處理轉義的雙引號 ""
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++; // 跳過下一個引號
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    /**
     * 轉換值的類型（字串 -> 數字/布林/null）
     * @param {string} value - 原始值
     * @returns {*} 轉換後的值
     */
    static convertValue(value) {
        // 空值或 "0" 字串處理
        if (value === '' || value === '0') {
            return 0;
        }

        // 布林值
        if (value === 'TRUE' || value === 'true') return true;
        if (value === 'FALSE' || value === 'false') return false;

        // 數字
        const num = Number(value);
        if (!isNaN(num)) return num;

        // 字串
        return value;
    }

    /**
     * 將 CSV 資料轉換為建築物件格式
     * @param {Array} csvData - CSV 解析後的資料
     * @returns {Object} 建築物件 { id: buildingData }
     */
    static convertToBuildings(csvData) {
        const buildings = {};

        csvData.forEach(row => {
            const building = {
                id: row.id,
                name: row.name,
                description: row.description,
                baseCost: this.extractCosts(row, 'basicCost', 4, 'advCost', 2),
                costFactor: row.costFactor,
                effects: this.extractEffects(row, 'effect', 2, 'advEffect', 3),
                effectWeight: row.effectWeight || 0,
                maxLevel: row.maxLevel
            };

            // 可選欄位
            if (row.era && row.era !== 0) {
                building.era = row.era;
            }
            if (row.prereqBuilding && row.prereqBuilding !== 0) {
                building.prereqBuilding = row.prereqBuilding;
            }
            if (row.prereqTech && row.prereqTech !== 0) {
                building.prereqTech = row.prereqTech;
            }

            buildings[row.id] = building;
        });

        return buildings;
    }

    /**
     * 提取成本資料（基礎 + 進階）
     * @param {Object} row - CSV 行資料
     * @param {string} basicPrefix - 基礎成本前綴
     * @param {number} basicCount - 基礎成本欄位數量
     * @param {string} advPrefix - 進階成本前綴
     * @param {number} advCount - 進階成本欄位數量
     * @returns {Object} 成本物件
     */
    static extractCosts(row, basicPrefix, basicCount, advPrefix, advCount) {
        const costs = {};

        // 提取基礎成本
        for (let i = 1; i <= basicCount; i++) {
            const typeKey = `${basicPrefix}${i}_type`;
            const amountKey = `${basicPrefix}${i}_amount`;

            if (row[typeKey] && row[typeKey] !== 0 && row[amountKey] > 0) {
                costs[row[typeKey]] = row[amountKey];
            }
        }

        // 提取進階成本
        for (let i = 1; i <= advCount; i++) {
            const typeKey = `${advPrefix}${i}_type`;
            const amountKey = `${advPrefix}${i}_amount`;

            if (row[typeKey] && row[typeKey] !== 0 && row[amountKey] > 0) {
                costs[row[typeKey]] = row[amountKey];
            }
        }

        return costs;
    }

    /**
     * 提取效果資料（基礎 + 進階）
     * @param {Object} row - CSV 行資料
     * @param {string} basicPrefix - 基礎效果前綴
     * @param {number} basicCount - 基礎效果欄位數量
     * @param {string} advPrefix - 進階效果前綴
     * @param {number} advCount - 進階效果欄位數量
     * @returns {Object} 效果物件
     */
    static extractEffects(row, basicPrefix, basicCount, advPrefix, advCount) {
        const effects = {};

        // 提取基礎效果
        for (let i = 1; i <= basicCount; i++) {
            const typeKey = `${basicPrefix}${i}_type`;
            const amountKey = `${basicPrefix}${i}_amount`;

            if (row[typeKey] && row[typeKey] !== 0 && row[amountKey] !== 0) {
                effects[row[typeKey]] = row[amountKey];
            }
        }

        // 提取進階效果
        for (let i = 1; i <= advCount; i++) {
            const typeKey = `${advPrefix}${i}_type`;
            const amountKey = `${advPrefix}${i}_amount`;

            if (row[typeKey] && row[typeKey] !== 0 && row[amountKey] !== 0) {
                effects[row[typeKey]] = row[amountKey];
            }
        }

        return effects;
    }

    /**
     * 將 CSV 資料轉換為時代物件格式
     * @param {Array} csvData - CSV 解析後的資料
     * @returns {Array} 時代陣列
     */
    static convertToEras(csvData) {
        return csvData.map(row => {
            const era = {
                eraId: Number(row.id),
                eraName: row.name,
                description: row.description,
                maxLevel: row.maxLevel,
                resourceMultiplier: row.resourceMultiplier,
                lifespan: row.lifespan || 0, // 新增壽元欄位
                upgradeRequirements: {
                    level: row.up_level,
                    skills: row.up_skills ? row.up_skills.split(',').map(s => s.trim()) : [],
                    capacity: this.parseCapacity(row.up_capacity)
                },
                levelUpRequirements: {
                    baseTime: row.lvl_baseTime,
                    timeMultiplier: row.lvl_timeMult,
                    skills: row.lvl_skills ? row.lvl_skills.split(',').map(s => s.trim()) : [],
                    resources: {}
                }
            };

            // 處理資源要求 (lvl_res1, lvl_res2)
            if (row.lvl_res1_type && row.lvl_res1_amount) {
                era.levelUpRequirements.resources[row.lvl_res1_type] = row.lvl_res1_amount;
            }
            if (row.lvl_res2_type && row.lvl_res2_amount) {
                era.levelUpRequirements.resources[row.lvl_res2_type] = row.lvl_res2_amount;
            }

            return era;
        });
    }

    /**
     * 解析容量要求字串 (格式: "lingli_max:500,stone_max:300")
     * @param {string} capStr - 容量要求字串
     * @returns {Object} 容量要求物件
     */
    static parseCapacity(capStr) {
        if (!capStr || capStr === '0' || capStr === 0) return {};
        const caps = {};
        const items = capStr.split(',');
        items.forEach(item => {
            const parts = item.split(':');
            if (parts.length === 2) {
                let key = parts[0].trim();
                const val = Number(parts[1].trim());

                // 去除 _max 後綴，使鍵名與資源ID一致
                if (key.endsWith('_max')) {
                    key = key.replace('_max', '');
                }

                if (key && !isNaN(val)) {
                    caps[key] = val;
                }
            }
        });
        return caps;
    }

    /**
     * 將 CSV 資料轉換為功法物件格式
     * @param {Array} csvData - CSV 解析後的資料
     * @returns {Object} 功法物件 { id: skillData }
     */
    static convertToSkills(csvData) {
        const skills = {};
        csvData.forEach(row => {
            skills[row.id] = {
                id: row.id,
                name: row.name,
                description: row.description,
                maxLevel: row.maxLevel,
                type: row.type,
                effects: {
                    type: row.effect_type,
                    amount: row.effect_amount
                },
                requirements: {
                    era: row.prereq_era,
                    skills: row.prereq_skills ? row.prereq_skills.split(',').map(s => s.trim()) : []
                },
                cost: {
                    type: row.cost_type,
                    amount: row.cost_amount
                }
            };
        });
        return skills;
    }
    /**
     * 將 CSV 資料轉換為資源物件格式
     * @param {Array} csvData - CSV 解析後的資料
     * @returns {Object} 資源物件 { id: resourceData }
     */
    static convertToResources(csvData) {
        const resources = {};
        csvData.forEach(row => {
            const res = {
                name: row.name,
                value: 0,
                max: row.max || 0,
                rate: row.rate || 0,
                type: row.type,
                unlocked: row.unlocked === true || row.unlocked === 'TRUE',
                prereqSkill: row.prereqSkill || null,
                prereqEra: row.prereqEra || 0
            };

            // 處理配方 (recipe) - 嘗試解析 JSON
            if (row.recipe && row.recipe !== 0) {
                try {
                    // 處理可能存在的引號問題
                    let recipeStr = row.recipe.replace(/\\"/g, '"');
                    if (recipeStr.startsWith('{') && recipeStr.endsWith('}')) {
                        res.recipe = JSON.parse(recipeStr);
                    }
                } catch (e) {
                    console.warn(`無法解析資源 ${row.id} 的配方:`, row.recipe);
                }
            }

            resources[row.id] = res;
        });
        return resources;
    }
}
