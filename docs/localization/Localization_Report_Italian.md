# Localization Report — Italian

- **Language:** Italian
- **Locale code:** it
- **File:** `locales/it.json`
- **Date:** 2026-07-25
- **Strings reviewed:** 275 (all keys)
- **Issues found & fixed:** 8 — Critical: 0 · Important: 8 · Polish: 0
- **Key parity:** `it.json` key set is byte-identical to `en.json` — no keys added, removed, or renamed. Only string VALUES changed. Plurals (`runsCount_one`/`_other`) already correct for Italian CLDR; none added.
- **Placeholders / tags:** none of the edited strings contained `{{…}}` placeholders or markup tags; all placeholders and `<terms>`/`<privacy>` tags elsewhere left intact. No brand name (Topside, Dice Drop) was translated.
- **`npm run check-i18n`:** ✅ passes — "All 8 locales match en.json (275 keys)."
- **Simulator:** app inspected running in Italian, with edits hot-reloaded live (home screen, stat cards, and the Premium/IAP modal). All labels fit on one line; the home subtitle change and the IAP modal were verified in place.
- **IAP re-review:** Premium modal verified live — perks (Senza pubblicità · Continua gratis · Tutti i temi e i pacchetti audio · Tutte le animazioni e gli stili dei dadi), primary CTA "Passa a Premium — {{price}}", secondary "O solo Rimuovi pubblicità — {{price}}", "Ripristina acquisto", "Non ora". All native Italian, all within button width. No IAP strings required changes.

---

## a. Summary

The existing Italian file was already high quality — register, tone, and the vast majority of strings are correct and natural. The only systematic problem was **terminology drift from the App Store listing** on the game's two most important nouns/verbs:

- **merge** — the in-app copy used **fondere / fusione** (literally "to melt / fuse / weld"), the exact non-gaming literalism to avoid. The App Store listing consistently uses **unire / unisci / unione**.
- **board** — the in-app copy mixed **tabellone** with **campo**; the App Store listing (and the app's own All-Clear splash, "Campo libero!") uses **campo** throughout.

All 8 changes bring the in-app copy in line with the store listing and make the terminology internally consistent.

---

## b. Terminology decisions

| Concept | Chosen Italian term | Rationale |
|---|---|---|
| merge (verb/noun) | **unire / unisci / unione** | Matches the App Store description verbatim ("Unisci i dadi", "si uniscono nel numero successivo", "ogni unione in più"). Standard verb in Italian localizations of merge/number games (2048, Merge-style titles). Replaces **fondere/fusione**, which means "to melt/fuse" and carries no puzzle-game connotation — a native player would not expect it on a merge board. **Matches store copy.** |
| board / playfield | **campo** | Matches the store description ("Il campo si riempie", "Svuota tutto il campo per il bonus Campo Libero") and the app's own splash `game.allClearLine` = "Campo libero!". Replaces the inconsistent **tabellone**. **Matches store copy.** |
| drop | **(far) cadere / caduta** | Unchanged — already consistent with store ("i dadi che cadono", "far cadere il pezzo"). |
| chain reaction | **reazione a catena / catena** | Unchanged — already matches store. |
| high score / best | **record / migliore** | Unchanged — `newBest` = "Nuovo record!", HUD/label "MIGLIORE"; genre-standard. |
| all clear | **Campo libero** | Unchanged — matches store bonus name "Campo Libero". |
| continue (noun) | **continua** | Unchanged — kept the Italian noun the app already uses (`continua`) rather than the English loanword; see Store-copy deviations. |

---

## c. Changes (only strings that changed)

| Key path | Before | After | Severity | Reason |
|---|---|---|---|---|
| `home.subtitle` | Un gioco di caduta e **fusione**. | Un gioco di caduta e **unione**. | Important | Merge term; align with store. Verified it fits on one line in the sim. |
| `leaderboard.info.scoringDesc` | — **fondere** i dadi fa guadagnare punti … svuotare l'intero **tabellone** … | — **unire** i dadi fa guadagnare punti … svuotare l'intero **campo** … | Important | Merge + board terms; align with store ("Svuota tutto il campo"). |
| `game.tutorial.objMerge` | I dadi uguali **si fondono** nel valore successivo | I dadi uguali **si uniscono** nel valore successivo | Important | Merge term; matches store phrasing "si uniscono nel numero successivo". |
| `game.tutorial.objSixes` | **Fondi** i sei per toglierli dal **tabellone** … | **Unisci** i sei per toglierli dal **campo** … | Important | Merge + board terms; align with store ("Unisci i 6", "dal campo"). |
| `howToPlay.rules.mergeTitle` | **Fondi** valori uguali | **Unisci** valori uguali | Important | Merge term; section title for the core mechanic. |
| `howToPlay.rules.mergeBody` | … dello stesso valore **si fondono** in un dado … | … dello stesso valore **si uniscono** in un dado … | Important | Merge term; align with store. |
| `howToPlay.rules.sixesBody` | **Fondi** due o più sei per rimuoverli dal **tabellone** … | **Unisci** due o più sei per rimuoverli dal **campo** … | Important | Merge + board terms. |
| `howToPlay.rules.chainsBody` | **Una fusione** può innescarne altre … | **Un'unione** può innescarne altre … | Important | Merge term (noun); align with store ("ogni unione in più"). |

---

## d. Plural / structural flags

None. The only count-driven string is `leaderboard.runsCount`, which already has the correct Italian CLDR forms (`_one`, `_other`) and matches `en.json` key-for-key. Italian needs no additional plural categories (`few`/`many`) for this key. No structural changes required.

---

## e. Store-copy deviations

Deliberate, documented differences between the in-app copy and the attached App Store listing:

1. **"continue" (the extra-life feature).** The store listing uses the English loanword — "continue gratis" (NoAds_Desc) and "continua senza limiti" (Premium_Desc). In-app keeps the Italian noun **"continua"** everywhere (`premium.perkFreeContinues` = "Continua gratis"; `leaderboard.info` = "un continua"). Reason: the app already standardized on the Italian word and it reads more natively than an English loanword in short UI slots. *Recommendation: consider updating the store listing's "continue gratis" → "continua gratis" for consistency.*

2. **Home subtitle wording.** In-app `home.subtitle` = "Un gioco di caduta e unione." keeps the "Un gioco di …" descriptor frame (parallel to the English source "A drop and merge game." and the other locales), rather than the store's promotional sentence "Unisci i dadi che cadono." Reason: the subtitle sits under the logo as a genre descriptor, not a marketing line; the imperative promo sentence would not fit that slot's function. Terminology ("unione") is aligned; only the sentence shape differs by design.

---

## f. Open questions

1. **`leaderboard.renameModal.shuffle` = "Altro".** This button re-rolls a random display name. "Altro" ("another/more") is short and functional, but the store "What's New" copy describes the action as "mischia" ("shuffle"). Left as "Altro" (Polish-level); if the team prefers alignment with the store verb, "Mischia" is a drop-in alternative. Could not fully confirm the button's on-screen width, as the rename modal was not reached in this pass — but both candidates are short and low-risk.
