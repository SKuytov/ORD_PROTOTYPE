import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Order } from '../api/orders';
import { COLORS, STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { fmtDate, isOverdue, isDueSoon, truncate } from '../utils';
import StatusBadge from './StatusBadge';

interface Props {
  order: Order;
  onPress: (order: Order) => void;
  compact?: boolean;
}

export default function OrderCard({ order, onPress, compact }: Props) {
  const overdue = isOverdue(order.date_needed) && !['Delivered', 'Cancelled'].includes(order.status);
  const dueSoon = isDueSoon(order.date_needed) && !['Delivered', 'Cancelled'].includes(order.status);
  const priorityColor = PRIORITY_COLORS[order.priority] ?? COLORS.textMuted;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        overdue && styles.cardOverdue,
        dueSoon && !overdue && styles.cardDueSoon,
      ]}
      onPress={() => onPress(order)}
      activeOpacity={0.75}
    >
      {/* Priority strip on left */}
      <View style={[styles.priorityStrip, { backgroundColor: priorityColor }]} />

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.orderId}>#{order.id}</Text>
          <StatusBadge label={order.status} type="status" size="sm" />
        </View>

        {/* Item description */}
        <Text style={styles.description} numberOfLines={compact ? 1 : 2}>
          {order.item_description}
        </Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>🏭 {order.building}</Text>
          <Text style={styles.meta}>×{order.quantity}</Text>
          {order.part_number && (
            <Text style={styles.meta} numberOfLines={1}>PN: {order.part_number}</Text>
          )}
        </View>

        {!compact && (
          <>
            {/* Date row */}
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Requested</Text>
                <Text style={styles.dateValue}>{fmtDate(order.submission_date)}</Text>
              </View>
              <View style={styles.dateItem}>
                <Text style={[styles.dateLabel, overdue && { color: COLORS.error }]}>Needed</Text>
                <Text style={[
                  styles.dateValue,
                  overdue && { color: COLORS.error },
                  dueSoon && !overdue && { color: COLORS.warning },
                ]}>
                  {fmtDate(order.date_needed)}
                  {overdue ? ' ⚠️' : dueSoon ? ' ⏰' : ''}
                </Text>
              </View>
              {order.priority !== 'Normal' && (
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Priority</Text>
                  <Text style={[styles.dateValue, { color: priorityColor }]}>{order.priority}</Text>
                </View>
              )}
            </View>

            {/* Requester */}
            <View style={styles.footerRow}>
              <Text style={styles.meta} numberOfLines={1}>
                👤 {order.requester_name}
              </Text>
              {order.supplier_name && (
                <Text style={styles.meta} numberOfLines={1}>
                  🏢 {order.supplier_name}
                </Text>
              )}
              {order.assigned_to_name && (
                <Text style={styles.meta} numberOfLines={1}>
                  📌 {order.assigned_to_name}
                </Text>
              )}
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardOverdue: {
    borderColor: COLORS.error + '60',
    backgroundColor: COLORS.error + '08',
  },
  cardDueSoon: {
    borderColor: COLORS.warning + '60',
    backgroundColor: COLORS.warning + '05',
  },
  priorityStrip: {
    width: 4,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  meta: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  dateItem: {
    gap: 2,
  },
  dateLabel: {
    fontSize: 10,
    color: COLORS.textDim,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 4,
  },
});
