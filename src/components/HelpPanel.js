
import LanguageManager from '../utils/LanguageManager.js';

export default class HelpPanel {
    constructor() {
        this.container = document.getElementById('view-help');
    }

    init() {
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        const lang = LanguageManager.getInstance();

        const content = document.createElement('div');
        content.className = 'help-content';
        content.style.padding = '20px';
        content.style.lineHeight = '1.6';
        content.style.color = '#ddd';

        // 1. 遊戲簡介
        this.addSection(content, lang.t('遊戲簡介'), lang.t('本遊戲是一款修仙主題的放置類網頁遊戲。玩家將扮演一名修仙者，通過採集資源、建造洞府、修煉功法，最終渡劫飛昇，探尋大道的真諦。'));

        // 2. 系統說明
        this.addSection(content, lang.t('資源系統'), lang.t('資源是修仙的基礎。靈石用於貨幣流通，靈木、靈鐵等用於建築升級，靈草更是煉製丹藥不可或缺的材料。合理分配人力，最大化資源產出是前期關鍵。'));
        this.addSection(content, lang.t('建築系統'), lang.t('洞府建築提供各項加成。「聚靈陣」聚集天地靈氣，「煉丹房」煉製輔助修行的丹藥，「藏經閣」則能讓你領悟更高深的功法。升級建築是提升實力的主要途徑。'));
        this.addSection(content, lang.t('功法修煉'), lang.t('功法說明內容'));

        // 3. 輪迴系統
        this.addSection(content, lang.t('輪迴轉世'), lang.t('當壽元耗盡或修為達到瓶頸，可選擇「輪迴證道」。輪迴雖會重置修為與建築，但能保留你的「道心」與「道證」。'));

        const reincarnationDetails = document.createElement('ul');
        reincarnationDetails.style.marginTop = '10px';
        reincarnationDetails.style.paddingLeft = '20px';

        const daoHeart = document.createElement('li');
        daoHeart.innerHTML = `<strong style="color: #ffd700;">${lang.t('道心')}</strong>: ${lang.t('每一點道心都能全方位提升你的修煉效率與資源獲取速度，是累積的永久加成。')}`;
        reincarnationDetails.appendChild(daoHeart);

        const daoProof = document.createElement('li');
        daoProof.innerHTML = `<strong style="color: #00bcd4;">${lang.t('道證')}</strong>: ${lang.t('稀有的天道證明，可用於解鎖強大的輪迴天賦，讓你在下一世贏在起跑點。')}`;
        reincarnationDetails.appendChild(daoProof);

        content.lastChild.appendChild(reincarnationDetails);

        // 4. 開發者與版權
        const footer = document.createElement('div');
        footer.style.marginTop = '40px';
        footer.style.paddingTop = '20px';
        footer.style.borderTop = '1px solid #444';
        footer.style.textAlign = 'center';
        footer.style.fontSize = '0.9em';
        footer.style.color = '#888';

        const contact = document.createElement('div');
        contact.style.display = 'flex';
        contact.style.flexDirection = 'column';
        contact.style.gap = '5px';

        const email = document.createElement('p');
        email.textContent = `${lang.t('開發者聯絡與反饋')}: kainjalos@gmail.com`;
        contact.appendChild(email);

        const redditLink = document.createElement('p');
        redditLink.innerHTML = `<a href="https://www.reddit.com/r/incremental_games/" target="_blank" style="color: #ff4500; text-decoration: none;">🔗 ${lang.t('Reddit 增量遊戲論壇')}</a>`;
        contact.appendChild(redditLink);

        const fbLink = document.createElement('p');
        fbLink.innerHTML = `<a href="https://www.facebook.com/kain.huang/" target="_blank" style="color: #4267B2; text-decoration: none;">🔗 ${lang.t('開發者 Facebook')}</a>`;
        contact.appendChild(fbLink);

        const qqInfo = document.createElement('p');
        qqInfo.textContent = `💬 ${lang.t('開發者 QQ')}: 1182218525`;
        contact.appendChild(qqInfo);

        const credit = document.createElement('p');
        credit.style.marginTop = '15px';
        credit.innerHTML = `Developed with <span style="color: #ff6b6b;">Antigravity</span>`;

        footer.appendChild(contact);
        footer.appendChild(credit);
        content.appendChild(footer);

        this.container.appendChild(content);
    }

    addSection(container, title, text) {
        const section = document.createElement('div');
        section.style.marginBottom = '25px';

        const h3 = document.createElement('h3');
        h3.textContent = title;
        h3.style.color = '#fff';
        h3.style.borderLeft = '4px solid var(--accent-color)';
        h3.style.paddingLeft = '10px';
        h3.style.marginBottom = '10px';

        const p = document.createElement('p');
        p.textContent = text;
        p.style.textAlign = 'justify';

        section.appendChild(h3);
        section.appendChild(p);
        container.appendChild(section);
    }
}
