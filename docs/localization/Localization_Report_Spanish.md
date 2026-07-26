# Localization Report — Spanish (es)

- **Language / locale:** Spanish (Spain register — "Ajustes", "vosotros"-free tú) · `es`
- **Date:** 2026-07-25
- **Strings reviewed:** 275 (full key set)
- **Issues found & fixed:** 16 Important · 0 Critical · 2 Polish (18 total)
- **Parity check:** `npm run check-i18n` → **passes** (`[es] ✓ 275 keys`, all 8 locales match en.json).
- **Verified live in the iOS Simulator** (device language = Español): Home, How to Play, Settings, Stats/Leaderboard, in-game HUD, tutorial, pause menu, and quit-confirm dialog. All edited strings and all tight labels render without truncation or overflow.

The existing Spanish was already strong. This pass was a QA/terminology-consistency sweep rather than a rewrite. The one systemic problem was the *merge* verb.

---

## a. Headline decision — "merge" → **fusionar** (was mixed with *combinar*)

The in-app copy was internally inconsistent: the in-game tutorial already said **fusionar** ("se fusionan", "Fusiona los seises"), but the How-to-Play modal, the scoring explainer, and the home subtitle used **combinar** ("Combina valores iguales", "se combinan", "combinar dados", "soltar y combinar").

The **App Store listing is 100% "fusionar"** — Subtitle "Fusiona dados y suma puntos", Promo "Fusiona los dados que caen", Description "se fusionan en el número siguiente" / "cada fusión extra de la cadena", Keywords "fusionar". **Fusionar** is also the genre-standard verb in Spanish merge titles (2048-likes, *Merge* games). Decision: standardize the whole app on **fusionar / fusión** to (1) fix the internal inconsistency and (2) stay continuous with the store page the player just read.

> Note: two surviving uses of *combinar* were intentionally **kept** — `settings.theme.matched` "Combinado con {{theme}}" and `settings.theme.matchedSub` "…efectos combinan". There, *combinar* means "to coordinate / match", not the board mechanic. Correct as-is.

## b. Terminology decisions

| Concept | Chosen term | Rationale / source |
|---|---|---|
| merge (verb/noun) | **fusionar / fusión** | Matches store copy exactly; genre standard. Now used app-wide. |
| drop | **soltar** | Already consistent; matches store ("desliza hacia abajo para soltarlas"). |
| board | **tablero** | Consistent throughout; matches store. |
| die / dice | **dado / dados** | Consistent; matches store. |
| chain (reaction) | **cadena / reacción en cadena** | Consistent; matches store. |
| run / game | **partida** | Consistent throughout ("Nueva partida", "MEJOR PARTIDA"). |
| score | **puntuación** (label) / **puntos** (prose) | Consistent; HUD "PUNTUACIÓN" verified to fit. |
| best / high score | **mejor** (label) / **récord** (celebratory) | Deliberate split — "MEJOR" on tiles, "¡Nuevo récord!" on the splash. |
| clear the sixes | **seises** | Consistent (`objSixes`, scoringDesc, sixesBody); matches store. |
| All Clear bonus | **¡Pleno!** | Matches store ("el bonus de ¡Pleno!"). Kept — see Open Questions. |

## c. Changes (only strings that changed)

| Key | Before | After | Severity | Reason |
|---|---|---|---|---|
| `home.subtitle` | Un juego de soltar y **combinar**. | Un juego de soltar y **fusionar**. | Important | Merge-term consistency + store alignment. |
| `howToPlay.rules.mergeTitle` | **Combina** valores iguales | **Fusiona** valores iguales | Important | Same. |
| `howToPlay.rules.mergeBody` | …del mismo valor se **combinan** en uno… | …del mismo valor se **fusionan** en uno… | Important | Same. |
| `howToPlay.rules.sixesBody` | **Combina** dos o más seises… | **Fusiona** dos o más seises… | Important | Same. |
| `howToPlay.rules.chainsBody` | Una **combinación** puede provocar más… | Una **fusión** puede provocar más… | Important | Same. |
| `leaderboard.info.scoringDesc` | — **combinar** dados otorga puntos… | — **fusionar** dados otorga puntos… | Important | Same. |
| `game.condensing` | **Condensando**… | **Compactando**… | Important | *Condensar* leans toward condensation/summarizing; *compactar* is the natural verb for a grid squeezing together — removes the only translated-feeling word. |
| `game.over` | Fin del **juego** | Fin de la **partida** | Important | Coherence: every run is a *partida* everywhere else in the app; "Fin del juego" was the lone outlier. |
| `review.dontAsk` | No **preguntar de nuevo** | No **volver a preguntar** | Polish | More idiomatic Spain phrasing for "Don't ask again". |
| `animPackNames.flip` | **Voltear** (verb) | **Volteo** (noun) | Polish | Matches the noun-style pattern of the other pack names ("Giro", "Añicos"). |
| `premium.restoreFailedBody` | Algo **salió** mal. | Algo **ha salido** mal. | Important | Peninsular register — present perfect for a just-happened event; "salió" reads Latin-American. See IAP note below. |
| `premium.nothingBody` | No **se encontró** ninguna compra anterior. | No **se ha encontrado** ninguna compra anterior. | Important | Same peninsular present-perfect fix. |
| `premium.noPackage` | No **se encontró** el **paquete**. Inténtalo más tarde. | No **se ha encontrado** el **producto**. Inténtalo más tarde. | Important | Present perfect + *paquete* (dev jargon / reads like a parcel) → *producto*, clearer for a store item. |
| `premium.redeemErrorBody` | No **se pudo** abrir la pantalla de canje… | No **se ha podido** abrir la pantalla de canje… | Important | Same peninsular present-perfect fix. |
| `premium.orCustomization` | O solo **Personalización** — {{price}} | O solo **personalización** — {{price}} | Polish | Sentence case — no mid-sentence capital in Spanish. (Applied during review.) |
| `premium.orRemoveAds` | O solo **Quitar anuncios** — {{price}} | O solo **quitar anuncios** — {{price}} | Polish | Same sentence-case fix. |

All placeholders, tags, and brand names left untouched by these edits.

### IAP / monetization pass (popups, banners, buttons)

Reviewed every premium/IAP, banner, and button string. Findings:

- **Peninsular present perfect (the real issue).** The app establishes Spain register elsewhere — `settings.stats.resetDoneBody` = "Se **han borrado** tus estadísticas." — but the IAP error popups used the preterite ("salió", "se encontró", "se pudo"), which reads Latin-American/neutral and is internally inconsistent. Fixed the four IAP instances above.
- **Buttons/banners are already native and were kept:** `home.unlockBanner` "Desbloquea packs de sonido, temas y más", `settings.premium.unlockPremium` "Desbloquear Premium", `premium.removeAdsTitle` "Quitar anuncios", `premium.everythingUnlocked` "¡Lo tienes todo desbloqueado!", `premium.notNow` "Ahora no", `game.watchLongerAd` "Ver un anuncio más largo".
- **`premium.upgradePrice` "Mejorar — {{price}}"** — considered and kept. It's a valid rendering of "Upgrade" and consistent with the app's infinitive-button style ("Cerrar", "Restaurar", "Aplicar").
- **Whole-app consistency (APPLIED).** The same preterite→present-perfect fix was extended to the four non-IAP error strings so register is uniform across the app:
  - `leaderboard.renameModal.errorTitle` "No se pudo cambiar el nombre" → "No se ha podido cambiar el nombre"
  - `leaderboard.loadError` "No se pudo cargar la clasificación." → "No se ha podido cargar la clasificación."
  - `findPlayer.loadError` "No se pudo cargar la lista de seguidos." → "No se ha podido cargar la lista de seguidos."
  - `findPlayer.noPlayers` "No se encontraron jugadores." → "No se han encontrado jugadores."

  Verified sweep: no just-happened-event preterites remain. `leaderboard.info.allRunsDesc` keeps "se usó una continuación" on purpose — that's a *general descriptive* past explaining a leaderboard category, not a hot-past event, so the preterite is correct there.

## d. Plural / structural flags

**None required.** The only count-driven key is `leaderboard.runsCount`, which already ships the correct Spanish CLDR pair (`_one` / `_other`: "{{count}} partida" / "{{count}} partidas"). No other `{{count}}`-driven strings exist in en.json, so no plural siblings need to be added. Key set remains byte-identical to en.json.

## e. Store-copy deviations (in-app intentionally differs)

- **"bonificación" vs store "bonus".** In-app uses *bonificación* (`scoringDesc`, `sixesBody`) — proper Spanish. The store Description mixes in the anglicism *bonus* ("consigue el bonus", "el bonus de ¡Pleno!"). Recommend updating the store copy to *bonificación* for consistency; left the app as-is (better register).
- **`leaderboard.renameModal.shuffle` = "Otro".** The store "What's New" uses the verb *baraja* ("baraja hasta dar con el que te encante"). In-app keeps **"Otro"** — a shorter, clearer button label for "give me another random name" than *Barajar*. Deliberate; flagged so the team can decide whether to reconcile.

## f. Open questions

- **`game.allClearLine1` = "¡Pleno!" / `game.allClearLine2` = "" (empty).** English splits the splash across two lines ("All" / "Clear!"); Spanish is one word, so line 2 was intentionally left empty and the term matches the store ("¡Pleno!"). I could **not trigger the all-clear splash live** (requires clearing the entire board), so I could not eyeball the two-line splash component with an empty second line. Worth a quick visual confirm that the layout still centers cleanly with `allClearLine2` empty. Terminology itself is confirmed correct.
