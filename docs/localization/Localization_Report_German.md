# Localization Report — German (de)

- **Language / locale:** German — `de`
- **Date:** 2026-07-25
- **File edited:** `locales/de.json`
- **Strings reviewed:** 275 keys (full file)
- **Issues by severity:** Critical 0 · Important 7 · Polish 0
- **`npm run check-i18n`:** ✅ passes — `de` matches `en.json` at 275 keys; all placeholders/tags intact.

## Self-check

- Key set identical to `en.json` — no keys added, removed, or renamed. ✅ (check-i18n)
- Every placeholder present, same count/spelling/case. ✅ (only `{{score}}`-bearing string touched was `scoringDesc`, which carries no placeholder; no placeholder string was altered)
- All tag pairs (`<terms>`, `<privacy>`) intact and unmodified. ✅ (none were in the edited strings)
- No brand name translated — `Topside`, `Dice Drop` left as-is. ✅
- Before/after values below match the file exactly. ✅

The existing German translation was already professional-grade. This pass is a targeted consistency + store-alignment cleanup, not a rewrite. Every screen referenced below was confirmed live in the iOS Simulator with the device set to Deutsch (Home, Stats, in-game HUD, pause, quit-confirm, and rename modal).

---

## a. Terminology decisions

| Concept | Chosen German term | Rationale |
|---|---|---|
| merge (verb/noun) | **verschmelzen / Verschmelzung** | Genre-standard for merge mechanics in German (Merge Dragons, 2048-style titles all use *verschmelzen*); more evocative than *kombinieren*. The file mixed *verschmelzen* and *kombinieren* — unified to *verschmelzen*. **Matches store copy** (subtitle "Würfel verschmelzen…", body "jede weitere Verschmelzung"). |
| board | **Spielfeld** | The file mixed *Board* (English loanword), *Brett*, and no *Spielfeld*. Unified to *Spielfeld*, the natural German term for a puzzle play area. **Matches store copy** (used consistently: "Das Spielfeld füllt sich"). |
| die/dice | **Würfel** | Already consistent; unchanged. Matches store. |
| chain | **Kette / Kettenreaktion** | Already consistent; unchanged. Matches store. |
| drop | **fallen (lassen) / Fallen** | Already consistent; unchanged. Matches store ("Die Steine fallen"). |
| score | **Punkte / Punktzahl** | Already consistent; unchanged. Matches store. |
| continue (revive) | **Fortsetzung / Fortsetzen** | Already consistent; unchanged. Matches store's "Fortsetzungen". |
| all clear | **Alles weg** | Already consistent; unchanged. Matches store's "Alles-weg-Bonus". |
| high score / best | **Beste** (labels) + **Rekord** (celebration) | Left as-is intentionally — see Open Questions. |

---

## b. Changes

| Key path | Before | After | Severity | Reason |
|---|---|---|---|---|
| `home.subtitle` | `Ein Fall- und Kombinierspiel.` | `Fallen lassen und verschmelzen.` | Important | Removes the last *kombinier-* holdout so merge = *verschmelzen* everywhere; the old noun-compound "Kombinierspiel" was clunky. New tagline is punchier and echoes the store subtitle's verb style. Verified single-line fit under the logo. |
| `leaderboard.renameModal.shuffle` | `Anderer` | `Mischen` | Important | "Anderer" (a bare, gender-marked "another") is an incomplete, weak button label. "Mischen" reads as *shuffle*, pairs naturally with the ⇄ icon, and matches the store's whats-new wording ("mische, bis du einen findest"). |
| `leaderboard.info.scoringDesc` | `…das Kombinieren von Würfeln bringt Punkte… das Leeren des gesamten Boards…` | `…das Verschmelzen von Würfeln bringt Punkte… das Leeren des gesamten Spielfelds…` | Important | Two term fixes in one string: merge → *verschmelzen*, board → *Spielfeld*. |
| `game.tutorial.objSixes` | `Sechser verschmelzen, um sie vom Brett zu räumen — für Extrapunkte` | `Sechser verschmelzen, um sie vom Spielfeld zu räumen — für Extrapunkte` | Important | board → *Spielfeld* (was the lone *Brett*). |
| `howToPlay.rules.mergeTitle` | `Gleiche Werte kombinieren` | `Gleiche Werte verschmelzen` | Important | merge → *verschmelzen*. This is the rules screen's merge heading; must match the term used in the tutorial and store. |
| `howToPlay.rules.sixesBody` | `Kombiniere zwei oder mehr Sechsen, um sie für einen großen Bonus vom Board zu entfernen…` | `Verschmilz zwei oder mehr Sechsen, um sie für einen großen Bonus vom Spielfeld zu entfernen…` | Important | merge → *verschmelzen* (imperative *Verschmilz*), board → *Spielfeld*. |
| `howToPlay.rules.chainsBody` | `Eine Kombination kann weitere auslösen, während sich die Würfel setzen…` | `Eine Verschmelzung kann weitere auslösen, während sich die Würfel setzen…` | Important | merge → *verschmelzen*. "Eine Verschmelzung kann weitere [Verschmelzungen] auslösen" keeps the chain concept consistent. |

---

## c. Plural / structural flags

None required. German CLDR needs only `one` / `other`. The only count-driven string, `leaderboard.runsCount`, already ships `runsCount_one` / `runsCount_other` (matching `en.json`) and is grammatically correct ("{{count}} Spiel" / "{{count}} Spiele"). No other `{{count}}`-driven strings exist, so no new plural siblings are proposed.

---

## d. Store-copy deviations

| Item | App (in-game) | Store listing | Decision / reason |
|---|---|---|---|
| leaderboard | **Rangliste** (used ~8×, e.g. `leaderboard.leaderboard`, `surviveBody`, `resetConfirmBody`) | **Bestenliste** | **Kept Rangliste.** It's already 100% consistent app-wide and is the standard German term for a competitive *ranked* leaderboard; changing 8 strings for parity with one store word isn't worth the churn. Flagging so the team can decide whether to switch the store listing to "Rangliste" for continuity. |
| home subtitle | **Fallen lassen und verschmelzen.** | Subtitle: **Würfel verschmelzen & knobeln** | Not a term conflict — both use *verschmelzen*. Different slot (marketing subtitle vs. under-logo tagline); the store sentence is longer and wouldn't fit the tagline slot. Aligned on the key term. |
| run (a play session) | **Spiel** (`lastRun` "LETZTES SPIEL", `bestRun` "BESTES SPIEL", `totalRuns` "SPIELE GESAMT", `runsCount` "{{count}} Spiele") | store body uses **Runde** ("Die Runde endet…") | **Kept Spiel.** It's consistent across the app and reads naturally in every stat label; contextually unambiguous even though *Spiel* also = "game". Noting the store's *Runde* so the team is aware of the split; not worth re-terming the app. |

---

## e. Open questions

1. **"Best" family (Beste vs. Rekord).** The file uses *Beste* for persistent labels (HUD `BESTE`, stat cards `BESTE …`, `BESTE PUNKTZAHL`) and *Rekord* for the celebratory game-over pair (`newBest` "Neuer Rekord!", `previousBest` "Vorheriger Rekord: {{score}}"). Verified in the Simulator that these never collide within a single screen state, and every label fits without overflow (HUD `BESTE`, `NÄCHSTE` confirmed). Left as-is — the split reads as intentional (label vs. celebration). Flagging only in case the team wants a single term; if so, the store's **Bestwert** would be the cleaner unifier for the value labels. No action taken this pass.

No unresolved placement questions — all screens were reachable and inspected in the Simulator.
