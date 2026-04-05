import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

interface Props {
  title: string;
  value: number | string;
  color?: string;
  subtitle?: string;
}

export default function KpiCard({ title, value, color, subtitle }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    minWidth: 80,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.textDim,
    marginTop: 2,
  },
});
