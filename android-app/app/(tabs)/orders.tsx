import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  RefreshControl, ActivityIndicator, Pressable
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getOrders, Order, OrderFilters } from '../../src/api/orders';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants';
import OrderCard from '../../src/components/OrderCard';
import FilterSheet from '../../src/components/FilterSheet';

export default function OrdersScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ status?: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({
    sort: 'id_desc',
    status: params.status,
  });

  const load = useCallback(async (currentFilters: OrderFilters, searchTerm: string) => {
    try {
      const result = await getOrders({
        ...currentFilters,
        search: searchTerm || undefined,
      });
      setOrders(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(filters, search);
  }, [filters, load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      load(filters, search);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    load(filters, search);
  };

  const activeFilterCount = [
    filters.status, filters.building, filters.priority,
    filters.date_from, filters.date_to, filters.assigned_filter,
  ].filter(Boolean).length;

  const currentSortLabel = {
    'id_desc': 'Newest ↓',
    'id_asc': 'Oldest ↑',
    'date_desc': 'Date ↓',
    'date_asc': 'Date ↑',
    'priority': 'Priority',
    'due_date': 'Due Date',
  }[filters.sort ?? 'id_desc'] ?? 'Sort';

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search orders, parts, buildings..."
          placeholderTextColor={COLORS.textDim}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter / Sort bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterBtnText}>
            ⚙️ Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.sortBtnText}>↕ {currentSortLabel}</Text>
        </TouchableOpacity>

        <Text style={styles.countText}>{orders.length} orders</Text>
      </View>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFilters}>
          {filters.status && (
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setFilters(f => ({ ...f, status: undefined }))}
            >
              <Text style={styles.filterChipText}>{filters.status} ✕</Text>
            </TouchableOpacity>
          )}
          {filters.priority && (
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setFilters(f => ({ ...f, priority: undefined }))}
            >
              <Text style={styles.filterChipText}>{filters.priority} ✕</Text>
            </TouchableOpacity>
          )}
          {filters.building && (
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setFilters(f => ({ ...f, building: undefined }))}
            >
              <Text style={styles.filterChipText}>{filters.building} ✕</Text>
            </TouchableOpacity>
          )}
          {(filters.date_from || filters.date_to) && (
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setFilters(f => ({ ...f, date_from: undefined, date_to: undefined }))}
            >
              <Text style={styles.filterChipText}>
                📅 {filters.date_from ?? '…'} → {filters.date_to ?? '…'} ✕
              </Text>
            </TouchableOpacity>
          )}
          {filters.assigned_filter && (
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setFilters(f => ({ ...f, assigned_filter: undefined }))}
            >
              <Text style={styles.filterChipText}>
                {filters.assigned_filter === 'mine' ? 'My Orders' : 'Unassigned'} ✕
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.filterChip, { borderColor: COLORS.error + '60', backgroundColor: COLORS.error + '10' }]}
            onPress={() => setFilters({ sort: 'id_desc' })}
          >
            <Text style={[styles.filterChipText, { color: COLORS.error }]}>Clear All ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Orders list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.emptySub}>
            {activeFilterCount > 0 || search
              ? 'Try adjusting your filters or search term'
              : 'No orders available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={(o) => router.push(`/order/${o.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
        />
      )}

      {/* FAB — New Order */}
      {user?.role !== 'accounting' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/modal/new-order')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Filter sheet */}
      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        role={user?.role}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: 12,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 12,
  },
  clearIcon: {
    fontSize: 14,
    color: COLORS.textMuted,
    padding: 4,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  filterBtnText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  sortBtnText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  countText: {
    marginLeft: 'auto',
    fontSize: 11,
    color: COLORS.textDim,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
    backgroundColor: COLORS.primary + '10',
  },
  filterChipText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 100,
    paddingTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
});
