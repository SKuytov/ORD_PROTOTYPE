import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { router } from 'expo-router';
import { getQuotes, updateQuoteStatus, Quote } from '../../src/api/quotes';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants';
import { fmtDate, fmtPrice } from '../../src/utils';

const QUOTE_STATUS_COLORS: Record<string, string> = {
  'Draft': '#94a3b8',
  'Sent to Supplier': '#3b82f6',
  'Received': '#a855f7',
  'Under Approval': '#f59e0b',
  'Approved': '#22c55e',
  'Rejected': '#ef4444',
};

export default function QuotesScreen() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getQuotes();
      setQuotes(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const getNextStatus = (current: string): string | null => {
    switch (current) {
      case 'Draft': return 'Sent to Supplier';
      case 'Sent to Supplier': return 'Received';
      case 'Received': return 'Under Approval';
      default: return null;
    }
  };

  const renderQuote = ({ item }: { item: Quote }) => {
    const color = QUOTE_STATUS_COLORS[item.status] ?? COLORS.textMuted;
    const nextStatus = getNextStatus(item.status);
    const isProcurement = user?.role === 'procurement' || user?.role === 'admin';
    const isManager = user?.role === 'manager' || user?.role === 'admin';

    return (
      <View style={styles.card}>
        {/* Status strip */}
        <View style={[styles.strip, { backgroundColor: color }]} />

        <View style={styles.cardBody}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.quoteNumber}>{item.quote_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: color + '20', borderColor: color + '60' }]}>
              <Text style={[styles.statusText, { color }]}>{item.status}</Text>
            </View>
          </View>

          {/* Supplier */}
          {item.supplier_name && (
            <Text style={styles.supplier}>🏢 {item.supplier_name}</Text>
          )}

          {/* Amount and dates */}
          <View style={styles.metaRow}>
            {item.total_amount != null && (
              <Text style={styles.amount}>
                💰 {fmtPrice(item.total_amount)} {item.currency ?? 'EUR'}
              </Text>
            )}
            <Text style={styles.meta}>Created: {fmtDate(item.created_at)}</Text>
            {item.valid_until && (
              <Text style={styles.meta}>Valid until: {fmtDate(item.valid_until)}</Text>
            )}
          </View>

          {/* Notes */}
          {item.notes && (
            <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            {/* Advance workflow */}
            {isProcurement && nextStatus && (
              <TouchableOpacity
                style={styles.advanceBtn}
                onPress={() => {
                  Alert.alert(
                    'Update Status',
                    `Move to "${nextStatus}"?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Confirm',
                        onPress: async () => {
                          try {
                            await updateQuoteStatus(item.id, nextStatus);
                            load();
                          } catch (err: any) {
                            Alert.alert('Error', err.message);
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.advanceBtnText}>→ {nextStatus}</Text>
              </TouchableOpacity>
            )}

            {/* Manager approval */}
            {isManager && item.status === 'Under Approval' && (
              <>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={async () => {
                    try {
                      await updateQuoteStatus(item.id, 'Approved');
                      load();
                    } catch (err: any) {
                      Alert.alert('Error', err.message);
                    }
                  }}
                >
                  <Text style={styles.approveBtnText}>✅ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={async () => {
                    try {
                      await updateQuoteStatus(item.id, 'Rejected');
                      load();
                    } catch (err: any) {
                      Alert.alert('Error', err.message);
                    }
                  }}
                >
                  <Text style={styles.rejectBtnText}>❌ Reject</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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

  // Group quotes
  const pending = quotes.filter(q => !['Approved', 'Rejected'].includes(q.status));
  const completed = quotes.filter(q => ['Approved', 'Rejected'].includes(q.status));

  return (
    <View style={styles.container}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        {Object.entries(QUOTE_STATUS_COLORS).map(([status, color]) => {
          const count = quotes.filter(q => q.status === status).length;
          if (count === 0) return null;
          return (
            <View key={status} style={[styles.statItem, { borderTopColor: color }]}>
              <Text style={[styles.statCount, { color }]}>{count}</Text>
              <Text style={styles.statLabel}>{status.split(' ')[0]}</Text>
            </View>
          );
        })}
      </View>

      <FlatList
        data={[...pending, ...completed]}
        keyExtractor={item => String(item.id)}
        renderItem={renderQuote}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ fontSize: 48 }}>💬</Text>
            <Text style={styles.emptyTitle}>No Quotes</Text>
            <Text style={styles.emptySub}>Quotes will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  statItem: {
    paddingTop: 6,
    paddingHorizontal: 10,
    borderTopWidth: 3,
    alignItems: 'center',
    minWidth: 50,
  },
  statCount: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 9, color: COLORS.textDim, fontWeight: '600', marginTop: 2 },

  list: { padding: 12, paddingBottom: 40, gap: 10 },

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  strip: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 8 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteNumber: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  supplier: { fontSize: 13, color: COLORS.text, fontWeight: '600' },

  metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  amount: { fontSize: 14, fontWeight: '700', color: COLORS.emerald },
  meta: { fontSize: 11, color: COLORS.textMuted },
  notes: { fontSize: 12, color: COLORS.textDim, fontStyle: 'italic' },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  advanceBtn: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary + '60',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  advanceBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  approveBtn: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success + '60',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  approveBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.success },

  rejectBtn: {
    backgroundColor: COLORS.error + '10',
    borderColor: COLORS.error + '40',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  rejectBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.error },
});
