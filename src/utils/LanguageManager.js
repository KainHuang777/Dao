
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
        // Load the saved language if it's not the default (TC is default in code)
        if (this.currentLang !== 'zh-TW') {
            await this.loadLanguage(this.currentLang);
        }
    }

    async loadLanguage(lang) {
        if (lang === 'zh-TW') {
            this.currentLang = lang;
            localStorage.setItem('gameLanguage', lang);
            return;
        }

        try {
            this.isLoading = true;
            const response = await fetch(`./src/data/i18n/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load language file: ${lang}`);
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
        // If current language is TC, return the key (assuming key is the TC text)
        if (this.currentLang === 'zh-TW') {
            if (params) {
                return key.replace(/{(\w+)}/g, (match, paramKey) => {
                    return params[paramKey] !== undefined ? params[paramKey] : match;
                });
            }
            return key;
        }

        const langData = this.translations[this.currentLang];

        // If language data not loaded, fallback to key
        if (!langData) {
            return key;
        }

        // 1. Try direct lookup (for UI strings where key is the TC text)
        let translated = langData[key];

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

        // Fallback: Return key if translation is missing
        if (!translated) {
            return key;
        }

        // Parameter interpolation (e.g. "Hello {name}")
        // Simple replacement for {param}
        if (params) {
            return translated.replace(/{(\w+)}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        }

        return translated;
    }

    getCurrentLang() {
        return this.currentLang;
    }
}
