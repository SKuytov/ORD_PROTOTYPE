import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_COLORS, PRIORITY_COLORS, COLORS } from '../constants';

interface Props {
  label: string;
  type?: 'status' | 'priority';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ label, type = 'status', size = 'md' }: Props) {
  const colorMap = type === 'status' ? STATUS_COLORS : PRIORITY_COLORS;
  const color = colorMap[label] ?? COLORS.textMuted;
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: color + '25', borderColor: color + '60' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color, fontSize: isSmall ? 10 : 12 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
