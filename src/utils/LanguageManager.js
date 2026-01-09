
export default class LanguageManager {
    constructor() {
        if (LanguageManager.instance) {
            return LanguageManager.instance;
        }
        LanguageManager.instance = this;

        this.currentLang = 'zh-TW'; // Default language
        this.translations = {};
        this.isLoading = false;

        // Initialize from localStorage if available
        const savedLang = localStorage.getItem('gameLanguage');
        if (savedLang) {
            this.currentLang = savedLang;
        }
    }

    static getInstance() {
        if (!LanguageManager.instance) {
            LanguageManager.instance = new LanguageManager();
        }
        return LanguageManager.instance;
    }

    async init() {
        // Always load current language data
        await this.loadLanguage(this.currentLang);
    }

    async loadLanguage(lang) {
        try {
            this.isLoading = true;
            const response = await fetch(`./src/data/i18n/${lang}.json?v=${Date.now()}`);
            if (!response.ok) {
                // If file doesn't exist (e.g. TC might originally have no file), still set currentLang
                console.warn(`Language file not found: ${lang}, falling back to key-based display.`);
                this.currentLang = lang;
                localStorage.setItem('gameLanguage', lang);
                return;
            }
            const data = await response.json();
            this.translations[lang] = data;
            this.currentLang = lang;
            localStorage.setItem('gameLanguage', lang);
            console.log(`Language loaded: ${lang}`);
        } catch (error) {
            console.error('Error loading language:', error);
            // Fallback to TC on error
            this.currentLang = 'zh-TW';
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Translates a key.
     * @param {string} key - The text in Traditional Chinese (for UI) or ID (for data).
     * @param {object} params - Optional parameters for interpolation.
     * @returns {string} The translated text or the key if not found.
     */
    t(key, params = {}) {
        const langData = this.translations[this.currentLang];

        // 1. Try lookup if language data exists
        let translated = null;
        if (langData) {
            translated = langData[key];

            // 2. If not found, try nested lookup (e.g. "ui.save_game" or "resources.lingli.name")
            if (!translated && key.includes('.')) {
                const parts = key.split('.');
                let current = langData;
                for (const part of parts) {
                    if (current && current[part]) {
                        current = current[part];
                    } else {
                        current = null;
                        break;
                    }
                }
                if (current && typeof current === 'string') {
                    translated = current;
                }
            }
        }

        // Fallback: Use key if translation is missing or language not loaded
        let result = translated || key;

        // Parameter interpolation (e.g. "Hello {name}")
        // Simple replacement for {param}
        if (params) {
            return result.replace(/{(\w+)}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        }

        return result;
    }

    getCurrentLang() {
        return this.currentLang;
    }
}
