# Localization Report — Portuguese (Brazilian)

- **Language:** Portuguese (Brazilian)
- **Locale code:** pt-BR
- **File:** `locales/pt-BR.json`
- **Date:** 2026-07-25
- **Strings reviewed:** 275 (full key tree, byte-identical to `en.json`)
- **Issues fixed:** 15 — Critical: 0 · Important: 12 · Polish: 3
- **Parity check:** `npm run check-i18n` **passes** — `[pt-BR] ✓ 275 keys`, all placeholders/tags match `en.json`.

## Self-check confirmation

- Key set in `pt-BR.json` is identical to `en.json` — no keys added, removed, or renamed.
- Every `{{placeholder}}` present in each English source is present in the target — same count, spelling, case. (Only string affected with a placeholder was untouched-in-braces.)
- Every tag pair (`<terms>`, `<privacy>`) intact and unmodified.
- No brand name translated (`Topside`, `Dice Drop` left in Latin script throughout).
- Before/after values below match the file exactly.

The pt-BR file was already a high-quality translation (last touched 2026-07-23). This pass was primarily a **terminology-consistency and store-alignment** sweep, not a rewrite: I unified four core concepts on a single term each, aligned them to the Port-Brazil App Store copy, and fixed a couple of length/naturalness issues. All label placements were verified in the iOS Simulator (home stats grid, settings, stats/leaderboard screen, in-game HUD) with the app set to Português (Brasil).

---

## Terminology decisions

| Concept | Chosen pt-BR term | Rationale |
|---|---|---|
| merge (verb) | **juntar** (noun: **junção**) | Matches the store copy exactly ("Junte os dados", "eles se juntam no número seguinte", "cada junção extra"). Genre-standard for BR merge/number games (2048 pt-BR: "junte os números"). Replaced a mix of "combinar" (reads as *match/combine*) and "fundir" (reads as *fuse/weld* — the literal-but-wrong trap). |
| board | **mesa** | The store copy commits to "mesa" throughout ("a mesa vai enchendo", "Limpe a mesa inteira", "bônus de Mesa limpa"), and the in-app All-Clear splash is already "Mesa" / "limpa!". Warm and natural for a cozy casual game. Removed the stray "tabuleiro" (dictionary term for *game board*) so the app and store now agree. |
| chain | **cadeia** | Store copy uses "reações em cadeia"; the in-app scoring blurb already said "reações em cadeia". Replaced "corrente" (reads as *physical chain/current*) so the combo-chain concept is expressed one way everywhere. |
| run (a play session) | **jogo** (pl. **jogos**) | Kept the term already shipping in every stat label ("ÚLTIMO JOGO", "MELHOR JOGO", "JOGOS TOTAIS", "{{count}} jogos"). Verified in the Simulator that these fit the tight 3-column stats grid; "partida" (the store's word) is ~30% longer and risks wrapping those labels. Fixed the two prose spots that used "partida" so the whole file is consistent on "jogo". See Store-copy deviations. |
| continue (extra life) | **continuação** | Unchanged — already consistent across app and store ("continuações grátis / ilimitados"). |
| leaderboard | **Ranking** | Unchanged — universal loanword among BR gamers; also used in the store copy. |

Genre references drawn from: **2048** (pt-BR), casual merge/number puzzle titles, and Instagram-pt conventions (follow/following UI).

---

## Changes

| Key | Before | After | Severity | Reason |
|---|---|---|---|---|
| `home.subtitle` | Um jogo de soltar e combinar. | Um jogo de soltar e juntar. | Important | merge → **juntar** (store alignment / consistency). |
| `leaderboard.renameModal.shuffle` | Outro | Sortear | Important | "Sortear" describes the action (draw a random name) and matches the store's "sorteie até achar um"; "Outro" was vague. |
| `leaderboard.findPlayers` | Encontrar jogadores | Buscar jogadores | Important | Consistency with the adjacent search field placeholder "Buscar por nome…". |
| `leaderboard.info.scoringDesc` | … combinar dados rende pontos … limpar o **tabuleiro** inteiro … | … juntar dados rende pontos … limpar a **mesa** inteira … | Important | merge → juntar; board → mesa. |
| `leaderboard.info.allRunsDesc` | … usada para estender a **partida**. | … usada para estender o **jogo**. | Important | run → jogo consistency (mirrors en "the game"). |
| `game.watchLongerAd` | Assistir a um anúncio mais longo | Ver anúncio mais longo | Important | ~78% longer than EN "Watch a longer ad" — shortened to ~29% over EN to avoid overflow on the secondary continue option. |
| `game.condensing` | Condensando… | Compactando… | Polish | "Compactando" is the natural BR term for squeezing the board down; "Condensando" reads chemical/technical. |
| `game.tutorial.objMerge` | Dados iguais se **fundem** no valor seguinte | Dados iguais se **juntam** no valor seguinte | Important | merge → juntar (drops the "fuse/weld" reading of *fundir*). |
| `game.tutorial.objSixes` | **Funda** os seis para tirá-los do **tabuleiro** … | **Junte** os seis para tirá-los da **mesa** … | Important | merge → juntar; board → mesa; matches store "Junte os 6 e eles somem da mesa". |
| `howToPlay.rules.mergeTitle` | Combine valores iguais | Junte valores iguais | Important | merge → juntar. |
| `howToPlay.rules.mergeBody` | … dados encostados **de mesmo** valor se **combinam** … | … dados encostados **do mesmo** valor se **juntam** … | Important | merge → juntar; "do mesmo valor" is the natural collocation (Polish: added article). |
| `howToPlay.rules.sixesBody` | **Combine** dois ou mais seis para removê-los do **tabuleiro** … | **Junte** dois ou mais seis para removê-los da **mesa** … | Important | merge → juntar; board → mesa. |
| `howToPlay.rules.chainsTitle` | Crie **correntes** | Crie **cadeias** | Important | chain → cadeia. |
| `howToPlay.rules.chainsBody` | Uma **combinação** … Quanto mais longa a **corrente** … | Uma **junção** … Quanto mais longa a **cadeia** … | Important | merge noun → junção; chain → cadeia. |
| `howToPlay.rules.surviveBody` | … A **partida** termina quando … | … O **jogo** termina quando … | Polish | run → jogo consistency. |

---

## Plural / structural flags

**None.** `leaderboard.runsCount` already ships the correct `runsCount_one` / `runsCount_other` pair, matching `en.json`. For pt-BR CLDR cardinal rules, integer counts driven by `{{count}}` resolve to `one` (0–1) or `other`; the `many` category applies only to large compact-notation numbers, which this string never receives. No new plural siblings are required, and none were added (key parity preserved).

---

## Store-copy deviations

| In-app wording | Store copy | Reason for divergence |
|---|---|---|
| run = **jogo** (all stat labels + counts + prose) | store uses **partida** ("A partida acaba", "Tutorial da primeira partida") | "jogo" fits the tight 3-column stats grid (verified in Simulator); "partida" is longer and risks wrapping "MELHOR PARTIDA" / "PARTIDAS TOTAIS". "jogo" is fully natural for a play session in BR. *The team may prefer to update the store listing to "jogo" for perfect continuity — flagged for decision.* |
| unlock = **desbloquear** ("Desbloquear personalização", "Desbloqueie…") | store uses **liberar/libere** ("Libere temas, sons…") | The app is already internally consistent on "desbloquear", the genre-standard verb for unlocking content in games. Kept for in-app consistency; store could adopt "desbloquear" to match. |

Both are deliberate, low-stakes choices; either could be reconciled by nudging the store listing rather than the app.

---

## Open questions

**None unresolved.** Every label whose meaning depends on placement was checked in the Simulator:
- Home stats grid — all four labels fit one line (incl. 17-char "SEQUÊNCIA DE DIAS"), confirming run="jogo" labels are safe.
- Settings — sound/customize rows fit.
- Stats/Leaderboard — filter chips ("Jogos sem ajuda", "Todos") and the 3-column stat labels fit.
- In-game HUD — "PONTUAÇÃO / MELHOR / PRÓXIMO" fit.
- Game Over modal — "Fim de jogo / Melhor: {{score}} / Continuar / Ver anúncio mais longo / Novo jogo / ← Início" all fit (edit "Ver anúncio mais longo" confirmed on one line).
- **Premium paywall (IAP) — verified live** with RevenueCat test prices: title "Topside: Dice Drop Premium", perks ("Sem anúncios", "Continuações grátis", "Todos os temas e pacotes de som", "Todas as animações e estilos de dados"), CTA "Fazer upgrade — {{price}}", "Ou só Remover anúncios — {{price}}", "Restaurar compra", "Agora não" — all render natively and fit. Brand kept in Latin script. `upgradePrice`/`titlePrice`/`orCustomization`/`orRemoveAds` and the restore/redeem alert strings read as native BR; no changes required. (`premium.noPackage` uses "pacote" — mildly technical but faithful to EN "package" and only appears on a rare load error; left as-is.)
