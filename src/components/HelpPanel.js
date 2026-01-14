
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

        // CSS Grid Layout Setup
        content.style.display = 'grid';
        content.style.gridTemplateColumns = '1fr 1fr'; // Two columns
        content.style.gap = '20px'; // Gap between cells

        // Responsive handling (mobile fallback) could be added via media query in CSS, 
        // but for inline js style, we might stick to grid or use a simple check.
        // For simplicity and per requests, we enforce grid.
        if (window.innerWidth < 768) {
            content.style.gridTemplateColumns = '1fr';
        }

        // 1. 遊戲簡介
        this.addSection(content, `🎮 ${lang.t('遊戲簡介')}`, lang.t('本遊戲是一款修仙主題的放置類網頁遊戲。玩家將扮演一名修仙者，通過採集資源、建造洞府、修煉功法，最終渡劫飛昇，探尋大道的真諦。'));

        // 2. 系統說明 - 資源
        this.addSection(content, `💎 ${lang.t('資源系統')}`, lang.t('資源是修仙的基礎。靈石用於貨幣流通，靈木、靈鐵等用於建築升級，靈草更是煉製丹藥不可或缺的材料。合理分配人力，最大化資源產出是前期關鍵。'));

        // 2. 系統說明 - 建築
        this.addSection(content, `🏰 ${lang.t('建築系統')}`, lang.t('洞府建築提供各項加成。「聚靈陣」聚集天地靈氣，「煉丹房」煉製輔助修行的丹藥，「藏經閣」則能讓你領悟更高深的功法。升級建築是提升實力的主要途徑。'));

        // 2. 系統說明 - 功法
        this.addSection(content, `📜 ${lang.t('功法修煉')}`, lang.t('功法能永久提升你的各項屬性。有些功法能提升資源產出，有些能增加修煉速度。注意功法有境界需求，需循序漸進。'));

        // 2. 系統說明 - 宗門 (詳細)
        const sectSection = document.createElement('div');
        sectSection.style.marginBottom = '25px';

        const sectH3 = document.createElement('h3');
        sectH3.textContent = `⛩️ ${lang.t('宗門系統')}`;
        sectH3.style.color = '#fff';
        sectH3.style.borderLeft = '4px solid var(--accent-color)';
        sectH3.style.paddingLeft = '10px';
        sectH3.style.marginBottom = '10px';

        const sectP = document.createElement('p');
        sectP.textContent = lang.t('宗門系統_desc');
        sectP.style.textAlign = 'justify';

        const sectDetails = document.createElement('ul');
        sectDetails.style.marginTop = '10px';
        sectDetails.style.paddingLeft = '20px';

        const sectTasks = document.createElement('li');
        sectTasks.innerHTML = `<strong style="color: #4CAF50;">${lang.t('宗門任務')}</strong>: ${lang.t('宗門任務_desc')}`;
        sectDetails.appendChild(sectTasks);

        const cloudMarket = document.createElement('li');
        cloudMarket.innerHTML = `<strong style="color: #00BCD4;">${lang.t('雲海天市')}</strong>: ${lang.t('雲海天市_desc')}`;
        sectDetails.appendChild(cloudMarket);

        const heavenlyEvents = document.createElement('li');
        heavenlyEvents.innerHTML = `<strong style="color: #9C27B0;">${lang.t('天機任務')}</strong>: ${lang.t('天機任務_desc')}`;
        sectDetails.appendChild(heavenlyEvents);

        sectSection.appendChild(sectH3);
        sectSection.appendChild(sectP);
        sectSection.appendChild(sectDetails);
        content.appendChild(sectSection);

        // 3. 輪迴系統
        // Create a custom section element for complex content (Reincarnation)
        const reincarnationSection = document.createElement('div');
        reincarnationSection.style.marginBottom = '25px';

        const h3 = document.createElement('h3');
        h3.textContent = `🧬 ${lang.t('輪迴轉世')}`;
        h3.style.color = '#fff';
        h3.style.borderLeft = '4px solid var(--accent-color)';
        h3.style.paddingLeft = '10px';
        h3.style.marginBottom = '10px';

        const p = document.createElement('p');
        p.textContent = lang.t('當壽元耗盡或修為達到瓶頸，可選擇「輪迴證道」。輪迴雖會重置修為與建築，但能保留你的「道心」與「道證」。');
        p.style.textAlign = 'justify';

        const reincarnationDetails = document.createElement('ul');
        reincarnationDetails.style.marginTop = '10px';
        reincarnationDetails.style.paddingLeft = '20px';

        const daoHeart = document.createElement('li');
        daoHeart.innerHTML = `<strong style="color: #ffd700;">${lang.t('道心')}</strong>: ${lang.t('每一點道心都能全方位提升你的修煉效率與資源獲取速度，是累積的永久加成。')}`;
        reincarnationDetails.appendChild(daoHeart);

        const daoProof = document.createElement('li');
        daoProof.innerHTML = `<strong style="color: #00bcd4;">${lang.t('道證')}</strong>: ${lang.t('稀有的天道證明，可用於解鎖強大的輪迴天賦，讓你在下一世贏在起跑點。')}`;
        reincarnationDetails.appendChild(daoProof);

        reincarnationSection.appendChild(h3);
        reincarnationSection.appendChild(p);
        reincarnationSection.appendChild(reincarnationDetails);
        content.appendChild(reincarnationSection);

        // 4. 開發者與版權 (Footer - Span across columns)
        const footer = document.createElement('div');
        footer.style.gridColumn = '1 / -1'; // Span all columns
        footer.style.marginTop = '20px';
        footer.style.paddingTop = '20px';
        footer.style.borderTop = '1px solid #444';
        footer.style.textAlign = 'center';
        footer.style.fontSize = '0.9em';
        footer.style.color = '#888';

        const contact = document.createElement('div');
        contact.style.display = 'flex';
        contact.style.flexWrap = 'wrap';
        contact.style.gap = '15px';
        contact.style.justifyContent = 'center';
        contact.style.alignItems = 'center';

        const email = document.createElement('span');
        email.textContent = `${lang.t('開發者聯絡與反饋')}: kainjalos@gmail.com`;
        email.style.cursor = 'pointer'; // Make it look clickable
        email.onclick = this.handleSecretDebugToggle.bind(this);
        contact.appendChild(email);

        const separator1 = document.createElement('span');
        separator1.textContent = '|';
        separator1.style.color = '#555';
        contact.appendChild(separator1);

        const redditLink = document.createElement('span');
        redditLink.innerHTML = `<a href="https://www.reddit.com/r/incremental_games/" target="_blank" style="color: #ff4500; text-decoration: none;">🔗 ${lang.t('Reddit 增量遊戲論壇')}</a>`;
        contact.appendChild(redditLink);

        const separator2 = document.createElement('span');
        separator2.textContent = '|';
        separator2.style.color = '#555';
        contact.appendChild(separator2);

        const fbLink = document.createElement('span');
        fbLink.innerHTML = `<a href="https://www.facebook.com/kain.huang/" target="_blank" style="color: #4267B2; text-decoration: none;">🔗 ${lang.t('開發者 Facebook')}</a>`;
        contact.appendChild(fbLink);

        const separator3 = document.createElement('span');
        separator3.textContent = '|';
        separator3.style.color = '#555';
        contact.appendChild(separator3);

        const qqInfo = document.createElement('span');
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

    handleSecretDebugToggle() {
        if (!this.debugClickCount) this.debugClickCount = 0;
        this.debugClickCount++;

        if (this.debugClickCount >= 3) {
            const debugTab = document.getElementById('debug-tab-btn');
            if (debugTab) {
                const isHidden = debugTab.style.display === 'none';
                debugTab.style.display = isHidden ? 'inline-block' : 'none';

                // Optional: Feedback to user
                const msg = isHidden ? 'Debug Mode Enabled 🔧' : 'Debug Mode Disabled';
                console.log(msg);
                if (window.game && window.game.uiManager) {
                    window.game.uiManager.resourcePanel.showFloatingText(msg, debugTab.getBoundingClientRect().left, debugTab.getBoundingClientRect().top, '#ff9800');
                }
            }
            this.debugClickCount = 0; // Reset counter
        }
    }
}
