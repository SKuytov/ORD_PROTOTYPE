import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, TextInput, Modal
} from 'react-native';
import { router } from 'expo-router';
import { getApprovals, approveOrder, rejectOrder, Approval } from '../../src/api/approvals';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, PRIORITY_COLORS } from '../../src/constants';
import { fmtDate, fmtRelative } from '../../src/utils';

export default function ApprovalsScreen() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectItem, setRejectItem] = useState<Approval | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getApprovals();
      setApprovals(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleApprove = async (approval: Approval) => {
    Alert.alert(
      'Approve Order',
      `Approve order #${approval.order_id} — ${approval.order_description}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setActionLoading(approval.id);
            try {
              await approveOrder(approval.id);
              load();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectItem) return;
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Please enter a rejection reason.');
      return;
    }
    setActionLoading(rejectItem.id);
    try {
      await rejectOrder(rejectItem.id, rejectReason.trim());
      setRejectItem(null);
      setRejectReason('');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const pending = approvals.filter(a => a.status === 'pending');
  const reviewed = approvals.filter(a => a.status !== 'pending');

  const renderApproval = ({ item }: { item: Approval }) => {
    const priorityColor = PRIORITY_COLORS[item.order_priority ?? 'Normal'] ?? COLORS.textMuted;
    const isPending = item.status === 'pending';
    const isActioning = actionLoading === item.id;

    return (
      <View style={[styles.card, !isPending && styles.cardReviewed]}>
        <View style={[styles.priorityStrip, { backgroundColor: priorityColor }]} />
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <TouchableOpacity onPress={() => router.push(`/order/${item.order_id}`)}>
              <Text style={styles.orderId}>Order #{item.order_id} →</Text>
            </TouchableOpacity>
            <View style={[
              styles.statusPill,
              {
                backgroundColor: isPending ? COLORS.warning + '20' : item.status === 'approved' ? COLORS.success + '20' : COLORS.error + '20',
                borderColor: isPending ? COLORS.warning + '60' : item.status === 'approved' ? COLORS.success + '60' : COLORS.error + '60',
              }
            ]}>
              <Text style={[
                styles.statusPillText,
                { color: isPending ? COLORS.warning : item.status === 'approved' ? COLORS.success : COLORS.error }
              ]}>
                {isPending ? '⏳ Pending' : item.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {item.order_description}
          </Text>

          {/* Meta */}
          <View style={styles.meta}>
            <Text style={styles.metaText}>🏭 {item.order_building}</Text>
            {item.order_priority && item.order_priority !== 'Normal' && (
              <Text style={[styles.metaText, { color: priorityColor }]}>
                ⚡ {item.order_priority}
              </Text>
            )}
            <Text style={styles.metaText}>📦 Qty: {item.order_quantity}</Text>
            {item.order_date_needed && (
              <Text style={styles.metaText}>📅 {fmtDate(item.order_date_needed)}</Text>
            )}
          </View>

          {/* Requester */}
          <Text style={styles.requester}>
            👤 Requested by {item.requester_name || item.requested_by_name} · {fmtRelative(item.created_at)}
          </Text>

          {/* Rejection reason */}
          {item.rejection_reason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionText}>❌ {item.rejection_reason}</Text>
            </View>
          )}

          {/* Actions */}
          {isPending && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.approveBtn]}
                onPress={() => handleApprove(item)}
                disabled={isActioning}
              >
                {isActioning ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnText}>✅ Approve</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn]}
                onPress={() => { setRejectItem(item); setRejectReason(''); }}
                disabled={isActioning}
              >
                <Text style={[styles.btnText, { color: COLORS.error }]}>❌ Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Review info */}
          {!isPending && item.reviewed_by_name && (
            <Text style={styles.reviewedBy}>
              By {item.reviewed_by_name} · {fmtRelative(item.reviewed_at)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: COLORS.warning }]}>{pending.length}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: COLORS.success }]}>
            {approvals.filter(a => a.status === 'approved').length}
          </Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: COLORS.error }]}>
            {approvals.filter(a => a.status === 'rejected').length}
          </Text>
          <Text style={styles.summaryLabel}>Rejected</Text>
        </View>
      </View>

      <FlatList
        data={[...pending, ...reviewed]}
        keyExtractor={item => String(item.id)}
        renderItem={renderApproval}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ fontSize: 48 }}>✅</Text>
            <Text style={styles.emptyTitle}>No Approvals</Text>
            <Text style={styles.emptySub}>Nothing pending your review</Text>
          </View>
        }
      />

      {/* Reject modal */}
      <Modal
        visible={!!rejectItem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRejectItem(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Reject Order #{rejectItem?.order_id}</Text>
          <Text style={styles.modalSub}>{rejectItem?.order_description}</Text>
          <Text style={styles.label}>Reason for rejection</Text>
          <TextInput
            style={styles.reasonInput}
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="Enter rejection reason..."
            placeholderTextColor={COLORS.textDim}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            autoFocus
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalCancelBtn]}
              onPress={() => setRejectItem(null)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalRejectBtn]}
              onPress={handleReject}
              disabled={actionLoading !== null}
            >
              {actionLoading !== null ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalBtnText}>Reject Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted },

  summary: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryCount: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  summaryDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  list: { padding: 12, paddingBottom: 40, gap: 10 },

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardReviewed: {
    opacity: 0.75,
  },
  priorityStrip: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 8 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  description: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 20,
  },
  meta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  requester: { fontSize: 11, color: COLORS.textDim },

  rejectionBox: {
    backgroundColor: COLORS.error + '10',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  rejectionText: { fontSize: 12, color: COLORS.error, fontWeight: '500' },

  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  approveBtn: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.error + '10',
    borderColor: COLORS.error + '40',
  },
  btnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  reviewedBy: { fontSize: 11, color: COLORS.textDim, fontStyle: 'italic' },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  label: {
    fontSize: 12, color: COLORS.textDim, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 120,
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  modalRejectBtn: {
    backgroundColor: COLORS.error,
  },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
