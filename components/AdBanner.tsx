import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// TODO: Replace with real AdMob banner unit IDs for com.topside.merge
const IOS_ID     = 'ca-app-pub-REPLACE/REPLACE_BANNER_IOS';
const ANDROID_ID = 'ca-app-pub-REPLACE/REPLACE_BANNER_ANDROID';

const adUnitId = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.OS === 'ios' ? IOS_ID : ANDROID_ID;

// Reserved height so the layout never shifts between "ad not loaded" and "ad loaded".
// Keep this in sync with BANNER_H in the screens that compute board size.
export const BANNER_RESERVED_H = 60;

export default function AdBanner() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Fixed height + centered: an unloaded banner reserves the same space as a loaded one,
  // so the board above never jumps when the ad populates.
  container: { height: BANNER_RESERVED_H, alignItems: 'center', justifyContent: 'center' },
});
