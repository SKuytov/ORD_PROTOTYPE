import React, { useMemo, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, Dimensions
} from 'react-native';
import { getOrders, Order } from '../../src/api/orders';
import { COLORS, STATUS_COLORS } from '../../src/constants';
import { fmtPrice } from '../../src/utils';
import KpiCard from '../../src/components/KpiCard';

const { width: SCREEN_W } = Dimensions.get('window');
const BAR_MAX_W = SCREEN_W - 80;

function SimpleBar({ label, value, max, color, suffix = '' }: {
  label: string; value: number; max: number; color: string; suffix?: string;
}) {
  const pct = max > 0 ? (value / max) : 0;
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label} numberOfLines={1}>{label}</Text>
      <View style={barStyles.barWrap}>
        <View style={[barStyles.bar, { width: pct * (BAR_MAX_W - 120), backgroundColor: color }]} />
      </View>
      <Text style={barStyles.value}>{suffix}{value.toLocaleString()}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  label: { width: 90, fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  barWrap: {
    flex: 1, height: 20, backgroundColor: COLORS.surfaceHigh,
    borderRadius: 4, overflow: 'hidden', justifyContent: 'center',
  },
  bar: { height: '100%', borderRadius: 4, minWidth: 4 },
  value: { width: 60, fontSize: 11, color: COLORS.text, fontWeight: '700', textAlign: 'right' },
});

function PieSlice({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <View style={pieStyles.container}>
      {data.map((d, i) => (
        <View key={i} style={pieStyles.row}>
          <View style={[pieStyles.dot, { backgroundColor: d.color }]} />
          <Text style={pieStyles.label} numberOfLines={1}>{d.label}</Text>
          <View style={pieStyles.barWrap}>
            <View style={[pieStyles.bar, {
              width: total > 0 ? `${(d.value / total) * 100}%` : '0%',
              backgroundColor: d.color,
            }]} />
          </View>
          <Text style={pieStyles.count}>{d.value}</Text>
          <Text style={pieStyles.pct}>{total > 0 ? Math.round((d.value / total) * 100) : 0}%</Text>
        </View>
      ))}
    </View>
  );
}

const pieStyles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  label: { width: 110, fontSize: 11, color: COLORS.textMuted },
  barWrap: { flex: 1, height: 16, backgroundColor: COLORS.surfaceHigh, borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4, minWidth: 4 },
  count: { width: 30, fontSize: 11, color: COLORS.text, fontWeight: '700', textAlign: 'right' },
  pct: { width: 32, fontSize: 10, color: COLORS.textDim, textAlign: 'right' },
});

export default function AnalyticsScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getOrders({});
      setOrders(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const totalOrders = orders.length;
  const totalSpend = orders.reduce((s, o) => s + (Number(o.total_price) || 0), 0);
  const delivered = orders.filter(o => o.status === 'Delivered').length;
  const uniqueSuppliers = new Set(orders.filter(o => o.supplier_id).map(o => o.supplier_id)).size;

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([label, value]) => ({
        label, value,
        color: STATUS_COLORS[label] ?? COLORS.textMuted,
      }));
  }, [orders]);

  const byBuilding = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => { map[o.building] = (map[o.building] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [orders]);

  const spendByBuilding = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => { map[o.building] = (map[o.building] || 0) + (Number(o.total_price) || 0); });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a);
  }, [orders]);

  const byPriority = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => { map[o.priority] = (map[o.priority] || 0) + 1; });
    const colors: Record<string, string> = { Critical: '#ef4444', High: '#f59e0b', Normal: '#3b82f6', Low: '#94a3b8' };
    return Object.entries(map).map(([label, value]) => ({ label, value, color: colors[label] ?? COLORS.textMuted }));
  }, [orders]);

  const topSuppliers = useMemo(() => {
    const map: Record<string, { count: number; spend: number }> = {};
    orders.forEach(o => {
      if (o.supplier_name) {
        if (!map[o.supplier_name]) map[o.supplier_name] = { count: 0, spend: 0 };
        map[o.supplier_name].count++;
        map[o.supplier_name].spend += Number(o.total_price) || 0;
      }
    });
    return Object.entries(map).sort(([, a], [, b]) => b.spend - a.spend).slice(0, 8);
  }, [orders]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      const d = new Date(o.submission_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  }, [orders]);
  const maxMonthly = Math.max(...monthlyTrend.map(([, v]) => v), 1);

  const maxByBuilding = Math.max(...byBuilding.map(([, v]) => v), 1);
  const maxSpend = Math.max(...spendByBuilding.map(([, v]) => v), 1);
  const maxSupplierSpend = Math.max(...topSuppliers.map(([, v]) => v.spend), 1);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* KPI strip */}
      <View style={styles.kpiRow}>
        <KpiCard title="Total Orders" value={totalOrders} />
        <KpiCard title="Delivered" value={delivered} color={COLORS.success} />
        <KpiCard title="Suppliers" value={uniqueSuppliers} color={COLORS.info} />
        <KpiCard title="Total Spend" value={`€${fmtPrice(totalSpend)}`} color={COLORS.emerald} />
      </View>

      {/* Orders by Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Orders by Status</Text>
        <PieSlice data={byStatus} />
      </View>

      {/* Orders by Priority */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Orders by Priority</Text>
        <PieSlice data={byPriority} />
      </View>

      {/* Orders by Building */}
      {byBuilding.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Orders by Building</Text>
          {byBuilding.map(([label, value]) => (
            <SimpleBar key={label} label={label} value={value} max={maxByBuilding} color={COLORS.primary} />
          ))}
        </View>
      )}

      {/* Spend by Building */}
      {spendByBuilding.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spend by Building</Text>
          {spendByBuilding.map(([label, value]) => (
            <SimpleBar key={label} label={label} value={Math.round(value)} max={maxSpend} color={COLORS.emerald} suffix="€" />
          ))}
        </View>
      )}

      {/* Top Suppliers */}
      {topSuppliers.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Suppliers by Spend</Text>
          {topSuppliers.map(([name, data]) => (
            <View key={name} style={styles.supplierRow}>
              <View style={{ flex: 1 }}>
                <SimpleBar label={name} value={Math.round(data.spend)} max={maxSupplierSpend} color={COLORS.purple} suffix="€" />
              </View>
              <Text style={styles.supplierOrders}>{data.count} orders</Text>
            </View>
          ))}
        </View>
      )}

      {/* Monthly Trend */}
      {monthlyTrend.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Order Trend</Text>
          <View style={styles.trendContainer}>
            {monthlyTrend.map(([month, count]) => (
              <View key={month} style={styles.trendBar}>
                <Text style={styles.trendCount}>{count}</Text>
                <View style={[styles.trendBarFill, {
                  height: Math.max(4, (count / maxMonthly) * 100),
                  backgroundColor: COLORS.primary,
                }]} />
                <Text style={styles.trendMonth}>{month.slice(5)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  kpiRow: { flexDirection: 'row', gap: 8 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.text,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12,
  },
  supplierRow: { flexDirection: 'row', alignItems: 'center' },
  supplierOrders: { fontSize: 10, color: COLORS.textDim, marginLeft: 4, width: 50, textAlign: 'right' },
  trendContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 130, gap: 4, justifyContent: 'space-between',
    paddingTop: 20,
  },
  trendBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  trendCount: { fontSize: 9, color: COLORS.textDim, fontWeight: '600' },
  trendBarFill: { width: '100%', borderRadius: 3, minHeight: 4 },
  trendMonth: { fontSize: 8, color: COLORS.textDim, fontWeight: '500' },
});
