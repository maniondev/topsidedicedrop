Prepare and ship this app to the stores (production build + store upload).

1. Read the current version and buildNumber/versionCode from app.json or app.config.js
2. Show the user the current values
3. Ask what to set the version string to (e.g. 1.2.0) - show current, require input
4. Ask what to set the buildNumber/versionCode to - show current, require input
5. Update app.json with the new values and confirm what was changed
6. Ask which platform: iOS, Android, or Both
7. Show a full summary and ask for confirmation before proceeding
8. Run: eas build --platform [platform] --profile production
9. When build completes, run eas submit but do NOT submit for App Store review
10. Remind user to go to App Store Connect to select the build and submit for review
