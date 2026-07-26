# Localization Report — French

- **Language:** French
- **Locale code:** `fr`
- **File edited:** `locales/fr.json`
- **Date:** 2026-07-25
- **Strings reviewed:** 275 (full key set, byte-identical to `en.json`)
- **Issues found & fixed:** 4 — Critical 0 · Important 4 · Polish 0
- **`npm run check-i18n`:** ✅ passes (`[fr] ✓ 275 keys`, all 8 locales match en.json)

## Self-check confirmation

- ✅ Key set in `fr.json` is identical to `en.json` — no keys added, removed, or renamed.
- ✅ Every placeholder (`{{price}}`, `{{score}}`, `{{theme}}`, `{{mode}}`, `{{count}}`, `{{title}}`) preserved — same count, spelling, case. Verified by `check-i18n` placeholder-parity guard.
- ✅ Every tag pair intact and unmodified (`<terms>…</terms>`, `<privacy>…</privacy>` in `howToPlay.consent`).
- ✅ No brand name translated — `Topside` and `Dice Drop` remain Latin script verbatim everywhere (theme/soundtrack names, `about.rate`, `allInTitle`, `review.title`, etc.).
- ✅ Before/after values below match the file exactly.

---

## Overall assessment

The existing French bundle is high quality and clearly professional: consistent register (formal **vous** throughout, matching the store listing), correct genre terminology, and no overflow. I verified the home, Settings, and Stats/Leaderboard screens live in the iOS Simulator (device already in French) — every label fits on its line, including the stat cards (`MEILLEUR SANS AIDE`, `SÉRIE DE JOURS`) and the unlock banner. Only three targeted issues warranted a change; I deliberately left the rest untouched to avoid churn.

---

## Terminology decisions

Concept | Chosen FR term | Rationale
--- | --- | ---
merge | **fusionner / fusion** | Matches store copy ("Fusionnez les 6…"). Standard for FR merge/2048-style games.
board | **plateau** | Matches store copy. Genre-standard (used by FR puzzle/block games).
drop (control) | **lâcher** | Punchy verb for dropping dice ("Lâchez les dés"). App-wide consistent. *Diverges slightly from store's "faire tomber" — see deviations.*
All Clear (bonus) | **Plateau vide** (`allClearLine1`+`Line2` = "Plateau" / "vide !") | Matches store copy verbatim ("bonus Plateau vide").
leaderboard | **Classement** | Matches store copy ("GRIMPEZ AU CLASSEMENT").
continue (noun) | **continuation** | Matches store copy ("débloquez les continuations").
best / high score (label) | **Meilleur** | Persistent stat labels (HUD, home, leaderboard).
new personal best (event) | **record** ("Nouveau record !", "Record précédent") | Idiomatic FR gaming term for beating your best. Split from the neutral label "Meilleur" is intentional and never shown simultaneously with it on the game-over screen.
unassisted run | **sans aide** | Clear, concise; not a store term (store doesn't surface this concept).
following (social) | **Abonnements / Abonné**, verb **Suivre** | Mirrors Instagram/YouTube FR conventions — the reference apps for follow/social UX.
shuffle (name) | **Mélanger** | Genre-standard for name/randomizer shufflers; matches store what's-new copy ("mélangez jusqu'à en trouver un"). *Changed — see below.*

---

## Changes

Key path | Before | After | Severity | Reason
--- | --- | --- | --- | ---
`game.tutorial.pause` | Balayez vers le haut pour mettre en pause | Glissez vers le haut pour mettre en pause | Important | Verb consistency: every other swipe hint uses **Glissez** (`move`, `drop`); only pause used the synonym "Balayez". Unifies the gesture vocabulary the player learns.
`howToPlay.controls.pause` | Balayez vers le haut pour mettre en pause | Glissez vers le haut pour mettre en pause | Important | Same consistency fix on the How-to-Play screen (`controls.move`/`drop` already use "Glissez").
`leaderboard.renameModal.shuffle` | Autre | Mélanger | Important | "Autre" (= "another") is vague as a button; **Mélanger** is the genre-standard shuffle term and aligns with the store listing's "mélangez". Conveys the randomize-name action, not just "next". **Verified in the live rename modal — fits its full-width button cleanly.**
`premium.noPackage` | Aucun forfait trouvé. Réessayez plus tard. | Aucun produit trouvé. Réessayez plus tard. | Important | IAP error string. "Forfait" reads as a recurring *subscription plan* in French (forfait mobile/mensuel), but Dice Drop Premium is a one-time non-consumable — so "forfait" mis-frames the purchase. "Produit" is neutral and accurate. (Independently corroborated: the concurrent Spanish pass changed the same string's "paquete" → "producto".)

---

## Plural / structural flags

- **`leaderboard.runsCount`** — `runsCount_one` / `runsCount_other` already present and match `en.json`. French CLDR cardinal categories relevant to a run count are **one** (n = 0, 1 → "partie") and **other** (n ≥ 2 → "parties"); both are covered and produce grammatical output ("0 partie", "1 partie", "2 parties"). **No action needed.**
- French CLDR also defines a **many** category, but it only affects compact/large-number formatting (n ≥ 1,000,000) and does not change the grammar of "partie" for realistic run counts. No extra sibling keys required; nothing to flag for a coordinated change.
- No other count-driven strings in the file.

---

## Store-copy deviations

These are intentional and minor; listed so the team can decide whether to align the store listing.

1. **drop control — app "lâcher" vs store "faire tomber".** The store description says "glissez vers le bas pour faire tomber la pièce"; the app uses "Glissez vers le bas pour lâcher". "Lâcher les dés" is idiomatic and punchier for a one-line control hint; kept for in-app brevity. Low priority.
2. **home subtitle — app "Un jeu de chute et de fusion." vs store subtitle "Puzzle de dés à fusionner".** The in-app subtitle describes the genre (drop + merge); the store subtitle leads with dice for keyword value. "Jeu de chute" is an accepted FR term for falling-block puzzles, so both read natively. Kept as-is (pre-existing, not an error).

---

## Open questions

1. ~~**`leaderboard.renameModal.shuffle` button width.**~~ **RESOLVED** — verified live in the simulator: "Mélanger" (with the shuffle icon) sits centered on its full-width button with room to spare. No truncation.
2. **`leaderboard.select` / `selected` ("Choisir" / "Choisi").** Left unchanged; the selection-mode context wasn't reachable in-session. Both are acceptable; "Sélectionner" / "Sélectionné" would be the more literal UI-standard forms if the team prefers them. Not blocking.
