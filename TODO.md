# TODO

## Store Submissions

- [ ] **iOS** — wait for initial App Store review to complete (do NOT cancel again); after approval, submit build 7 as an update: `eas submit --platform ios --latest`
- [ ] **Android** — upload new build (versionCode 9) to Play Console closed testing via "Add from library"; promote to production once ready
- [ ] **Android Play Store license testers** — add Google accounts under Play Console → Setup → License testing so testers can bypass billing

## AppsFlyer / Attribution

- [x] **Build & submit new version** with AppsFlyer SDK (both iOS and Android via `eas build`) ✅
- [ ] **iOS SKAN purchase event** — once real `af_purchase` events are recorded, go to AppsFlyer → SKAN Conversion Studio and remap slot 1 from Session → Purchase
- [ ] **iOS TikTok App ID** — after App Store goes live, register Dice Drop in TikTok Events Manager (needs App Store URL) to get a numeric App ID; add it to AppsFlyer → TikTok For Business integration
- [ ] **Android TikTok App ID** — after Play Store goes live, register Dice Drop in TikTok Events Manager (needs Play Store URL); add numeric App ID to AppsFlyer → TikTok For Business integration for `com.topside.dicedrop`
- [ ] **Verify AppsFlyer is receiving installs** — after first real installs, check AppsFlyer Overview → Installs to confirm iOS and Android are both reporting
- [ ] **Meta Ads** — connect Meta Ads in AppsFlyer when ready to run Instagram/Facebook campaigns (no new build required)
- [ ] **Google Ads** — connect Google Ads in AppsFlyer when ready to run YouTube/Google campaigns (no new build required)

## TikTok Organic

- [ ] **Schedule and post 90 videos** — bulk-upload with captions + hashtags via TikTok Creator tools or a scheduling tool (e.g. Buffer, Later)

## Future / Backlog

- [ ] **Android performance** — whole-app slowness on low-end devices (e.g. Umidigi A3); deferred until after iOS launch. React.memo already applied to GameBoard/HUD/Controls; may need further profiling on actual low-end hardware.
