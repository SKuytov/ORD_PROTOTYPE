import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { getOrders, Order } from '../../src/api/orders';
import { getPendingCount } from '../../src/api/approvals';
import { COLORS, STATUS_COLORS } from '../../src/constants';
import { fmtDate, isOverdue, isDueSoon } from '../../src/utils';
import KpiCard from '../../src/components/KpiCard';
import StatusBadge from '../../src/components/StatusBadge';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ordersData] = await Promise.all([
        getOrders({}),
      ]);
      setOrders(ordersData);

      if (user?.role === 'manager' || user?.role === 'admin') {
        const count = await getPendingCount();
        setPendingApprovals(count);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const activeOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status));
  const overdueOrders = activeOrders.filter(o => isOverdue(o.date_needed));
  const dueSoonOrders = activeOrders.filter(o => isDueSoon(o.date_needed, 7));
  const newOrders = orders.filter(o => o.status === 'New');
  const myOrders = orders.filter(o =>
    user?.role === 'requester'
      ? o.requester_id === user?.id
      : o.assigned_to_user_id === user?.id
  );

  // Status breakdown for chart
  const statusCounts: Record<string, number> = {};
  activeOrders.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Greeting */}
      <View style={styles.greetingCard}>
        <Text style={styles.greeting}>{greeting()}, {user?.name?.split(' ')[0]} 👋</Text>
        <Text style={styles.greetingSub}>
          {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
          {user?.building ? ` · ${user.building}` : ''}
        </Text>
      </View>

      {/* Alert banner */}
      {(overdueOrders.length > 0 || pendingApprovals > 0) && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => router.push('/(tabs)/orders')}
        >
          {overdueOrders.length > 0 && (
            <Text style={styles.alertText}>⚠️ {overdueOrders.length} overdue order{overdueOrders.length !== 1 ? 's' : ''}</Text>
          )}
          {pendingApprovals > 0 && (
            <Text style={styles.alertText}>✅ {pendingApprovals} pending approval{pendingApprovals !== 1 ? 's' : ''}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* KPI Strip */}
      <View style={styles.kpiRow}>
        <KpiCard title="Active" value={activeOrders.length} color={COLORS.info} />
        <KpiCard title="New" value={newOrders.length} color={COLORS.primary} />
        <KpiCard title="Overdue" value={overdueOrders.length} color={COLORS.error} />
        <KpiCard title="Due Soon" value={dueSoonOrders.length} color={COLORS.warning} />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>All Orders</Text>
          </TouchableOpacity>

          {(user?.role !== 'accounting') && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => router.push('/modal/new-order')}
            >
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionLabel}>New Order</Text>
            </TouchableOpacity>
          )}

          {(user?.role === 'manager' || user?.role === 'admin') && pendingApprovals > 0 && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnWarning]}
              onPress={() => router.push('/(tabs)/approvals')}
            >
              <Text style={styles.actionIcon}>✅</Text>
              <Text style={styles.actionLabel}>Approvals{'\n'}({pendingApprovals})</Text>
            </TouchableOpacity>
          )}

          {(user?.role === 'procurement' || user?.role === 'admin') && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(tabs)/quotes')}
            >
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionLabel}>Quotes</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Pipeline breakdown */}
      {Object.keys(statusCounts).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Pipeline</Text>
          <View style={styles.pipelineGrid}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <TouchableOpacity
                key={status}
                style={styles.pipelineItem}
                onPress={() => router.push({ pathname: '/(tabs)/orders', params: { status } })}
              >
                <View style={[styles.pipelineDot, { backgroundColor: STATUS_COLORS[status] ?? COLORS.textMuted }]} />
                <Text style={styles.pipelineCount}>{count}</Text>
                <Text style={styles.pipelineLabel}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Recent Orders */}
      {orders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          {orders.slice(0, 5).map(order => (
            <TouchableOpacity
              key={order.id}
              style={styles.recentItem}
              onPress={() => router.push(`/order/${order.id}`)}
            >
              <View style={styles.recentLeft}>
                <Text style={styles.recentId}>#{order.id}</Text>
                <Text style={styles.recentDesc} numberOfLines={1}>{order.item_description}</Text>
                <Text style={styles.recentMeta}>{order.building} · {fmtDate(order.submission_date)}</Text>
              </View>
              <StatusBadge label={order.status} size="sm" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  greetingCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.navyLight + '40',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  greetingSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  alertBanner: {
    backgroundColor: COLORS.error + '15',
    borderColor: COLORS.error + '40',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.error,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    minWidth: 80,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary + '60',
  },
  actionBtnWarning: {
    backgroundColor: COLORS.warning + '15',
    borderColor: COLORS.warning + '40',
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  pipelineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pipelineItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    minWidth: 90,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pipelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pipelineCount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  pipelineLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentLeft: {
    flex: 1,
    gap: 2,
    marginRight: 10,
  },
  recentId: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  recentDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  recentMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
