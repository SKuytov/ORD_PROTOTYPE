import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

export default function PartPulseLogo({ size = 'md' }: Props) {
  const fontSize = size === 'sm' ? 14 : size === 'md' ? 20 : 28;
  const subSize = size === 'sm' ? 8 : size === 'md' ? 11 : 14;

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Text style={[styles.logoNavy, { fontSize }]}>PART</Text>
        <Text style={[styles.logoOrange, { fontSize }]}>PULSE</Text>
      </View>
      <Text style={[styles.sub, { fontSize: subSize }]}>ORDERS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
  },
  logoNavy: {
    fontWeight: '900',
    color: '#4a6fa5',
    letterSpacing: 2,
  },
  logoOrange: {
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  sub: {
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: -4,
  },
});
