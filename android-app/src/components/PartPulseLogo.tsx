import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

const LOGO = require('../../assets/logo.png');

const SIZES = {
  sm: { width: 120, height: 34 },
  md: { width: 180, height: 52 },
  lg: { width: 240, height: 69 },
};

export default function PartPulseLogo({ size = 'md' }: Props) {
  const dims = SIZES[size];
  return (
    <View style={styles.container}>
      <Image
        source={LOGO}
        style={{ width: dims.width, height: dims.height }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
