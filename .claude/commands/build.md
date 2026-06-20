Run an EAS build for this app.

1. Read the current version and buildNumber/versionCode from app.json or app.config.js
2. Show the user the current values
3. Ask if they want to update the version string (e.g. 1.2.0) - show current, let them type new one or skip
4. Ask if they want to update the buildNumber/versionCode - show current, let them type new one or skip
5. If any changes, update app.json and confirm what was changed
6. Ask which platform: iOS, Android, or Both
7. Ask which profile: development, preview, or production
8. Show a full summary and ask for confirmation before running
9. Run: eas build --platform [platform] --profile [profile]
10. Report the build URL when it starts
