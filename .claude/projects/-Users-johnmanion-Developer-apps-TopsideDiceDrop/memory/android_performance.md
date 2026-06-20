---
name: android-performance
description: Android performance is poor — whole app slow on Umidigi A3, not just the game
metadata:
  type: project
---

Android (Umidigi A3, MT6739 2018 chip) is very slow — menus, tab switching, startup, and gameplay all affected. Not just a Skia issue.

**What was tried:**
- `newArchEnabled: false` — build failed; RN 0.81 + Skia 2.x + AdMob 16.x + RevenueCat 10.x all require New Architecture
- Performance mode toggle implemented (disables BlurMask, RadialGradient, burst/particles in game) — didn't fix menu slowness
- Parallelized SoundContext `downloadAsync` calls (was sequential x12) — didn't fix it

**Most likely remaining causes:**
- AdMob SDK initialization blocking JS thread on startup
- 28 Sound objects created via native bridge on mount (react-native-sound)
- Device is genuinely below the floor for this app stack

**Next steps if revisiting:**
- Defer sound loading entirely until first game start (not on app mount)
- Test on a mid-range Android (Snapdragon 6xx+, 2021+) to determine if it's a device floor issue
- Profile with Flipper or React DevTools to identify JS thread bottlenecks

**Why:** Deferred — user wants to ship iOS first and revisit Android perf later.
