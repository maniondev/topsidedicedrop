# Localization Report — Japanese (ja)

- **Language:** Japanese
- **Locale code:** `ja`
- **Date:** 2026-07-25
- **Strings reviewed:** 275 keys (full file)
- **Issues by severity:** Critical 0 · Important 15 · Polish 1  (16 strings changed across two passes: terminology/consistency + IAP native-Japanese review)
- **`npm run check-i18n`:** ✅ passes — `[ja] ✓ 275 keys`, all 8 locales match en.json (275 keys). Key set byte-identical to en.json (no keys added/removed/renamed); all placeholders and `<terms>`/`<privacy>` tags intact; no brand name translated.

The existing Japanese localization was already strong and natural — this pass is a **terminology-consistency and store-alignment** pass, not a rewrite. The dominant finding: the core game verb **"merge"** was translated as **合体** everywhere in-app, while the live App Store copy uses **合成** everywhere. Unifying on the store term removes an app↔store discontinuity a player hits immediately after install, and along the way fixes two smaller internal splits (ダイス/サイコロ, ボード/盤面).

Verified live in the iOS Simulator (device language Japanese): home subtitle and the full 遊び方 (How to Play) modal render with no overflow and read naturally.

---

## a. Terminology decisions

| Concept | Chosen JA term | Rationale |
|---|---|---|
| merge (verb/mechanic) | **合成** | Standard term for number-merge / 2048-style titles; matches store copy verbatim (`サイコロ合成パズル`, `6同士を合成すると`). App previously used 合体 (a "bodies-unite" nuance, à la Suika Game) inconsistently against the store. Unified on 合成 → **zero** store deviations on the core verb. |
| dice / a die | **サイコロ** | Everyday word; warmer for a cozy casual game than the loanword ダイス. Matches store body copy and the majority of in-app usage. Removed 2 stray ダイス. |
| board | **盤面** | Matches store copy and the majority of in-app usage. Removed 1 stray ボード. |
| chain | **連鎖** | Already consistent app-wide and with store. Unchanged. |
| multiplier | **倍率** | Already consistent with store (`倍率が最大3×`). Unchanged. |
| leaderboard / ranking | **ランキング** | Already consistent with store (`ランキングで上を目指す`). Unchanged. |
| unlock (content/premium) | **解放** | Native gaming standard for unlocking content; matches store verbatim (`全解放`, `解放できます`, `解放されます`). App previously used the loanword **アンロック** throughout the IAP flow — replaced everywhere. Bonus: 解放 (2 chars) is shorter than アンロック (4), so buttons/banner fit better. |
| animations (marketing/perk) | **アニメ** | Store abbreviates アニメーション→アニメ in dense copy (`アニメを全解放`). Used it in the paywall perk bullet to stop an awkward line-wrap (`スタ`/`イル`). The settings-row label `animationPack` keeps the full **アニメーションパック** (a labeled row with ample space). |
| product (purchase error) | **商品** | Replaced the RevenueCat-ism **パッケージ** in an error string — 商品 is the native, shopper-facing word. |
| score / high score | **スコア / ベスト** | Already consistent. Unchanged. |
| continue (revive after game over) | **コンティニュー** (feature noun) / **つづける** (button verb) | Kept the existing split — info text names the feature コンティニュー (arcade convention), buttons use the friendly verb つづける. Common, acceptable pattern. Unchanged. |

Genre references drawn from: **Suika Game (スイカゲーム)**, **2048** Japanese listings, and general merge/puzzle store conventions. Both 合成 and 合体 appear across the genre; the tiebreaker was store continuity (the brief's strong store-alignment directive) plus 合成's better fit for a *number*-merge mechanic.

---

## b. Changes

All changes are Important (terminology consistency + store alignment) except one Polish (register). No placeholder, tag, or key changes.

| Key path | Before | After | Severity | Reason |
|---|---|---|---|---|
| `home.subtitle` | 落として合体させるゲーム。 | 落として合成するゲーム。 | Important | Unify merge→合成; also drops the slightly stiff causative 合体させる for cleaner 合成する. |
| `game.tutorial.objMerge` | 同じ数字の**ダイス**は**合体**して次の数字に | 同じ数字の**サイコロ**が**合成**されて次の数字に | Important | Unify dice→サイコロ, merge→合成; passive 合成されて reads more naturally for describing dice behavior. |
| `game.tutorial.objSixes` | 6同士を**合体**させると**ボード**から消えてボーナス点 | 6同士を**合成**すると**盤面**から消えてボーナス点 | Important | Unify merge→合成, board→盤面; now matches store copy almost verbatim. |
| `game.tutorial.objSurvive` | 新しい**ダイス**を置く場所がなくなるとゲームオーバー | 新しい**サイコロ**を置く場所がなくなるとゲームオーバー | Important | Unify dice→サイコロ. |
| `howToPlay.rules.mergeTitle` | 同じ数字を**合体** | 同じ数字を**合成** | Important | Unify merge→合成. |
| `howToPlay.rules.mergeBody` | …1つ上の数字のサイコロに**合体します**：1+1→2… | …1つ上の数字のサイコロに**合成されます**：1+1→2… | Important | Unify merge→合成; passive 合成されます is more idiomatic here. |
| `howToPlay.rules.sixesBody` | 6を2つ以上**合体させて**盤面から消すと…スペースを空ける**最善の**方法です。 | 6を2つ以上**合成して**盤面から消すと…スペースを空ける**一番の**方法です。 | Important / Polish | Unify merge→合成; 最善→一番 softens register to fit the cozy casual tone. |
| `howToPlay.rules.chainsBody` | サイコロが落ち着く際に、**合体がさらなる合体を引き起こす**ことがあります。連鎖が長いほど、スコア倍率が大きくなります。 | サイコロが落ち着くと、**ひとつの合成が次の合成を呼ぶ**ことがあります。連鎖が長いほど、スコア倍率が大きくなります。 | Important | Unify merge→合成 and rewrite the abstract "合成が合成を引き起こす" into natural "ひとつの合成が次の合成を呼ぶ"; 際に→と for a friendlier register. |
| `leaderboard.info.scoringDesc` | — サイコロを**合体させる**と得点でき… | — サイコロを**合成する**と得点でき… | Important | Unify merge→合成. |
| `home.unlockBanner` | サウンドパック、テーマなどを**アンロック** | サウンドパック、テーマなどを**解放** | Important | Loanword→native 解放; store-aligned; shorter, better banner fit. Verified in-sim. |
| `settings.premium.unlockCustomization` | カスタマイズを**アンロック** | カスタマイズを**解放** | Important | Loanword→native 解放; store-aligned. |
| `settings.premium.unlockPremium` | プレミアムを**アンロック** | プレミアムを**解放** | Important | Loanword→native 解放; store-aligned. |
| `premium.customizationTitle` | カスタマイズを**アンロック** | カスタマイズを**解放** | Important | Loanword→native 解放; store-aligned. |
| `premium.everythingUnlocked` | すべて**アンロック済み**です！ | すべて**解放済み**です！ | Important | Loanword→native 解放; store-aligned. |
| `premium.perkDiceAnims` | すべてのサイコロ**アニメーション**とスタイル | すべてのサイコロ**アニメ**とスタイル | Important | Store-style アニメ abbreviation; fixes an awkward paywall line-wrap. Verified in-sim (now one line). |
| `premium.noPackage` | **パッケージ**が見つかりません。後でもう一度お試しください。 | **商品**が見つかりません。後でもう一度お試しください。 | Important | RevenueCat-ism→native shopper-facing 商品 in a purchase error. |

Confirmed native/standard and left unchanged in the IAP flow: `アップグレード` (standard IAP verb), `コンティニュー` (arcade-convention revive term), `購入を復元` / `復元`, `コードを利用` (matches Apple/Google JP wording), `広告削除のみ` / `すべての広告を削除`, `プレミアム有効`, `カスタマイズ` / `プレミアム` / `サウンドパック` (established feature loanwords, also used in the store copy).

---

## c. Plural / structural flags

None. Japanese has no count-based plural distinction (CLDR category: `other` only). The one pluralized base key, `leaderboard.runsCount`, correctly mirrors en.json's `_one`/`_other` siblings with identical values (`{{count}}ゲーム`) — this is required for key parity and is correct Japanese. No new plural forms proposed.

---

## d. Store-copy deviations

**None.** The pass intentionally moves in-app wording *toward* the store copy (合成 / サイコロ / 盤面), so there are no remaining deliberate divergences. The App Store listing and the app now share the same core vocabulary.

---

## e. Open questions

1. **`game.allClearLine1` / `game.allClearLine2`** — left unchanged as `全消し！` / `` (empty). The English splits the celebration across two lines (`All` / `Clear!`); the Japanese puts the whole punchy label on line 1 and leaves line 2 empty. `全消し` is the correct term (matches the store's `全消しボーナス`). I could not trigger an in-game All Clear to confirm the two-line layout renders without an awkward vertical gap. If the layout reserves two equal lines, a nicer fill would be `全消し` / `ボーナス！` (also matches the store term `全消しボーナス`). Recommend a quick visual check the next time an All Clear is reachable in a dev build; low risk either way.
