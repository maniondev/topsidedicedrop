# Localization Report — Korean (한국어)

- **Language:** Korean
- **Locale code:** `ko`
- **File:** `locales/ko.json`
- **Date:** 2026-07-25
- **Strings reviewed:** 275 (full key set) — includes a dedicated pass over the IAP/premium module (`common.restore*`, `common.redeemCode`, `settings.premium.*`, `home.removeAds`/`unlockBanner`, all of `premium.*`)
- **Issues by severity:** Critical 0 · Important 2 · Polish 2
- **`npm run check-i18n`:** ✅ passes — `[ko] ✓ 275 keys`, all 8 locales match en.json (275 keys)

## Self-check
- ✅ Key set identical to en.json — no keys added, removed, or renamed.
- ✅ Every placeholder present with identical spelling/case (`{{score}}`, `{{price}}`, `{{title}}`, `{{theme}}`, `{{count}}`, `{{mode}}`); the one edit touched a string with no placeholders.
- ✅ All tags intact and unmodified (`<terms>…</terms>`, `<privacy>…</privacy>` in `howToPlay.consent`; numbered tags — none in this file).
- ✅ No brand name translated — `Topside` / `Dice Drop` remain Latin script everywhere (`themeNames.dicedrop`, `soundtrackNames.classic`, `settings.about.rate`, `premium.allInTitle`, `review.title`).
- ✅ Before/after values below match the file exactly.

---

## Summary

The existing Korean bundle is high quality — professionally translated, consistent terminology, and it renders without overflow across every screen I could reach in the simulator (home, HUD, pause, game-over, stats, leaderboard, leaderboard-info, and the premium/IAP modal). Four strings were improved (one ambiguous pause label + three in the IAP module); everything else was verified correct in place and left untouched. I did not manufacture changes.

**IAP/premium module** got a dedicated line-by-line pass, since most of it (error dialogs, restore/redeem flows) can't be triggered in the simulator. What's correct and confirmed: the store-facing terms are right — **구매 복원** (Restore Purchases), **코드 사용** (Redeem Code, matching Apple's KR button label), and the Android redeem path **결제 및 정기 결제 > 코드 사용** matches Google Play's actual Korean menu. The brand stays Latin in `allInTitle` (`Topside: Dice Drop 프리미엄`), all four perks and the price strings (`upgradePrice`, `orCustomization`, `orRemoveAds`) render cleanly with placeholders intact, and `everythingUnlocked` / `notNow` / `close` / `restorePurchase` are all natural. The three fixes below were the only spots where the wording was literal or ambiguous rather than native.

Screens verified in the simulator (device language = Korean): Home, in-game HUD, **Pause modal**, Game Over modal, Stats (내 통계), Leaderboard (순위표) + filters + stat cards, Leaderboard Info modal, Premium/IAP modal. All labels fit their controls.

---

## a. Terminology decisions

Genre references for the Korean market: top merge/drop-and-merge and block puzzles — **2048**, **1010!(텐텐)**, **우드블록 퍼즐 (Wood Block)**, and drop-merge titles. These set the expected vocabulary below.

| Concept | Chosen Korean term | Rationale / store alignment |
|---|---|---|
| die / dice | 주사위 | Standard; matches store copy. |
| merge | 합치기 / 합치다 (합쳐) | Genre-standard for 2048-style merges; **matches store** ("6끼리 합치면…"). Avoids literal 융합/결합 which read as chemical "fusion." |
| drop | 떨어뜨리다 / 내려놓다 | Matches store ("떨어지는 주사위"). |
| board | 보드 | Loanword is the genre norm; **matches store**. |
| chain (reaction) | 연쇄 | **Matches store** ("연쇄"). |
| continue | 이어하기 | **Matches store** ("무제한 이어하기"); standard KR term for a revive/continue. |
| All Clear (bonus) | 올클리어! | **Matches store** ("올클리어! 보너스"). |
| unassisted (run) | 도움 없음 / 도움 없는 게임 | Consistent app-internal pairing: short badge = 도움 없음, full term/filter = 도움 없는 게임. Reads as "no-assist." |
| leaderboard | 순위표 | Clean native term, used consistently app-wide. **Diverges from store's 랭킹** — see (e). |
| best / high score | 최고 / 최고 점수 | Consistent throughout. |
| rank | 순위 | Verified on leaderboard card. |
| swipe | 스와이프 | Standard in KR game tutorials; app-internally consistent. **Store uses 밀어** — see (e). |
| tap / rotate | 탭 / 회전 | Matches store. |
| customize | 커스터마이즈 | **Matches store** ("커스터마이즈"). |
| resume (from pause) | 계속하기 | Changed this pass — see (c). |

---

## c. Changes

| Key path | Before | After | Severity | Reason |
|---|---|---|---|---|
| `game.resume` | `▶  다시 시작` | `▶  계속하기` | Important | "다시 시작" is the standard Korean phrase for **Restart / Start over**. On a pause-menu Resume button (verified in the simulator, sitting directly above 저장 후 종료 / 저장하지 않고 종료), it's genuinely ambiguous — a player can read it as "restart from scratch." The app already uses **계속하기** consistently for continue/resume (`home.continue`, `game.continue`, `game.continueAd`), so this aligns the concept and removes the ambiguity. The `▶` + double-space prefix is preserved byte-for-byte; "계속하기" is the same length class as the home Continue button and fits the modal with room to spare. |
| `premium.noPackage` | 패키지를 찾을 수 없습니다. 나중에 다시 시도해 주세요. | 상품을 불러올 수 없습니다. 나중에 다시 시도해 주세요. | Important | **패키지** is RevenueCat developer-jargon; to a Korean player it reads as "package/bundle" (and could even suggest a missing bundle *deal*). **상품** is the standard KR e-commerce word for a purchasable item. This fires when the offering fails to load, so **불러올 수 없습니다** ("couldn't load") matches the "try again later" intent better than 찾을 수 없습니다 ("not found"). |
| `premium.redeemErrorBody` | 사용 화면을 열 수 없습니다. App Store에… | 코드 사용 화면을 열 수 없습니다. App Store에… | Polish | "사용 화면" ("use screen") is ambiguous on its own. Qualifying it as **코드 사용 화면** ties it to the app's own redeem term (`premium.redeemTitle` / `common.redeemCode` = 코드 사용) and makes the message unmistakable. Rest of the string unchanged; `App Store` kept Latin. |
| `premium.restoreTitle` | 복원됨! | 복원 완료! | Polish | The "-됨!" form reads like a terse system flag with a bolted-on exclamation. **복원 완료!** is the natural celebratory success-dialog title in Korean (Apple's own KR UI uses the 완료 form). Paired body `restoreBody` ("구매가 복원되었습니다.") is already natural and left as-is. |

---

## d. Plural / structural flags

**None required.** Korean's CLDR plural set is `other`-only (no grammatical number agreement). The single count-driven base key, `leaderboard.runsCount`, already ships both siblings that en.json defines (`runsCount_one` / `runsCount_other`), both correctly set to `{{count}}게임` — Korean does not inflect the noun, so identical values are correct and grammatical for every value of `{{count}}`. No other `{{count}}`-driven strings exist in en.json. No structural changes needed.

---

## e. Store-copy deviations

| Area | App wording | Store copy | Decision / reason |
|---|---|---|---|
| Leaderboard | 순위표 (title, tab, info modal, throughout) | 랭킹 | **Keep 순위표.** It's clean, native, unambiguous, and already consistent across every leaderboard surface in the app. 랭킹 (loanword) is also common in the market, so this is a defensible split — flagged so the team can decide whether to bring the store listing to 순위표, or (if 랭킹 is preferred for ASO) leave the two intentionally different. Not worth rewriting 8+ in-app instances to chase a marketing keyword. |
| Controls | 스와이프 (tutorial, howToPlay) | 밀어 (밀다) | **Keep 스와이프.** App is internally consistent, and 스와이프 is the conventional term in Korean mobile-game tutorials. 밀어 is fine in prose but less standard as a control verb. Minor; documented for awareness. |
| Premium heading (brand) | `Topside: Dice Drop 프리미엄` (brand in Latin) | Store description transliterates the brand in its heading: 【다이스 드롭 프리미엄】 | **App is more correct** per the brand-name rule (Topside / Dice Drop stay Latin). Flagged so the **store listing** can be corrected to keep the brand in Latin script rather than transliterating it. |

---

## f. Open questions

- **`settings.theme.matched` = "{{theme}}에 맞춤"** — could not reach the theme-customization "Matched to {{theme}}" state in the simulator without owning Premium (the theme-match toggle sits behind the paywall). The string is acceptable as-is ("Matched to {{theme}}"), and its subtitle `matchedSub` ("사운드, 주사위, 효과가 모두 일치") clarifies it, so no change was made. If the team can confirm it renders as a status headline (not a button), it's fine; if it functions as a toggle label, consider "{{theme}}에 맞춰짐" for a clearer "has been matched" reading. Left unchanged pending that confirmation.
