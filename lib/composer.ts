import { Linking } from 'react-native';

// Soundtrack credit, shared by the About section and the Soundtrack picker.
export const COMPOSER_NAME = 'Nate Brown';
export const COMPOSER_IG_HANDLE = 'natha.n';
export const COMPOSER_CREDIT_LABEL = `Audio Composer: ${COMPOSER_NAME}`;

// Try the native Instagram app first, fall back to the web profile.
export function openComposerIG() {
  const appUrl = `instagram://user?username=${COMPOSER_IG_HANDLE}`;
  const webUrl = `https://www.instagram.com/${COMPOSER_IG_HANDLE}`;
  Linking.canOpenURL(appUrl)
    .then(supported => Linking.openURL(supported ? appUrl : webUrl))
    .catch(() => Linking.openURL(webUrl).catch(() => {}));
}
