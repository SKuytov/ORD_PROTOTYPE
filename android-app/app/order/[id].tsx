import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getOrderById, Order } from '../../src/api/orders';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, STATUS_COLORS, PRIORITY_COLORS } from '../../src/constants';
import { fmtDate, fmtDateTime, fmtPrice, isOverdue } from '../../src/utils';
import StatusBadge from '../../src/components/StatusBadge';
import { API_BASE_URL } from '../../src/constants';

const BASE_SERVER = 'https://partpulse-orders.tail675c8b.ts.net';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getOrderById(parseInt(id!, 10));
      setOrder(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load order');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openFile = async (filePath: string) => {
    const url = `${BASE_SERVER}${filePath}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot Open', 'Unable to open this file on this device.');
    }
  };

  const isImage = (type: string | null | undefined) => {
    if (!type) return false;
    return type.startsWith('image/');
  };

  const isProcurement = user?.role === 'procurement' || user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const overdue = order ? isOverdue(order.date_needed) && !['Delivered', 'Cancelled'].includes(order.status) : false;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Order not found</Text>
      </View>
    );
  }

  const priorityColor = PRIORITY_COLORS[order.priority] ?? COLORS.textMuted;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header card */}
      <View style={[styles.headerCard, { borderLeftColor: priorityColor }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.orderId}>Order #{order.id}</Text>
            {order.quote_number && (
              <Text style={styles.quoteRef}>Quote: {order.quote_number}</Text>
            )}
          </View>
          <View style={styles.badgesCol}>
            <StatusBadge label={order.status} type="status" />
            <StatusBadge label={order.priority} type="priority" size="sm" />
          </View>
        </View>

        <Text style={styles.itemDesc}>{order.item_description}</Text>

        {overdue && (
          <View style={styles.overdueAlert}>
            <Text style={styles.overdueText}>⚠️ This order is OVERDUE</Text>
          </View>
        )}
      </View>

      {/* Key details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Details</Text>
        <View style={styles.grid}>
          <Field label="Building" value={order.building} />
          <Field label="Quantity" value={String(order.quantity)} />
          {order.part_number && <Field label="Part Number" value={order.part_number} />}
          {order.category && <Field label="Category" value={order.category} />}
          {order.cost_center_code && <Field label="Cost Center" value={`${order.cost_center_code} – ${order.cost_center_name ?? ''}`} />}
        </View>
      </View>

      {/* Dates */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Timeline</Text>
        <View style={styles.grid}>
          <Field label="Submitted" value={fmtDateTime(order.submission_date)} />
          <Field
            label="Needed By"
            value={fmtDate(order.date_needed)}
            valueColor={overdue ? COLORS.error : undefined}
          />
          {order.expected_delivery_date && (
            <Field label="Expected Delivery" value={fmtDate(order.expected_delivery_date)} />
          )}
          {order.delivery_confirmed_at && (
            <Field label="Delivered At" value={fmtDateTime(order.delivery_confirmed_at)} valueColor={COLORS.success} />
          )}
        </View>
      </View>

      {/* People */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>People</Text>
        <View style={styles.grid}>
          <Field label="Requested By" value={order.requester_name} />
          {order.requester_email && <Field label="Requester Email" value={order.requester_email} />}
          {order.assigned_to_name && <Field label="Assigned To" value={order.assigned_to_name} />}
        </View>
      </View>

      {/* Supplier & Pricing (procurement/admin/manager/accounting) */}
      {(isProcurement || isManager || user?.role === 'accounting') && (order.supplier_name || order.unit_price) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Procurement</Text>
          <View style={styles.grid}>
            {order.supplier_name && <Field label="Supplier" value={order.supplier_name} />}
            {order.unit_price != null && (
              <Field
                label="Unit Price"
                value={`${fmtPrice(order.unit_price)} ${''}`}
                valueColor={COLORS.emerald}
              />
            )}
            {order.total_price != null && (
              <Field
                label="Total Price"
                value={`${fmtPrice(order.total_price)}`}
                valueColor={COLORS.emerald}
              />
            )}
          </View>
        </View>
      )}

      {/* Notes */}
      {order.notes && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes</Text>
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      )}

      {/* Attachments */}
      {order.files && order.files.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Attachments ({order.files.length})</Text>
          <View style={styles.filesGrid}>
            {order.files.map((file) => (
              <TouchableOpacity
                key={file.id}
                style={styles.fileItem}
                onPress={() => openFile(file.path)}
              >
                <Text style={styles.fileIcon}>
                  {isImage(file.type) ? '🖼' :
                   file.type?.includes('pdf') ? '📄' :
                   file.type?.includes('word') || file.name?.endsWith('.docx') ? '📝' :
                   file.type?.includes('excel') || file.name?.endsWith('.xlsx') ? '📊' : '📎'}
                </Text>
                <Text style={styles.fileName} numberOfLines={2}>{file.name}</Text>
                <Text style={styles.fileSize}>
                  {file.size ? `${Math.round(file.size / 1024)}KB` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      {isProcurement && (
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(`${BASE_SERVER}/#/orders`)}
            >
              <Text style={styles.actionBtnText}>🌐 Open in Browser</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Field({
  label, value, valueColor,
}: {
  label: string; value: string | null | undefined; valueColor?: string;
}) {
  if (!value) return null;
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <Text style={[fieldStyles.value, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
  },
  label: {
    fontSize: 10,
    color: COLORS.textDim,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },

  headerCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    gap: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  quoteRef: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  badgesCol: {
    gap: 6,
    alignItems: 'flex-end',
  },
  itemDesc: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 22,
  },
  overdueAlert: {
    backgroundColor: COLORS.error + '20',
    borderColor: COLORS.error + '60',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  overdueText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  grid: {
    gap: 4,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  filesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  fileItem: {
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    width: 90,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileIcon: { fontSize: 24 },
  fileName: {
    fontSize: 10,
    color: COLORS.text,
    textAlign: 'center',
  },
  fileSize: {
    fontSize: 9,
    color: COLORS.textDim,
  },
  actionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionBtn: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary + '60',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  actionBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
