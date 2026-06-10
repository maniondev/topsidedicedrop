# Topside: Dice Drop

React Native / Expo mobile game. iOS-first, portrait only. Bundle ID: `com.topside.dicedrop`.

## Stack

- **Expo** ~54, **expo-router** ~6, React 19, React Native 0.81
- **Skia** (`@shopify/react-native-skia`) for game board rendering
- **Supabase** for global leaderboard
- **RevenueCat** (`react-native-purchases`) for premium IAP
- **Google Mobile Ads** (`react-native-google-mobile-ads`) for ad monetization
- **AsyncStorage** for local persistence
- TypeScript throughout

## File Structure

```
app/
  _layout.tsx              # Root layout — wraps all contexts
  (tabs)/
    _layout.tsx            # Tab bar layout
    index.tsx              # Home screen
    leaderboard.tsx        # Global leaderboard (Supabase)
    settings.tsx           # Settings screen
  game/
    index.tsx              # Game screen

components/
  game/
    GameBoard.tsx          # Skia canvas — renders board, active piece, animations
    Controls.tsx           # Drop / move buttons
    HUD.tsx                # Score, level, chain display
    NextQueue.tsx          # Upcoming pieces preview
    GameOverModal.tsx
    PauseModal.tsx
    EmergencyCondenseOverlay.tsx
  AdBanner.tsx
  AdInterstitial.tsx
  AppLogo.tsx
  HowToPlayModal.tsx
  PremiumModal.tsx
  haptic-tab.tsx

hooks/
  useGame.ts               # Central game state reducer — all game logic lives here
  useRewardedAd.ts

contexts/
  AnimationContext.tsx
  DifficultyContext.tsx
  GameStatusContext.tsx
  PremiumContext.tsx
  SoundContext.tsx         # Sound theme selection + playback
  StatsContext.tsx         # Lifetime stats (AsyncStorage)
  ThemeContext.tsx         # Visual theme selection

constants/
  game.ts                  # COLS, ROWS, timing constants, piece IDs
  theme.ts                 # Color themes
  pricing.ts

lib/
  board.ts                 # Board type, emptyBoard, cloneBoard
  merge.ts                 # Merge resolution logic
  gravity.ts               # Gravity / fall logic
  condense.ts              # Emergency condense logic
  pieces.ts                # Piece definitions / PIECE_MAP
  scoring.ts               # scoreMerge, scoreClear
  rng.ts                   # Seeded RNG, weightedValue
  storage.ts               # AsyncStorage helpers
  playerIdentity.ts        # UUID-based anonymous player ID
  supabase.ts              # Supabase client
  adCounter.ts             # Ad frequency tracking
  adManager.ts             # Ad lifecycle management
  audioSession.ts          # iOS audio session config

assets/
  images/                  # icon.png, splash-logo.png, logo.svg
  sounds/                  # Sound themes — each subfolder has the same set of files:
    topside/               #   chain.m4a, clear.m4a, condense.m4a, drop.m4a,
    bubbles/               #   gameover.m4a, lock.m4a, merge1–6.m4a
    coins/
    dig/
    fight/
    fight2/
    marimba/
    metal/
    rubber/
    snow/
    splash/

ios/
  TopsideMerge/            # Native iOS project (Xcode)
  TopsideMerge.xcodeproj/

game/                      # (empty — reserved)
```

## Key Patterns

- All game logic runs inside `useGame.ts` via `useReducer`; components only dispatch actions.
- Sound themes are selected in `SoundContext`; each theme folder mirrors the same filename set.
- Skia renders the board; gesture handling goes through react-native-gesture-handler.
- Player identity is a UUID stored in AsyncStorage (`lib/playerIdentity.ts`).

## RevenueCat

- **Project**: Topside: Dice Drop (separate from Topside Classic)
- **iOS key**: `appl_bEfjghrErvdIBhSvAvrEMXEAInP`
- **Android key**: `goog_eyVRQLwacLpBhQjOGF0VqesoYMT`
- **Entitlement**: `Topside: Dice Drop Premium`
- **Product ID**: `com.topside.dicedrop.premium` (non-consumable, $4.99)
- Packages fetched dynamically via `Purchases.getOfferings()` — no hardcoded product IDs

## AdMob

| Type | iOS | Android |
|---|---|---|
| App ID | `ca-app-pub-5499315559222720~1669872133` | `ca-app-pub-5499315559222720~7457722144` |
| Banner | `ca-app-pub-5499315559222720/3369427615` | `ca-app-pub-5499315559222720/3247014392` |
| Rewarded | `ca-app-pub-5499315559222720/3518477137` | `ca-app-pub-5499315559222720/1933932727` |

- Banner ads shown to non-premium users only
- Rewarded ads used for continues (every continue = one rewarded ad)
- No interstitial ads
- Test app IDs (dev only): iOS `ca-app-pub-3940256099942544~1458002511`, Android `ca-app-pub-3940256099942544~3347511713`

## Commands

```bash
npm start          # Expo dev server
npm run ios        # Run on iOS simulator
eas build          # EAS cloud build
```
