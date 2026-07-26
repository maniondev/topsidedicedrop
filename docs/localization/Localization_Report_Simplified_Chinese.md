# Localization Review — Simplified Chinese

- **Language:** Simplified Chinese
- **Locale code:** `zh-Hans`
- **File:** `locales/zh-Hans.json`
- **Date:** 2026-07-25
- **Strings reviewed:** 275 keys (all)
- **Issue counts:** Critical 0 · Important 4 · Polish 1
- **Build check:** `npm run check-i18n` **passes** — all 8 locales match en.json (275 keys); `zh-Hans` key set is byte-identical to en.json (no keys added/removed/renamed).

## Self-check confirmation

- ✅ Key set in `zh-Hans.json` identical to en.json — no keys added, removed, or renamed.
- ✅ Every placeholder preserved (`{{score}}`, `{{count}}`, `{{price}}`, `{{theme}}`, `{{mode}}`, `{{title}}`) — same count, spelling, case. None of the five edited strings contain a placeholder, so none were touched.
- ✅ Every tag pair intact and unmodified (`<terms>…</terms>`, `<privacy>…</privacy>`) — not in any edited string.
- ✅ No brand name translated — `Topside`, `Dice Drop` remain Latin script throughout (e.g. `premium.allInTitle`, `settings.about.rate`, `themeNames.dicedrop`, `soundtrackNames.classic`).
- ✅ Before/after values below match the file exactly.

## Starting state

`zh-Hans.json` arrived **already fully translated** into fluent Simplified Chinese (272 of 275 values differed from English; the 3 matches are brand strings/placeholder-only strings that correctly stay in English: `themeNames.dicedrop` = "Dice Drop", `soundtrackNames.classic` = "Dice Drop", `premium.titlePrice` = "{{title}} — {{price}}"). The existing translation is high quality — this pass is a consistency-and-precision edit, not a rewrite. Screens were verified in the iOS Simulator (app language set to 简体中文): Home, Settings, Stats/Leaderboard, and the How-to-Play modal all render cleanly with no overflow.

## Terminology decisions

| Concept | Chosen term | Rationale |
|---|---|---|
| merge | **合成** | The app's own How-to-Play copy already uses 合成 consistently (合成相同数值 / 合成…六点 / 一次合成可能引发更多合成), and the store description uses 合成 / 合而为一. 合成 is the genre-standard merge verb (合成大西瓜, Suika-style, 2048 合成). Two tutorial strings still used the variant 合并 — standardized to 合成. **Matches store copy.** |
| continue (revive after game-over) | **续玩** | Distinct from "resume". The premium perk `perkFreeContinues` = 免费续玩 and the leaderboard explainer says 使用续玩之前完成. The two game-over revive buttons were generic 继续 — changed to 续玩 so the button label matches the mechanic's name everywhere. **Matches store copy** ("解锁免费续玩"). |
| resume (from pause) | **继续** | Kept — genuinely "resume the current game", correctly separated from 续玩 (revive). `game.resume`, `home.continue`, `home.newGameConfirm.continueSaved` all stay 继续. |
| die / dice | **骰子** | Consistent throughout; matches store keywords (骰子). |
| board | **棋盘** | Consistent; store uses 棋盘/盘面 interchangeably, app settled on 棋盘. |
| chain (reaction) | **连锁** | Consistent (制造连锁 / 连锁反应); matches store (连锁反应). |
| clear (sixes / board) | **消除** | Consistent; matches store keyword 消除 and 全消. |
| all clear | **全消** | `game.allClearLine1` = 全消; matches store copy's 「全消」bonus wording. |
| unassisted | **无助攻** | Kept — 助攻 (assist) is idiomatic Chinese gaming vocabulary; used consistently across home tile, leaderboard filter (无助攻游戏) and per-run tag (无助攻). Reads clearly in the Stats screen. |
| best (game-side label) | **最佳** | Home tiles, HUD, game-over all use 最佳 — kept consistent. |
| high score (leaderboard stat) | **最高分** | `leaderboard.stats.bestScore` — the idiomatic noun for "high score"; left as the leaderboard-side term (see Open questions for the 最佳/最高 split note). |

## Changes

| Key path | Before | After | Severity | Reason |
|---|---|---|---|---|
| `game.tutorial.objMerge` | 相同点数的骰子会**合并**成更大点数 | 相同点数的骰子会**合成**为更大点数 | Important | Merge-term consistency: align to 合成 (used in How-to-Play & store). |
| `game.tutorial.objSixes` | **合并** 6 点可将其从棋盘消除并获得额外分数 | **合成** 6 点可将其从棋盘消除并获得额外分数 | Important | Same 合并→合成 standardization. |
| `game.continue` | 继续 | 续玩 | Important | Game-over revive button; match the mechanic term 续玩 (免费续玩 / 使用续玩之前), and disambiguate from 继续 = "resume". |
| `game.continueAd` | ▶ 继续 | ▶ 续玩 | Important | Same — the ad-continue revive button. |
| `home.stats.bestOverall` | 最佳（**总**） | 最佳（**综合**） | Polish | 综合 ("overall") reads more naturally than the terse （总）and pairs better with the sibling tile 最佳（无助攻）. Verified it still fits the tile in the Simulator. |

## Plural / structural flags

- `leaderboard.runsCount_one` / `leaderboard.runsCount_other` — both present (required for key parity with en.json) and both currently `"{{count}} 局"`. **No action needed and none should be taken.** Simplified Chinese has only the CLDR `other` category, so i18next always resolves `_other`; the identical `_one` sibling is inert but must stay for parity with en.json. Correct as-is.
- No other keys require plural forms in zh-Hans.

## Store-copy deviations

- **Store "Chinese" marketing text is Traditional Chinese, not Simplified.** The attached listing's Title/Subtitle/Promo/Description/Keywords for the Chinese row are written in **Traditional** script (療癒數字合成益智遊戲, 兩個 1 合成 2, 棋盤, 拼圖, 俄羅斯方塊), while only the IAP fields (Custom/Premium/NoAds) are **Simplified** (自定义, 高级版, 移除广告). The in-app locale is Simplified (`zh-Hans`). Terminology was aligned to the store *after* converting script (合成, 骰子, 棋盘, 消除, 全消, 连锁反应 all match). **Flag for the team:** the App Store / Play listing likely needs a dedicated Simplified-Chinese (zh-Hans) entry — the current Chinese listing body would show Traditional characters to Simplified users. (Not an in-app change; noted here because it affects store↔app continuity.)
- `home.subtitle` in-app is 一款下落合成游戏 ("a drop-and-merge game", mirroring the English tagline), whereas the store subtitle is 数字合成益智游戏 ("a number merge puzzle"). Kept the app tagline as-is — it matches the English source line under the logo and reads well; both use 合成 so they're continuous in the key term. No change recommended, listed only for visibility.

## Open questions

- **"best" split (最佳 vs 最高分/最高):** the game side uses 最佳 (home tiles, HUD, game-over) and the leaderboard/social side uses 最高分 (`leaderboard.stats.bestScore`) and 最高 (`findPlayer.best`). Both are correct native Chinese and the split is contextually coherent (gameplay vs. leaderboard), so it was left as-is rather than force-unified. If the team wants a single term everywhere, recommend 最高分 for score contexts and note it would touch 5 additional keys. No blocking issue.
- Several deep screens (in-game HUD, Pause modal, Game-Over modal, Premium modal, Rename modal, Find-Players) were reviewed from JSON + source usage rather than live capture — their strings are short standard labels/prose with no placement ambiguity, and the reachable screens (Home, Settings, Stats, How-to-Play) confirmed the layout comfortably fits Chinese text (which is more compact than English). No overflow risk identified.
