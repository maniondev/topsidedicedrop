const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = config.resolver;

config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = [...assetExts.filter((ext) => ext !== 'svg'), 'ogg'];
config.resolver.sourceExts = [...sourceExts, 'svg'];

// Android can't loop m4a/AAC gaplessly: MediaPlayer ignores the gapless
// (encoder-padding) metadata that iOS's AVAudioPlayer honors, so every loop
// wrap played ~200ms of baked-in silence — audibly desyncing the beat-locked
// UI animations. Ogg Vorbis carries no such padding and loops seamlessly on
// Android. The soundtrack files exist in BOTH formats in assets/sounds/music/;
// this bundle-time redirect makes Android resolve the .ogg twin of any music
// .m4a require, so each platform bundles ONLY its own format (a runtime
// Platform.select over two require()s would bundle both into both apps).
// iOS resolution is untouched.
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'android' && /\/music\/[^/]+\.m4a$/.test(moduleName)) {
    moduleName = moduleName.replace(/\.m4a$/, '.ogg');
  }
  return baseResolveRequest
    ? baseResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
