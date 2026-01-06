
export const ReleaseNotes = [
    {
        version: "v0.21",
        date: "2026-01-06",
        notes: {
            "zh-TW": [
                "【功能】境界即時指引優化：新增四個境界提示，使用正確建築名稱與資源說明。",
                "【介面】語言切換器改版：改為平鋪按鈕佈局(EN/TC/SC/JP)，新增瀏覽器語言偵測功能並以金色高亮顯示。",
                "【系統】多語言支援擴展：更新公告改為多語言格式，丹藥效果與功法說明文字皆可翻譯。",
                "【數值】修仙系統增強：每等級+1%資源產出，每5等級+1%技能點上限；LV5後需前置功法，LV9需特殊道具。",
                "【天賦】新增輪迴天賦「周天循環·擴」：永久提升技能點上限10%。",
                "【日誌】資源消耗詳情：提升等級時日誌會顯示扣除資源細節 [DEV]。",
                "【平衡】丹藥服用限制：修正 100% 成功率上限與境界數量限制。",
                "【介面】修煉視覺化：新增動態進度條，提升按鈕 TIP 顯示詳細資源需求。",
                "【修復】版本號顯示優化：修復右上角版本號初始化顯示舊版的問題。"
            ],
            "zh-CN": [
                "【功能】境界即时指引优化：新增四个境界提示，使用正确建筑名称与资源说明。",
                "【界面】语言切换器改版：改为平铺按钮布局(EN/TC/SC/JP)，新增浏览器语言检测功能并以金色高亮显示。",
                "【系统】多语言支持扩展：更新公告改为多语言格式，丹药效果与功法说明文字皆可翻译。",
                "【数值】修仙系统增强：每等级+1%资源产出，每5等级+1%技能点上限；LV5后需前置功法，LV9需特殊道具。",
                "【天赋】新增轮回天赋「周天循环·扩」：永久提升技能点上限10%。",
                "【日志】资源消耗详情：提升等级时日志会显示扣除资源细节 [DEV]。",
                "【平衡】丹药服用限制：修正 100% 成功率上限与境界数量限制。",
                "【界面】修炼可视化：新增动态进度条，提升按钮 TIP 显示详细资源需求。",
                "【修复】版本号显示优化：修复右上角版本号初始化显示旧版的问题。"
            ],
            "en": [
                "[Feature] Realm instant hints refined: added four realm guides with correct building names and resource descriptions.",
                "[UI] Language switcher revamped: flat button layout (EN/TC/SC/JP) with browser language detection.",
                "[System] Multilingual support expanded: Release Notes now multilingual; translatable pill/skill descriptions.",
                "[Balance] Cultivation system enhanced: +1% production/level, +1% skill cap/5 levels; requirements added for LV5/LV9.",
                "[Talent] New reincarnation talent 'Celestial Cycle Expansion': permanently +10% skill point cap.",
                "[Log] Resource Deduction: Logs now show resource costs when leveling up with [DEV] tag.",
                "[Balance] Pill Consumption: Added 100% success rate cap and Realm-based count limits.",
                "[UI] Cultivation Visualization: Added real-time progress bar and detailed resource requirements in tooltips.",
                "[Fix] Version Display: Fixed the issue where the version number showed outdated info on start."
            ],
            "ja": [
                "【機能】境界即時ガイドの改善：4つの境界ヒントを追加し、正しい建物名とリソース説明を使用。",
                "【UI】言語切替の刷新：平面ボタン配置(EN/TC/SC/JP)に変更、ブラウザ言語検出機能を実装。",
                "【システム】多言語サポート拡張：リリースノートが多言語対応に、丹薬効果と功法説明が翻訳可能に。",
                "【数値】修仙システム強化：レベルごとに+1%資源生産、5レベルごとに+1%スキルポイント上限；LV5/LV9要件追加。",
                "【天賦】新転生天賦「周天循環・拡」：スキルポイント上限を永久に+10%。",
                "【ログ】資源消費の詳細：レベルアップ時に消費された資源の詳細を [DEV] タグ付きで表示。",
                "【平衡】丹薬服用の制限：渡劫成功率100%時の服用阻止と境界に基づく数量制限を実装。",
                "【UI】修練の視覚化：リアルタイム進度バーを追加し、ボタンのツールチップに詳細な資源要求を表示。",
                "【修正】バージョン表示の最適化：起動時に古いバージョン番号が表示される問題を修正。"
            ]
        }
    },
    {
        version: "v0.2.0",
        date: "2026-01-05",
        notes: {
            "zh-TW": [
                "【系統】統一存檔系統：玩家境界、等級、功法、資源與建築現在合併為一個存檔文件。",
                "【功能】新增「遊戲說明」頁面，詳細介紹遊戲核心機制與資源獲取方式。",
                "【修復】Debug 工具優化：修復了「等級全滿」按鈕失效以及頁面重載導致存檔回滾的錯誤。",
                "【優化】煉製系統提升：優化了合成面板的刷新頻率，批量合成按鈕狀態現在會動態即時更新。",
                "【數值】蘊靈丹效果實裝：服用後立即獲得靈力產出加成，並增加當前境界的修煉進度。",
                "【介面】UI 體驗改進：新增等級提升進度條，所有時間單位統一規範為「祀」。",
                "【穩定】系統穩定性修復：修復了多項由於資源未初始化導致的初始化腳本崩潰問題。"
            ],
            "zh-CN": [
                "【系统】统一存档系统：玩家境界、等级、功法、资源与建筑现在合并为一个存档文件。",
                "【功能】新增「游戏说明」页面，详细介绍游戏核心机制与资源获取方式。",
                "【修复】Debug 工具优化：修复了「等级全满」按钮失效以及页面重载导致存档回滚的错误。",
                "【优化】炼制系统提升：优化了合成面板的刷新频率，批量合成按钮状态现在会动态实时更新。",
                "【数值】蕴灵丹效果实装：服用后立即获得灵力产出加成，并增加当前境界的修炼进度。",
                "【界面】UI 体验改进：新增等级提升进度条，所有时间单位统一规范为「祀」。",
                "【稳定】系统稳定性修复：修复了多项由于资源未初始化导致的初始化脚本崩溃问题。"
            ],
            "en": [
                "[System] Unified Save System: Player Realm, Level, Skills, Resources, and Buildings are now merged into a single save file.",
                "[Feature] Added 'Game Guide' page, detailing core mechanics and resource acquisition.",
                "[Fix] Debug Tool Optimization: Fixed 'Max Level' button failure and save rollback on page reload.",
                "[Improvement] Crafting System: Optimized refresh rate; bulk crafting button status now updates in real-time.",
                "[Balance] Spirit Nurturing Pill Implemented: Grants immediate Spirit Production bonus and cultivation progress upon consumption.",
                "[UI] UX Improvements: Added level-up progress bar; unified all time units to 'Si'.",
                "[Stability] System Stability Fixes: Fixed multiple initialization crashes due to uninitialized resources."
            ],
            "ja": [
                "【システム】セーブデータ統合：境界、レベル、功法、資源、建築が1つのセーブファイルに統合されました。",
                "【機能】「ゲーム説明」ページ追加：ゲームの核心メカニズムと資源獲得方法を詳細に紹介。",
                "【修正】Debugツール最適化：「レベル最大」ボタンの不具合およびリロードによるセーブデータのロールバックを修正。",
                "【改善】錬成システム向上：更新頻度を最適化し、一括合成ボタンの状態がリアルタイムで更新されるようになりました。",
                "【数値】蘊霊丹効果実装：服用後すぐに霊力生産ボーナスを獲得し、現在の境界の修練進行度を増加させます。",
                "【UI】UI体験改善：レベルアップ進行バーを追加し、全ての時間単位を「祀」に統一。",
                "【安定性】システム安定性修正：資源未初期化による初期化スクリプトのクラッシュ問題を多数修正。"
            ]
        }
    },
    {
        version: "v0.1.5",
        date: "2026-01-04",
        notes: {
            "zh-TW": [
                "【功能】新增靈藥煉製子系統，開放基礎丹藥配方。",
                "【系統】新增「合成爆擊」機制，手動或自動合成時有機率獲得 2-3 倍產物。",
                "【介面】日誌系統優化：日誌框移至主介面右上角，並增加自動清理舊日誌的功能以提升性能。"
            ],
            "zh-CN": [
                "【功能】新增灵药炼制子系统，开放基础丹药配方。",
                "【系统】新增「合成爆击」机制，手动或自动合成时有機率获得 2-3 倍产物。",
                "【界面】日志系统优化：日志框移至主界面右上角，并增加自动清理旧日志的功能以提升性能。"
            ],
            "en": [
                "[Feature] Added Alchemy Subsystem with basic pill recipes.",
                "[System] Added 'Crafting Crit' mechanism: Chance to get 2-3x output when crafting manually or automatically.",
                "[UI] Log System Optimization: Moved log box to top-right and added auto-cleanup for better performance."
            ],
            "ja": [
                "【機能】霊薬錬成サブシステム追加：基礎丹薬レシピを解放。",
                "【システム】「合成クリティカル」実装：手動または自動合成時に確率で2-3倍の生産物を獲得。",
                "【UI】ログシステム最適化：ログ枠を右上に移動し、古いログの自動削除機能を追加してパフォーマンスを向上。"
            ]
        }
    },
    {
        version: "v0.1.0",
        date: "2025-12-30",
        notes: {
            "zh-TW": [
                "【核心】修仙問道基礎架構搭建完成。",
                "【系統】實現基礎的資源自動增長與建築升級邏輯。",
                "【境界】開放「練氣期」至「金仙期」共 12 大修仙境界。"
            ],
            "zh-CN": [
                "【核心】修仙问道基础架构搭建完成。",
                "【系统】实现基础的资源自动增长与建筑升级逻辑。",
                "【境界】开放「练气期」至「金仙期」共 12 大修仙境界。"
            ],
            "en": [
                "[Core] Basic infrastructure of Cultivation Tao completed.",
                "[System] Implemented basic resource growth and building upgrade logic.",
                "[Realm] Opened 12 major cultivation realms from 'Qi Refining' to 'Golden Immortal'."
            ],
            "ja": [
                "【コア】修仙問道の基礎アーキテクチャ構築完了。",
                "【システム】基礎的な資源自動増加と建築アップグレードロジックを実装。",
                "【境界】「練気期」から「金仙期」までの12大修仙境界を開放。"
            ]
        }
    }
];
