import React from 'react';
import { View } from 'react-native';
import Logo from '@/assets/images/logo.svg';

interface Props {
  size?: number;
}

export default function AppLogo({ size = 48 }: Props) {
  const logoSize = Math.round(size * 1.25);
  return (
    <View style={{ width: logoSize, height: logoSize, alignItems: 'center', justifyContent: 'center' }}>
      <Logo width={logoSize} height={logoSize} />
    </View>
  );
}
