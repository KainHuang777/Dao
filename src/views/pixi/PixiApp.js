/**
 * PixiApp.js - Pixi.js 應用程式基礎類
 * 管理 Pixi.js 畫布、舞台和渲染循環
 */
import IRenderer from '../../renderers/IRenderer.js';

export default class PixiApp extends IRenderer {
    constructor() {
        super();
        this.app = null;
        this.container = null;
        this.effectsContainer = null;
        this.isInitialized = false;
        this.buttonEffects = new Map();

        // 記憶體管理：追蹤事件監聽器和計時器
        this._boundOnResize = null;
        this._boundOnPointerDown = null;
        this._activeTimeouts = new Set();
        this._backgroundParticles = [];
    }

    /**
     * 初始化 Pixi.js 應用程式
     * @param {HTMLElement} container - 要掛載 Canvas 的容器
     */
    async init(container) {
        if (this.isInitialized) return;

        // 檢查 PIXI 是否已載入
        if (typeof PIXI === 'undefined') {
            console.warn('⚠️ PIXI.js not loaded. Effects disabled.');
            return;
        }

        this.container = container;

        // 創建 Pixi Application
        this.app = new PIXI.Application();

        await this.app.init({
            width: container.clientWidth,
            height: container.clientHeight,
            backgroundAlpha: 0, // 透明背景，讓 HTML 穿透
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        // 設定 Canvas 樣式
        this.app.canvas.style.position = 'absolute';
        this.app.canvas.style.top = '0';
        this.app.canvas.style.left = '0';
        this.app.canvas.style.pointerEvents = 'none'; // 讓滑鼠事件穿透到 HTML
        this.app.canvas.style.zIndex = '0'; // (修改) 背景層需要比較低，調整為 0 或更低，但這是 Overlay...
        // 為了讓點擊波紋能運作，我們可能需要在 pointerdown 時攔截，或者就在 window 上監聽
        // 這裡保持 pointerEvents none，點擊波紋由 window 監聽器觸發

        container.style.position = 'relative';

        // (修改) 插入到 container 最前面作為背景，或者最後面作為 Overlay
        // 目前設計是 Overlay，所以 Z-index 控制
        this.app.canvas.style.zIndex = '1';
        container.appendChild(this.app.canvas);

        // 創建容器層級
        this.backgroundContainer = new PIXI.Container(); // 背景特效
        this.effectsContainer = new PIXI.Container();    // 一般特效
        this.uiEffectsContainer = new PIXI.Container();  // UI 特效 (如按鈕光環)

        this.app.stage.addChild(this.backgroundContainer);
        this.app.stage.addChild(this.effectsContainer);
        this.app.stage.addChild(this.uiEffectsContainer);

        // 監聽視窗大小變化（保存參考以便移除）
        this._boundOnResize = () => this.onResize();
        window.addEventListener('resize', this._boundOnResize);

        // 全域點擊波紋 (監聽 window)（保存參考以便移除）
        this._boundOnPointerDown = (e) => {
            // 轉換座標
            const rect = this.app.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.playClickRipple(x, y);
        };
        window.addEventListener('pointerdown', this._boundOnPointerDown);

        // 註冊 Update Loop
        this.app.ticker.add((ticker) => {
            this.update(ticker.deltaTime);
        });

        this.activeBackgroundEffect = null; // 當前背景特效 ticker function

        this.isInitialized = true;
        console.log('✅ Pixi.js 初始化完成');
    }

    /**
     * 視窗大小變化處理
     */
    onResize() {
        if (!this.app || !this.container) return;
        this.app.renderer.resize(
            this.container.clientWidth,
            this.container.clientHeight
        );
        // 重繪背景
        if (this.currentEraId) {
            this.updateBackground(this.currentEraId);
        }
    }

    /**
     * 每幀更新
     */
    update(deltaTime) {
        // 更新按鈕特效位置
        this.buttonEffects.forEach((effect, element) => {
            if (!element.isConnected) {
                this.removeButtonEffect(element);
                return;
            }
            // 同步位置
            const rect = element.getBoundingClientRect();
            const canvasRect = this.app.canvas.getBoundingClientRect();

            // 中心點
            effect.x = (rect.left - canvasRect.left) + rect.width / 2;
            effect.y = (rect.top - canvasRect.top) + rect.height / 2;

            // 如果按鈕隱藏了，也隱藏特效
            effect.visible = (element.style.display !== 'none' && element.style.visibility !== 'hidden');
        });
    }

    // ==========================================
    // 動態背景 (Dynamic Backgrounds)
    // ==========================================

    updateBackground(eraId) {
        if (!this.isInitialized) return;
        this.currentEraId = eraId;

        // 清除舊背景（正確銷毀粒子物件）
        this._destroyBackgroundParticles();
        this.backgroundContainer.removeChildren();
        if (this.activeBackgroundEffect) {
            this.app.ticker.remove(this.activeBackgroundEffect);
            this.activeBackgroundEffect = null;
        }

        if (eraId < 2) return; // Era 1 無特效

        console.log(`🌌 Switching background to Era ${eraId}`);

        const width = this.app.screen.width;
        const height = this.app.screen.height;

        if (eraId === 2) {
            // Era 2: 築基 (綠色靈氣粒子)
            this.createParticleBackground({
                count: 30,
                color: 0x4CAF50,
                minSpeed: 0.2,
                maxSpeed: 0.8,
                minSize: 2,
                maxSize: 6,
                alpha: 0.3,
                direction: 'up' // 向上飄升
            });
        } else if (eraId === 3) {
            // Era 3: 金丹 (金色流光)
            this.createFlowBackground(0xFFD700);
        } else if (eraId === 4) {
            // Era 4: 元嬰 (虛空紫粒子)
            this.createParticleBackground({
                count: 50,
                color: 0x9C27B0,
                minSpeed: 0.1,
                maxSpeed: 0.5,
                minSize: 1,
                maxSize: 4,
                alpha: 0.4,
                direction: 'random' // 懸浮
            });
        } else if (eraId === 5) {
            // Era 5: 化神 (青藍色極光)
            this.createParticleBackground({
                count: 60,
                color: 0x00BCD4, // Cyan
                minSpeed: 0.3,
                maxSpeed: 1.0,
                minSize: 2,
                maxSize: 8,
                alpha: 0.25,
                direction: 'up',
                wobble: true
            });
        } else if (eraId >= 6) {
            // Era 6: 煉虛 (深邃星雲)
            this.createStarfieldBackground();
        }
    }

    createParticleBackground(config) {
        const particles = [];
        for (let i = 0; i < config.count; i++) {
            const p = new PIXI.Graphics();
            p.fill(config.color);
            p.circle(0, 0, config.minSize + Math.random() * (config.maxSize - config.minSize));
            p.fill();
            p.alpha = Math.random() * config.alpha;
            p.x = Math.random() * this.app.screen.width;
            p.y = Math.random() * this.app.screen.height;

            // 自定義屬性
            p.vx = (Math.random() - 0.5) * 0.5;
            p.vy = config.direction === 'up'
                ? -config.minSpeed - Math.random() * (config.maxSpeed - config.minSpeed)
                : (Math.random() - 0.5) * config.maxSpeed;

            p.wobble = config.wobble ? Math.random() * Math.PI * 2 : 0;

            this.backgroundContainer.addChild(p);
            particles.push(p);
        }

        // 追蹤粒子以便銷毀
        this._backgroundParticles = particles;

        const updateFn = (ticker) => {
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.wobble !== undefined) {
                    p.wobble += 0.02;
                    p.x += Math.sin(p.wobble) * 0.2;
                }

                // 邊界循環
                if (p.y < -10) { p.y = this.app.screen.height + 10; p.x = Math.random() * this.app.screen.width; }
                if (p.y > this.app.screen.height + 10) { p.y = -10; p.x = Math.random() * this.app.screen.width; }
                if (p.x < -10) p.x = this.app.screen.width + 10;
                if (p.x > this.app.screen.width + 10) p.x = -10;
            });
        };

        this.app.ticker.add(updateFn);
        this.activeBackgroundEffect = updateFn;
    }

    createFlowBackground(color) {
        const lines = [];
        const count = 15;

        for (let i = 0; i < count; i++) {
            const line = new PIXI.Graphics();
            line.x = Math.random() * this.app.screen.width;
            line.y = Math.random() * this.app.screen.height;
            line.length = 50 + Math.random() * 150;
            line.speed = 2 + Math.random() * 3;
            line.alphaBase = 0.1 + Math.random() * 0.2;

            this.backgroundContainer.addChild(line);
            lines.push(line);
        }

        // 追蹤粒子以便銷毀
        this._backgroundParticles = lines;

        const updateFn = () => {
            lines.forEach(line => {
                line.clear();
                line.fill(color);
                // 畫一條細長的流光
                line.rect(0, 0, 2, line.length);
                line.fill();

                line.y -= line.speed;
                line.alpha = line.alphaBase + Math.sin(performance.now() * 0.005 + line.x) * 0.1;

                if (line.y + line.length < 0) {
                    line.y = this.app.screen.height;
                    line.x = Math.random() * this.app.screen.width;
                }
            });
        };

        this.app.ticker.add(updateFn);
        this.activeBackgroundEffect = updateFn;
    }

    createStarfieldBackground() {
        const stars = [];
        const count = 100;

        for (let i = 0; i < count; i++) {
            const star = new PIXI.Graphics();
            star.fill(0xFFFFFF);
            star.circle(0, 0, Math.random() * 2);
            star.fill();
            star.x = Math.random() * this.app.screen.width;
            star.y = Math.random() * this.app.screen.height;
            star.alpha = Math.random();
            star.zData = Math.random() * 2 + 0.1; // 深度

            this.backgroundContainer.addChild(star);
            stars.push(star);
        }

        // 追蹤粒子以便銷毀
        this._backgroundParticles = stars;

        const updateFn = () => {
            stars.forEach(star => {
                // 模擬 3D 對你的移動 (星空飛逝)
                // 這裡簡單做緩慢旋轉或平移
                star.y -= 0.1 * star.zData;
                star.alpha = 0.5 + Math.sin(performance.now() * 0.002 * star.zData) * 0.5;

                if (star.y < 0) {
                    star.y = this.app.screen.height;
                    star.x = Math.random() * this.app.screen.width;
                }
            });
        };

        this.app.ticker.add(updateFn);
        this.activeBackgroundEffect = updateFn;
    }

    // ==========================================
    // 按鈕特效 (Button Effects)
    // ==========================================

    addButtonEffect(element, type = 'charge') {
        if (!this.isInitialized || !element) return;
        if (!this.buttonEffects || this.buttonEffects.has(element)) return;

        console.log('✨ Adding button effect to', element.id);
        const container = new PIXI.Container();
        this.uiEffectsContainer.addChild(container);

        // 初始位置
        const rect = element.getBoundingClientRect();
        const canvasRect = this.app.canvas.getBoundingClientRect();
        container.x = (rect.left - canvasRect.left) + rect.width / 2;
        container.y = (rect.top - canvasRect.top) + rect.height / 2;

        // 創建粒子發射邏輯 (簡單版)
        const particles = [];
        const maxParticles = 20;

        const updateFn = (ticker) => {
            // 發射新粒子
            if (particles.length < maxParticles && Math.random() < 0.2) {
                const p = new PIXI.Graphics();
                p.fill(0xFFD700);
                p.circle(0, 0, 2);
                p.fill();

                // 環繞起始點
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.max(rect.width, rect.height) / 2 + 5;
                p.x = Math.cos(angle) * radius;
                p.y = Math.sin(angle) * radius;
                p.angle = angle;
                p.life = 1.0;

                container.addChild(p);
                particles.push(p);
            }

            // 更新粒子
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life -= 0.02;
                p.angle += 0.05; // 旋轉

                // 向中心螺旋
                const radius = (Math.max(rect.width, rect.height) / 2 + 5) * p.life;
                p.x = Math.cos(p.angle) * radius;
                p.y = Math.sin(p.angle) * radius;
                p.alpha = p.life;

                if (p.life <= 0) {
                    container.removeChild(p);
                    particles.splice(i, 1);
                    p.destroy();
                }
            }
        };

        this.app.ticker.add(updateFn);
        container.updateFn = updateFn; // 綁定以便移除

        this.buttonEffects.set(element, container);
    }

    removeButtonEffect(element) {
        if (!this.isInitialized) return;
        if (!this.buttonEffects || !this.buttonEffects.has(element)) return;

        const container = this.buttonEffects.get(element);
        if (container.updateFn) {
            this.app.ticker.remove(container.updateFn);
        }

        this.uiEffectsContainer.removeChild(container);
        container.destroy({ children: true });
        this.buttonEffects.delete(element);
    }

    // ==========================================
    // 高階文字特效 (Advanced Text Effects)
    // ==========================================

    playCenterTextEffect(textString, options = {}) {
        if (!this.isInitialized) return;

        let color = options.color || 0xFFD700;
        // Fix for Pixi v8: Ensure consistent types in fill array (avoid mixing number and string)
        if (typeof color === 'number') {
            color = '#' + color.toString(16).padStart(6, '0');
        }

        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 48,
            fontWeight: 'bold',
            fill: color, // v8 Fix: text gradient array support is different, reverting to solid color for stability
            stroke: '#000000',
            strokeThickness: 5,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 2,
        });

        const text = new PIXI.Text({ text: textString, style: style });
        text.anchor.set(0.5);
        text.x = this.app.screen.width / 2;
        text.y = this.app.screen.height / 2;
        text.scale.set(0); // 初始不可見
        text.alpha = 0;

        this.effectsContainer.addChild(text);

        const startTime = performance.now();
        const duration = 2500;

        // 動畫階段: 0-0.2 (Pop In), 0.2-0.8 (Stay), 0.8-1.0 (Fade Out Up)
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1.0);

            if (progress < 0.2) {
                // Pop In (Elastic)
                let t = progress / 0.2;
                // Simple easeOutBack
                const s = 1.70158;
                const scale = --t * t * ((s + 1) * t + s) + 1;
                text.scale.set(scale);
                text.alpha = t * 2; // fade in quick
            } else if (progress < 0.7) {
                // Stay & Floating slightly
                text.scale.set(1.0);
                text.alpha = 1.0;
                text.y = this.app.screen.height / 2 + Math.sin(elapsed * 0.005) * 5;
            } else {
                // Fade Out & Go Up
                const t = (progress - 0.7) / 0.3;
                text.alpha = 1 - t;
                text.y -= 2;
                text.scale.set(1 + t * 0.5); // continue expanding
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.effectsContainer.removeChild(text);
                text.destroy();
            }
        };

        requestAnimationFrame(animate);
    }

    // ==========================================
    // 點擊波紋 (Click Ripple)
    // ==========================================

    playClickRipple(x, y) {
        if (!this.isInitialized) return;

        const graphics = new PIXI.Graphics();
        this.effectsContainer.addChild(graphics);

        const startTime = performance.now();
        const duration = 500;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            graphics.clear();
            graphics.stroke({ width: 2 * (1 - progress), color: 0xFFFFFF, alpha: 1 - progress });
            graphics.circle(0, 0, 10 + progress * 50);
            graphics.stroke();
            graphics.x = x;
            graphics.y = y;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.effectsContainer.removeChild(graphics);
                graphics.destroy();
            }
        };
        requestAnimationFrame(animate);
    }

    /**
     * 播放資源獲取飄字特效
     * @param {string} resourceId - 資源 ID
     * @param {number} amount - 數量
     * @param {number} x - X 座標
     * @param {number} y - Y 座標
     */
    playResourceGainEffect(resourceId, amount, x, y) {
        if (!this.isInitialized || !this.app) return;

        const color = this.getResourceColor(resourceId);
        const text = new PIXI.Text({
            text: `+${this.formatNumber(amount)}`,
            style: {
                fontFamily: 'Arial',
                fontSize: 16,
                fill: color,
                fontWeight: 'bold',
                dropShadow: true,
                dropShadowColor: '#000000',
                dropShadowBlur: 2,
                dropShadowDistance: 1,
            }
        });

        text.x = x;
        text.y = y;
        text.alpha = 1;

        this.effectsContainer.addChild(text);

        // 動畫：向上飄動並淡出
        const startY = y;
        const duration = 1500; // 1.5 秒
        const startTime = performance.now();

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            text.y = startY - (50 * progress); // 向上飄 50px
            text.alpha = 1 - progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.effectsContainer.removeChild(text);
                text.destroy();
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * 播放升級特效 (局部，從按鈕位置)
     * @param {number} x - X 座標
     * @param {number} y - Y 座標
     */
    playLevelUpEffect(x, y) {
        if (!this.isInitialized || !this.app) return;

        const particleCount = 15;
        const color = 0x4CAF50; // 綠色

        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();
            particle.fill(color);
            particle.circle(0, 0, 4);
            particle.fill();
            particle.x = x;
            particle.y = y;

            this.effectsContainer.addChild(particle);

            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            const startTime = performance.now();
            const duration = 600 + Math.random() * 300;

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                particle.x = x + vx * progress;
                particle.y = y + vy * progress - (30 * progress); // 向上飄
                particle.alpha = 1 - progress;
                particle.scale.set(1 - progress * 0.5);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.effectsContainer.removeChild(particle);
                    particle.destroy();
                }
            };

            requestAnimationFrame(animate);
        }
    }

    /**
     * 播放升階成功特效 (全屏金色爆發)
     */
    playBreakthroughEffect() {
        if (!this.isInitialized || !this.app) return;

        const centerX = this.app.screen.width / 2;
        const centerY = this.app.screen.height / 2;
        const particleCount = 80;
        const color = 0xFFD700; // 金色

        console.log('🌟 Playing breakthrough effect');

        // 中心爆發
        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();
            particle.fill(color);
            particle.circle(0, 0, 3 + Math.random() * 4);
            particle.fill();
            particle.x = centerX;
            particle.y = centerY;

            this.effectsContainer.addChild(particle);

            const angle = Math.random() * Math.PI * 2;
            const speed = 200 + Math.random() * 400;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            const startTime = performance.now();
            const duration = 1200 + Math.random() * 600;

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                particle.x = centerX + vx * progress;
                particle.y = centerY + vy * progress;
                particle.alpha = 1 - progress;
                particle.scale.set(1.5 - progress);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.effectsContainer.removeChild(particle);
                    particle.destroy();
                }
            };

            requestAnimationFrame(animate);
        }

        // 添加光環效果
        this.playRingEffect(centerX, centerY, color, 3);
    }

    /**
     * 播放升階失敗特效 (全屏紅色碎裂)
     */
    playBreakthroughFailedEffect() {
        if (!this.isInitialized || !this.app) return;

        const centerX = this.app.screen.width / 2;
        const centerY = this.app.screen.height / 2;
        const particleCount = 60;
        const color = 0xFF4444; // 紅色

        console.log('💔 Playing breakthrough failed effect');

        // 碎片向下掉落
        for (let i = 0; i < particleCount; i++) {
            const particle = new PIXI.Graphics();
            particle.fill(color);
            // 碎片形狀
            particle.rect(-3, -3, 6, 6);
            particle.fill();
            particle.x = centerX + (Math.random() - 0.5) * 200;
            particle.y = centerY + (Math.random() - 0.5) * 100;
            particle.rotation = Math.random() * Math.PI;

            this.effectsContainer.addChild(particle);

            const vx = (Math.random() - 0.5) * 100;
            const startTime = performance.now();
            const duration = 1500 + Math.random() * 500;

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                particle.x += vx * 0.02;
                particle.y += 5 + progress * 10; // 加速下落
                particle.rotation += 0.1;
                particle.alpha = 1 - progress;

                if (progress < 1 && particle.y < this.app.screen.height + 50) {
                    requestAnimationFrame(animate);
                } else {
                    this.effectsContainer.removeChild(particle);
                    particle.destroy();
                }
            };

            requestAnimationFrame(animate);
        }

        // 添加震動效果（閃爍紅邊）
        this.playScreenFlash(0xFF0000, 0.3);
    }

    /**
     * 播放輪迴飛升特效 (全屏紫金漩渦)
     */
    playReincarnationEffect() {
        if (!this.isInitialized || !this.app) return;

        const centerX = this.app.screen.width / 2;
        const centerY = this.app.screen.height / 2;
        const particleCount = 120;

        console.log('🔮 Playing reincarnation effect');

        // 漩渦粒子
        for (let i = 0; i < particleCount; i++) {
            const colors = [0x9C27B0, 0xFFD700, 0xE91E63, 0x00BCD4];
            const color = colors[Math.floor(Math.random() * colors.length)];

            const particle = new PIXI.Graphics();
            particle.fill(color);
            particle.circle(0, 0, 2 + Math.random() * 3);
            particle.fill();

            // 從螢幕邊緣開始
            const startAngle = Math.random() * Math.PI * 2;
            const startRadius = Math.max(this.app.screen.width, this.app.screen.height);
            particle.x = centerX + Math.cos(startAngle) * startRadius;
            particle.y = centerY + Math.sin(startAngle) * startRadius;

            this.effectsContainer.addChild(particle);

            const startTime = performance.now();
            const duration = 2000 + Math.random() * 1000;
            const rotationSpeed = 3 + Math.random() * 2;

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // 螺旋向中心
                const currentRadius = startRadius * (1 - progress);
                const currentAngle = startAngle + progress * rotationSpeed * Math.PI;

                particle.x = centerX + Math.cos(currentAngle) * currentRadius;
                particle.y = centerY + Math.sin(currentAngle) * currentRadius;
                particle.alpha = progress < 0.8 ? 1 : (1 - (progress - 0.8) * 5);
                particle.scale.set(1 + progress);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.effectsContainer.removeChild(particle);
                    particle.destroy();
                }
            };

            // 延遲啟動以創造波浪效果
            this._trackTimeout(() => requestAnimationFrame(animate), i * 20);
        }

        // 最後的光爆
        this._trackTimeout(() => {
            this.playRingEffect(centerX, centerY, 0xFFFFFF, 5);
            this.playScreenFlash(0xFFFFFF, 0.5);
        }, 2500);
    }

    /**
     * 播放光環效果
     */
    playRingEffect(x, y, color, count = 1) {
        for (let r = 0; r < count; r++) {
            this._trackTimeout(() => {
                if (!this.isInitialized || !this.effectsContainer) return; // 防禦性檢查

                const ring = new PIXI.Graphics();
                ring.stroke({ width: 3, color: color });
                ring.circle(0, 0, 10);
                ring.stroke();
                ring.x = x;
                ring.y = y;

                this.effectsContainer.addChild(ring);

                const startTime = performance.now();
                const duration = 800;

                const animate = () => {
                    if (!this.isInitialized) {
                        ring.destroy();
                        return;
                    }
                    const elapsed = performance.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    ring.scale.set(1 + progress * 20);
                    ring.alpha = 1 - progress;

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        this.effectsContainer.removeChild(ring);
                        ring.destroy();
                    }
                };

                requestAnimationFrame(animate);
            }, r * 200);
        }
    }

    /**
     * 播放螢幕閃爍效果
     */
    playScreenFlash(color, maxAlpha = 0.5) {
        const flash = new PIXI.Graphics();
        flash.fill(color);
        flash.rect(0, 0, this.app.screen.width, this.app.screen.height);
        flash.fill();
        flash.alpha = 0;

        this.effectsContainer.addChild(flash);

        const startTime = performance.now();
        const duration = 400;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // 快速閃爍後消失
            if (progress < 0.3) {
                flash.alpha = (progress / 0.3) * maxAlpha;
            } else {
                flash.alpha = maxAlpha * (1 - (progress - 0.3) / 0.7);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.effectsContainer.removeChild(flash);
                flash.destroy();
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * 取得資源對應顏色
     */
    getResourceColor(resourceId) {
        const colorMap = {
            lingli: '#00BCD4',
            money: '#FFD700',
            wood: '#8BC34A',
            stone_low: '#9E9E9E',
            spirit_grass_low: '#4CAF50',
            skill_point: '#E91E63',
        };
        return colorMap[resourceId] || '#FFFFFF';
    }

    /**
     * 銷毀背景粒子（記憶體清理輔助方法）
     */
    _destroyBackgroundParticles() {
        if (this._backgroundParticles && this._backgroundParticles.length > 0) {
            this._backgroundParticles.forEach(p => {
                if (p && !p.destroyed) {
                    p.destroy();
                }
            });
            this._backgroundParticles = [];
        }
    }

    /**
     * 追蹤 setTimeout 以便清理（記憶體管理輔助方法）
     * @param {Function} callback - 回調函數
     * @param {number} delay - 延遲毫秒
     * @returns {number} timeout ID
     */
    _trackTimeout(callback, delay) {
        const id = setTimeout(() => {
            this._activeTimeouts.delete(id);
            callback();
        }, delay);
        this._activeTimeouts.add(id);
        return id;
    }

    /**
     * 清除所有追蹤的 setTimeout
     */
    _clearAllTimeouts() {
        this._activeTimeouts.forEach(id => clearTimeout(id));
        this._activeTimeouts.clear();
    }

    /**
     * 格式化數字
     */
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return Math.floor(num).toString();
    }

    /**
     * 銷毀 Pixi.js 應用程式（完整清理）
     */
    destroy() {
        // 移除事件監聽器
        if (this._boundOnResize) {
            window.removeEventListener('resize', this._boundOnResize);
            this._boundOnResize = null;
        }
        if (this._boundOnPointerDown) {
            window.removeEventListener('pointerdown', this._boundOnPointerDown);
            this._boundOnPointerDown = null;
        }

        // 清除所有計時器
        this._clearAllTimeouts();

        // 銷毀背景粒子
        this._destroyBackgroundParticles();

        // 移除背景 ticker
        if (this.activeBackgroundEffect && this.app) {
            this.app.ticker.remove(this.activeBackgroundEffect);
            this.activeBackgroundEffect = null;
        }

        // 清理按鈕特效
        if (this.buttonEffects) {
            this.buttonEffects.forEach((container, element) => {
                if (container.updateFn && this.app) {
                    this.app.ticker.remove(container.updateFn);
                }
                container.destroy({ children: true });
            });
            this.buttonEffects.clear();
        }

        // 銷毀 Pixi 應用程式
        if (this.app) {
            this.app.destroy(true, { children: true, texture: true });
            this.app = null;
        }

        this.isInitialized = false;
        console.log('🧹 PixiApp 已完整銷毀並清理記憶體');
    }
}
