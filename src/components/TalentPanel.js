import PlayerManager from '../utils/PlayerManager.js';
import Formatter from '../utils/Formatter.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class TalentPanel {
    constructor() {
        this.container = document.getElementById('view-talents');
    }

    getTalents() {
        const lang = LanguageManager.getInstance();
        return [
            { id: 'innate_dao_body', name: lang.t('先天道體'), desc: lang.t('天生親近大道，所有資源產出 +10%'), baseCost: 10 },
            { id: 'innate_dao_fetus', name: lang.t('先天道胎'), desc: lang.t('道胎蘊養，基礎修煉時間減少 15%'), baseCost: 15 },
            { id: 'five_elements_root', name: lang.t('五靈根'), desc: lang.t('五行圓滿，所有建築與修煉消耗減少 10%'), baseCost: 20 },
            { id: 'dragon_aura', name: lang.t('國運龍氣'), desc: lang.t('身負國運，基礎資源上限 +5%'), baseCost: 25 },
            { id: 'gold_touch', name: lang.t('點石成金'), desc: lang.t('財運亨通，金錢產出額外 +20%'), baseCost: 15 },
            { id: 'nature_friend', name: lang.t('草木之友'), desc: lang.t('草木有情，藥草與靈木產出額外 +20%'), baseCost: 15 },
            { id: 'sword_heart', name: lang.t('劍心通明'), desc: lang.t('劍道奇才，功法修煉速度 +20%'), baseCost: 30 },
            { id: 'three_flowers', name: lang.t('三花聚頂'), desc: lang.t('精氣神合一，靈力上限額外 +25%'), baseCost: 20 },
            { id: 'lifespan_master', name: lang.t('長生久視'), desc: lang.t('天賦延壽，基礎壽元上限 +10%'), baseCost: 40 },
            { id: 'world_child', name: lang.t('位面之子'), desc: lang.t('世界意志眷顧，所有建築效果額外 +10%'), baseCost: 50 },
            { id: 'cycle_expansion', name: lang.t('周天循環·擴'), desc: lang.t('周天運轉，氣海擴張，技能點上限 +10%'), baseCost: 20 }
        ];
    }


    init() {
        this.render();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const playerState = PlayerManager.state;

        // 頂部統計
        const stats = document.createElement('div');
        stats.className = 'talent-stats';
        const prodBonus = (PlayerManager.getDaoHeartBonus() * 100).toFixed(1);
        const capBonus = (PlayerManager.getDaoProofBonus() * 100).toFixed(1);

        const lang = LanguageManager.getInstance();
        stats.innerHTML = `
            <div class="stat-item">${lang.t('輪迴次數')}: ${playerState.rebirthCount}</div>
            <div class="stat-item">${lang.t('可用道心')}: <span id="talent-dao-heart">${Formatter.formatBigNumber(playerState.daoHeart)}</span> <small style="color:#4caf50">(${lang.t('產出')} +${prodBonus}%)</small></div>
            <div class="stat-item">${lang.t('道證位格')}: <span id="talent-dao-proof">${Formatter.formatBigNumber(playerState.daoProof)}</span> <small style="color:#2196f3">(${lang.t('上限')} +${capBonus}%)</small></div>
        `;
        this.container.appendChild(stats);

        // 提前輪迴功能 (Request 2)
        const hasLotus = window.game.buildingManager.getBuilding('rebirth_lotus')?.level > 0;
        const hasMirror = window.game.buildingManager.getBuilding('void_mirror')?.level > 0;

        if (hasLotus || hasMirror) {
            const rebirthBox = document.createElement('div');
            rebirthBox.className = 'talent-rebirth-box';
            rebirthBox.style = 'margin: 15px 0; padding: 15px; background: rgba(230, 126, 34, 0.1); border: 1px solid #e67e22; border-radius: 8px; text-align: center;';

            const buildingsData = window.game.buildingManager.exportData();
            const buildings = buildingsData.buildings || buildingsData; // 相容兩種格式
            let totalLevel = 0;
            Object.values(buildings).forEach(b => {
                if (b && typeof b === 'object' && 'level' in b) {
                    totalLevel += b.level;
                }
            });
            const estHeart = Math.floor(totalLevel / 10);
            const estProof = Math.floor(totalLevel / 50);


            const lang = LanguageManager.getInstance();
            rebirthBox.innerHTML = `
                <h3 style="color:#e67e22; margin-top:0;">${lang.t('提前輪迴')}</h3>
                <p style="font-size:0.9em; color:#ccc;">${lang.t('已感悟輪迴真諦，可強行兵解脫離此世。')}</p>
                <div style="margin:10px 0; font-weight:bold;">${lang.t('預計獲得')}: ${lang.t('道心')} +${Formatter.formatBigNumber(estHeart)}, ${lang.t('道證')} +${Formatter.formatBigNumber(estProof)}</div>
                <button id="early-reincarnate-btn" class="btn" style="background:#e67e22;">${lang.t('啟動提前輪迴')}</button>
            `;

            const btn = rebirthBox.querySelector('#early-reincarnate-btn');
            btn.onclick = () => {
                if (confirm(`${lang.t('確定要提前遁入輪迴嗎？\\n以此兵解法，預計獲得：\\n道心')} +${estHeart}, ${lang.t('道證')} +${estProof}`)) {
                    const res = PlayerManager.reincarnate(totalLevel);
                    alert(`${lang.t('輪迴成功！獲得道心')} +${res.daoHeart}, ${lang.t('道證')} +${res.daoProof}`);
                    location.reload();
                }
            };
            this.container.appendChild(rebirthBox);
        }

        const grid = document.createElement('div');
        grid.className = 'talent-grid';

        const talents = this.getTalents();
        talents.forEach(t => {
            const level = playerState.talents[t.id] || 0;
            const cost = t.baseCost * (level + 1);

            const card = document.createElement('div');
            card.className = 'talent-card';
            card.innerHTML = `
                <div class="talent-info">
                    <h3>${t.name} <span class="talent-lvl">Lv.${level}</span></h3>
                    <p>${t.desc}</p>
                    <div class="talent-cost">${lang.t('消耗道心')}: ${Formatter.formatBigNumber(cost)}</div>
                </div>
                <button class="btn buy-talent-btn ${playerState.daoHeart < cost ? 'disabled' : ''}" 
                    data-id="${t.id}" data-cost="${cost}">
                    ${level > 0 ? lang.t('升級') : lang.t('覺醒')}
                </button>
            `;

            const btn = card.querySelector('.buy-talent-btn');
            btn.onclick = () => {
                if (PlayerManager.buyTalent(t.id, cost)) {
                    this.render();
                    window.game.buildingManager.recalculateRates();
                }
            };

            grid.appendChild(card);
        });

        this.container.appendChild(grid);
    }
}
