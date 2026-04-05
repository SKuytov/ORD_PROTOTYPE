import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Alert, Modal,
  TextInput
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { getOrderById, Order, updateOrderStatus } from '../../src/api/orders';
import { apiClient } from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, PRIORITY_COLORS, ORDER_STATUSES } from '../../src/constants';
import { fmtDate, fmtDateTime, fmtPrice, isOverdue } from '../../src/utils';
import StatusBadge from '../../src/components/StatusBadge';

const BASE_SERVER = 'https://partpulse-orders.tail675c8b.ts.net';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [pendingStatus, setPendingStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getOrderById(parseInt(id!, 10));
      setOrder(data);
      navigation.setOptions({ title: `Order #${data.id}` });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load order');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const openFile = async (filePath: string) => {
    const url = `${BASE_SERVER}${filePath}`;
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
    else Alert.alert('Cannot open', 'Unable to open this file on your device.');
  };

  const handleStatusChange = (newStatus: string) => {
    setPendingStatus(newStatus);
    setStatusNote('');
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await updateOrderStatus(order.id, pendingStatus, statusNote || undefined);
      setShowStatusModal(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!order) return;
    Alert.alert('Claim Order', `Assign order #${order.id} to yourself?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Claim', onPress: async () => {
        setActionLoading(true);
        try {
          await apiClient.post(`/order-assignments/${order.id}/claim`, {});
          load();
        } catch (err: any) { Alert.alert('Error', err.message); }
        finally { setActionLoading(false); }
      }},
    ]);
  };

  const handleRelease = async () => {
    if (!order) return;
    Alert.alert('Release Order', 'Release this order back to the unassigned pool?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Release', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          await apiClient.post(`/order-assignments/${order.id}/release`, {});
          load();
        } catch (err: any) { Alert.alert('Error', err.message); }
        finally { setActionLoading(false); }
      }},
    ]);
  };

  const isImage = (type: string | null | undefined) => type?.startsWith('image/') ?? false;
  const isProcurement = user?.role === 'procurement' || user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isAccounting = user?.role === 'accounting';
  const overdue = order ? isOverdue(order.date_needed) && !['Delivered', 'Cancelled'].includes(order.status) : false;

  // Status workflow: what statuses can this role transition to from current?
  const getAvailableStatuses = (current: string): string[] => {
    if (isProcurement) {
      const flow: Record<string, string[]> = {
        'New': ['In Progress', 'On Hold', 'Cancelled'],
        'Pending Review': ['In Progress', 'On Hold'],
        'In Progress': ['Quote Requested', 'Ordered', 'On Hold'],
        'Quote Requested': ['Quote Received', 'In Progress'],
        'Quote Received': ['Ordered', 'In Progress'],
        'Ordered': ['In Transit'],
        'In Transit': ['Delivered'],
        'On Hold': ['In Progress', 'Cancelled'],
      };
      return flow[current] || [];
    }
    if (isManager) {
      return ['Approved', 'Pending Review', 'Cancelled'];
    }
    return [];
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!order) {
    return <View style={styles.center}><Text style={styles.emptyText}>Order not found</Text></View>;
  }

  const priorityColor = PRIORITY_COLORS[order.priority] ?? COLORS.textMuted;
  const availableStatuses = getAvailableStatuses(order.status);

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
            {order.quote_number && <Text style={styles.quoteRef}>Quote: {order.quote_number}</Text>}
            {order.po_number && <Text style={styles.quoteRef}>PO: {order.po_number}</Text>}
          </View>
          <View style={{ gap: 6, alignItems: 'flex-end' }}>
            <StatusBadge label={order.status} type="status" />
            <StatusBadge label={order.priority} type="priority" size="sm" />
          </View>
        </View>

        <Text style={styles.itemDesc}>{order.item_description}</Text>

        {overdue && (
          <View style={styles.overdueAlert}>
            <Text style={styles.overdueText}>⚠️ OVERDUE — needed {fmtDate(order.date_needed)}</Text>
          </View>
        )}

        {order.approval_status && order.approval_status !== 'not_required' && (
          <View style={[styles.approvalBadge, {
            backgroundColor: order.approval_status === 'approved' ? COLORS.success + '20' :
              order.approval_status === 'rejected' ? COLORS.error + '20' : COLORS.warning + '20',
          }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color:
              order.approval_status === 'approved' ? COLORS.success :
              order.approval_status === 'rejected' ? COLORS.error : COLORS.warning,
            }}>
              {order.approval_status === 'approved' ? '✅ Approved' :
               order.approval_status === 'rejected' ? '❌ Rejected' : '⏳ Pending Approval'}
            </Text>
          </View>
        )}
      </View>

      {/* Key details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Details</Text>
        <Field label="Building" value={order.building} />
        <Field label="Quantity" value={`${order.quantity} units`} />
        {order.part_number && <Field label="Part Number" value={order.part_number} />}
        {order.category && <Field label="Category" value={order.category} />}
        {order.cost_center_code && <Field label="Cost Center" value={`${order.cost_center_code}${order.cost_center_name ? ` – ${order.cost_center_name}` : ''}`} />}
      </View>

      {/* Timeline */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Timeline</Text>
        <Field label="Submitted" value={fmtDateTime(order.submission_date)} />
        <Field label="Needed By" value={fmtDate(order.date_needed)} valueColor={overdue ? COLORS.error : undefined} />
        {order.expected_delivery_date && <Field label="Expected Delivery" value={fmtDate(order.expected_delivery_date)} />}
        {order.delivery_confirmed_at && <Field label="Delivered" value={fmtDateTime(order.delivery_confirmed_at)} valueColor={COLORS.success} />}
      </View>

      {/* People */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>People</Text>
        <Field label="Requested By" value={order.requester_name} />
        {order.requester_email && <Field label="Email" value={order.requester_email} />}
        {order.assigned_to_name ? (
          <Field label="Assigned To" value={order.assigned_to_name} valueColor={COLORS.primary} />
        ) : (
          <Field label="Assigned To" value="Unassigned" valueColor={COLORS.textDim} />
        )}
      </View>

      {/* Supplier & Pricing — restricted */}
      {(isProcurement || isManager || isAccounting) && (order.supplier_name || order.unit_price) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Procurement</Text>
          {order.supplier_name && <Field label="Supplier" value={order.supplier_name} />}
          {order.unit_price != null && <Field label="Unit Price" value={`€${fmtPrice(order.unit_price)}`} valueColor={COLORS.emerald} />}
          {order.total_price != null && <Field label="Total Price" value={`€${fmtPrice(order.total_price)}`} valueColor={COLORS.emerald} />}
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
            {order.files.map(file => (
              <TouchableOpacity key={file.id} style={styles.fileItem} onPress={() => openFile(file.path)}>
                <Text style={styles.fileIcon}>
                  {isImage(file.type) ? '🖼' : file.type?.includes('pdf') ? '📄' :
                   file.type?.includes('word') ? '📝' : file.type?.includes('excel') ? '📊' : '📎'}
                </Text>
                <Text style={styles.fileName} numberOfLines={2}>{file.name}</Text>
                {file.size > 0 && <Text style={styles.fileSize}>{Math.round(file.size / 1024)}KB</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Actions — Procurement & Manager */}
      {(availableStatuses.length > 0 || isProcurement) && (
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Actions</Text>

          {/* Status transitions */}
          {availableStatuses.length > 0 && (
            <View>
              <Text style={styles.actionsSubLabel}>Change Status</Text>
              <View style={styles.actionsRow}>
                {availableStatuses.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={styles.statusBtn}
                    onPress={() => handleStatusChange(s)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.statusBtnText}>→ {s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Claim / Release */}
          {isProcurement && (
            <View style={styles.actionsRow}>
              {!order.assigned_to_user_id && (
                <TouchableOpacity style={[styles.actionBtn, styles.claimBtn]} onPress={handleClaim} disabled={actionLoading}>
                  <Text style={styles.actionBtnText}>📌 Claim Order</Text>
                </TouchableOpacity>
              )}
              {order.assigned_to_user_id === user?.id && (
                <TouchableOpacity style={[styles.actionBtn, styles.releaseBtn]} onPress={handleRelease} disabled={actionLoading}>
                  <Text style={[styles.actionBtnText, { color: COLORS.warning }]}>📤 Release</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.navyLight + '30', borderColor: COLORS.navyLight }]}
                onPress={() => Linking.openURL(`${BASE_SERVER}`)}
              >
                <Text style={styles.actionBtnText}>🌐 Open Web App</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Status change modal */}
      <Modal visible={showStatusModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowStatusModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Change Status to "{pendingStatus}"</Text>
          <Text style={styles.modalSub}>Order #{order.id} — {order.item_description}</Text>
          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.fieldInput, { minHeight: 80, margin: 16, marginTop: 8 }]}
            value={statusNote}
            onChangeText={setStatusNote}
            placeholder="Add a note about this status change..."
            placeholderTextColor={COLORS.textDim}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowStatusModal(false)}>
              <Text style={{ color: COLORS.textMuted, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirm, { backgroundColor: COLORS.primary }]}
              onPress={confirmStatusChange}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirm</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Field({ label, value, valueColor }: { label: string; value: string | null | undefined; valueColor?: string }) {
  if (!value) return null;
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <Text style={[fieldStyles.value, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border + '40' },
  label: { fontSize: 10, color: COLORS.textDim, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },
  headerCard: {
    backgroundColor: COLORS.navy, borderRadius: 16, padding: 16,
    borderLeftWidth: 4, gap: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  quoteRef: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  itemDesc: { fontSize: 16, fontWeight: '600', color: COLORS.text, lineHeight: 22 },
  overdueAlert: {
    backgroundColor: COLORS.error + '20', borderColor: COLORS.error + '60',
    borderWidth: 1, borderRadius: 8, padding: 10,
  },
  overdueText: { color: COLORS.error, fontSize: 13, fontWeight: '700' },
  approvalBadge: { borderRadius: 8, padding: 8 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  cardTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.textDim,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  },
  notesText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  filesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  fileItem: {
    backgroundColor: COLORS.surfaceHigh, borderRadius: 10, padding: 12,
    alignItems: 'center', gap: 4, width: 88, borderWidth: 1, borderColor: COLORS.border,
  },
  fileIcon: { fontSize: 22 },
  fileName: { fontSize: 10, color: COLORS.text, textAlign: 'center' },
  fileSize: { fontSize: 9, color: COLORS.textDim },
  actionsCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  actionsSubLabel: { fontSize: 11, color: COLORS.textDim, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary + '50',
    borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
  },
  statusBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  actionBtn: {
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceHigh,
  },
  claimBtn: { backgroundColor: COLORS.success + '15', borderColor: COLORS.success + '50' },
  releaseBtn: { backgroundColor: COLORS.warning + '10', borderColor: COLORS.warning + '40' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  fieldLabel: { fontSize: 11, color: COLORS.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginHorizontal: 16 },
  fieldInput: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 12, color: COLORS.text, fontSize: 14,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16 },
  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  modalConfirm: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
});
