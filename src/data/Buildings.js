import CSVLoader from '../utils/CSVLoader.js';

// 預設建築資料（作為備援）
const defaultBuildings = {
    hut: {
        id: 'hut',
        name: '茅屋',
        description: '簡陋的茅屋，略微提升對天地靈氣的感應。',
        baseCost: { money: 10 },
        costFactor: 1.5,
        effects: {
            lingli: 0.1
        },
        maxLevel: 100
    },
    stone_mine: {
        id: 'stone_mine',
        name: '採石場',
        description: '簡陋的採石場，尋找靈脈進行採集，可以產出微量靈石。',
        baseCost: { wood: 10, money: 10 },
        costFactor: 1.5,
        effects: {
            stone: 0.1
        },
        maxLevel: 100
    },
    wooden_house: {
        id: 'wooden_house',
        name: '木屋',
        description: '結實的木屋，可以居住更多凡人，增加金錢收入與儲存。',
        baseCost: { money: 50, wood: 10 },
        costFactor: 1.6,
        effects: {
            money: 0.5,
            money_max: 500
        },
        maxLevel: 100
    }
};

// 建築資料（將從 CSV 載入）
export let Buildings = { ...defaultBuildings };

/**
 * 從 CSV 載入建築資料
 * @returns {Promise<Object>} 建築資料物件
 */
export async function loadBuildings() {
    try {
        const [buildingsCsv, storageCsv] = await Promise.all([
            CSVLoader.loadCSV('./src/data/buildings.csv'),
            CSVLoader.loadCSV('./src/data/storage.csv')
        ]);

        const allCsvData = [...buildingsCsv, ...storageCsv];

        if (allCsvData.length > 0) {
            Buildings = CSVLoader.convertToBuildings(allCsvData);
            console.log(`✅ 成功載入 ${buildingsCsv.length} 個建築與 ${storageCsv.length} 個儲存設施`);
            return Buildings;
        } else {
            console.warn('⚠️ CSV 檔案為空，使用預設建築資料');
            Buildings = { ...defaultBuildings };
            return Buildings;
        }
    } catch (error) {
        console.error('❌ 載入建築資料失敗，使用預設資料:', error);
        Buildings = { ...defaultBuildings };
        return Buildings;
    }
}

/**
 * 取得單一建築資料
 * @param {string} buildingId - 建築 ID
 * @returns {Object|null} 建築資料
 */
export function getBuilding(buildingId) {
    return Buildings[buildingId] || null;
}

/**
 * 取得所有建築資料
 * @returns {Object} 所有建築資料
 */
export function getAllBuildings() {
    return Buildings;
}
