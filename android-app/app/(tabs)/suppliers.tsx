import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, ScrollView, Linking,
  Modal, Switch
} from 'react-native';
import { getSuppliers, createSupplier, Supplier } from '../../src/api/suppliers';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants';
import { fmtDate } from '../../src/utils';

function StarRating({ score }: { score: number }) {
  const stars = Math.round((score / 10) * 5);
  return (
    <View style={starStyles.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={[starStyles.star, { color: i < stars ? '#f59e0b' : COLORS.border }]}>★</Text>
      ))}
      <Text style={starStyles.score}>{Number(score).toFixed(1)}</Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  star: { fontSize: 14 },
  score: { fontSize: 11, color: COLORS.textMuted, marginLeft: 4 },
});

export default function SuppliersScreen() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [showNew, setShowNew] = useState(false);

  const isProcurement = user?.role === 'procurement' || user?.role === 'admin';

  const load = useCallback(async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = suppliers.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contact_person?.toLowerCase().includes(q)) ||
      (s.specialization?.toLowerCase().includes(q)) ||
      (s.country?.toLowerCase().includes(q)) ||
      (s.category_tags?.toLowerCase().includes(q))
    );
  });

  const renderSupplier = ({ item: s }: { item: Supplier }) => (
    <TouchableOpacity
      style={[styles.card, !s.active && styles.cardInactive]}
      onPress={() => setSelected(s)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.supplierName}>{s.name}</Text>
          {s.is_eu === 1 && (
            <View style={styles.euBadge}><Text style={styles.euBadgeText}>🇪🇺 EU</Text></View>
          )}
          {!s.active && (
            <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>Inactive</Text></View>
          )}
        </View>
        <StarRating score={s.performance_score} />
      </View>

      {s.specialization && (
        <Text style={styles.spec} numberOfLines={1}>{s.specialization}</Text>
      )}

      <View style={styles.meta}>
        {s.country && <Text style={styles.metaText}>📍 {s.country}</Text>}
        {s.contact_person && <Text style={styles.metaText}>👤 {s.contact_person}</Text>}
        <Text style={styles.metaText}>📦 {s.total_orders} orders</Text>
      </View>

      {s.category_tags && (
        <View style={styles.tagsRow}>
          {s.category_tags.split(',').slice(0, 4).map((tag, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{tag.trim()}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search + Add */}
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search suppliers..."
            placeholderTextColor={COLORS.textDim}
          />
        </View>
        {isProcurement && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowNew(true)}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.count}>{filtered.length} suppliers</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => String(s.id)}
          renderItem={renderSupplier}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 40 }}>🏢</Text>
              <Text style={styles.emptyTitle}>No suppliers found</Text>
            </View>
          }
        />
      )}

      {/* Supplier Detail Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <SupplierDetail supplier={selected} onClose={() => setSelected(null)} onRefresh={load} canEdit={isProcurement} />
        )}
      </Modal>

      {/* New Supplier Modal */}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNew(false)}>
        <NewSupplierForm
          onClose={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); load(); }}
        />
      </Modal>
    </View>
  );
}

function SupplierDetail({ supplier: s, onClose, onRefresh, canEdit }: {
  supplier: Supplier; onClose: () => void; onRefresh: () => void; canEdit: boolean;
}) {
  return (
    <View style={detailStyles.container}>
      <View style={detailStyles.handle} />
      <View style={detailStyles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={detailStyles.closeBtn}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={detailStyles.title} numberOfLines={1}>{s.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={detailStyles.scroll}>
        {/* Badges row */}
        <View style={detailStyles.badgesRow}>
          {s.is_eu === 1 && <View style={detailStyles.euBadge}><Text style={detailStyles.euText}>🇪🇺 EU Supplier</Text></View>}
          <View style={[detailStyles.statusBadge, { backgroundColor: s.active ? COLORS.success + '20' : COLORS.textDim + '20' }]}>
            <Text style={[detailStyles.statusText, { color: s.active ? COLORS.success : COLORS.textDim }]}>
              {s.active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Rating */}
        <View style={detailStyles.card}>
          <Text style={detailStyles.cardLabel}>Performance Rating</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Text key={i} style={{ fontSize: 22, color: i < Math.round((s.performance_score / 10) * 5) ? '#f59e0b' : COLORS.border }}>★</Text>
            ))}
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>{Number(s.performance_score).toFixed(1)} / 10</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={detailStyles.statsRow}>
          <View style={detailStyles.statCard}>
            <Text style={detailStyles.statValue}>{s.total_orders}</Text>
            <Text style={detailStyles.statLabel}>Total Orders</Text>
          </View>
          <View style={detailStyles.statCard}>
            <Text style={detailStyles.statValue}>{s.last_order_date ? fmtDate(s.last_order_date) : '—'}</Text>
            <Text style={detailStyles.statLabel}>Last Order</Text>
          </View>
        </View>

        {/* Contact */}
        <View style={detailStyles.card}>
          <Text style={detailStyles.cardLabel}>Contact</Text>
          {[
            { icon: '👤', val: s.contact_person },
            { icon: '📧', val: s.email, link: s.email ? `mailto:${s.email}` : undefined },
            { icon: '📞', val: s.phone, link: s.phone ? `tel:${s.phone}` : undefined },
            { icon: '📍', val: [s.address, s.country].filter(Boolean).join(', ') || null },
            { icon: '🌐', val: s.website, link: s.website ?? undefined },
          ].filter(r => r.val).map((r, i) => (
            <TouchableOpacity
              key={i}
              style={detailStyles.contactRow}
              onPress={() => r.link && Linking.openURL(r.link)}
              disabled={!r.link}
            >
              <Text style={detailStyles.contactIcon}>{r.icon}</Text>
              <Text style={[detailStyles.contactText, r.link && { color: COLORS.primary }]} numberOfLines={2}>
                {r.val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Specialization */}
        {s.specialization && (
          <View style={detailStyles.card}>
            <Text style={detailStyles.cardLabel}>Specialization</Text>
            <Text style={detailStyles.text}>{s.specialization}</Text>
          </View>
        )}

        {/* Tags */}
        {s.category_tags && (
          <View style={detailStyles.card}>
            <Text style={detailStyles.cardLabel}>Categories</Text>
            <View style={detailStyles.tagsRow}>
              {s.category_tags.split(',').map((tag, i) => (
                <View key={i} style={detailStyles.tag}>
                  <Text style={detailStyles.tagText}>{tag.trim()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {s.keywords && (
          <View style={detailStyles.card}>
            <Text style={detailStyles.cardLabel}>Keywords</Text>
            <Text style={detailStyles.text}>{s.keywords}</Text>
          </View>
        )}

        {s.notes && (
          <View style={detailStyles.card}>
            <Text style={detailStyles.cardLabel}>Notes</Text>
            <Text style={detailStyles.text}>{s.notes}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function NewSupplierForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [isEu, setIsEu] = useState(false);
  const [website, setWebsite] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Supplier name is required'); return; }
    setLoading(true);
    try {
      await createSupplier({
        name: name.trim(), contact_person: contactPerson || null,
        email: email || null, phone: phone || null,
        address: address || null, country: country || null,
        is_eu: isEu ? 1 : 0, website: website || null,
        specialization: specialization || null, notes: notes || null,
        active: 1,
      });
      Alert.alert('✅ Created', `Supplier "${name}" added successfully.`);
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={newStyles.container}>
      <View style={newStyles.handle} />
      <View style={newStyles.header}>
        <TouchableOpacity onPress={onClose}><Text style={newStyles.cancel}>Cancel</Text></TouchableOpacity>
        <Text style={newStyles.title}>New Supplier</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={newStyles.save}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={newStyles.scroll}>
        {[
          { label: 'Name *', value: name, set: setName, placeholder: 'Supplier name' },
          { label: 'Contact Person', value: contactPerson, set: setContactPerson, placeholder: 'Full name' },
          { label: 'Email', value: email, set: setEmail, placeholder: 'email@company.com', keyboard: 'email-address' as any },
          { label: 'Phone', value: phone, set: setPhone, placeholder: '+1 234 567 890', keyboard: 'phone-pad' as any },
          { label: 'Website', value: website, set: setWebsite, placeholder: 'https://...' },
          { label: 'Address', value: address, set: setAddress, placeholder: 'Street, City' },
          { label: 'Country', value: country, set: setCountry, placeholder: 'Bulgaria, Germany...' },
          { label: 'Specialization', value: specialization, set: setSpecialization, placeholder: 'e.g. Electrical, Bearings' },
        ].map(f => (
          <View key={f.label} style={newStyles.field}>
            <Text style={newStyles.label}>{f.label}</Text>
            <TextInput
              style={newStyles.input}
              value={f.value}
              onChangeText={f.set}
              placeholder={f.placeholder}
              placeholderTextColor={COLORS.textDim}
              keyboardType={f.keyboard}
            />
          </View>
        ))}
        <View style={newStyles.switchRow}>
          <Text style={newStyles.label}>EU Supplier</Text>
          <Switch value={isEu} onValueChange={setIsEu} trackColor={{ true: COLORS.primary }} />
        </View>
        <View style={newStyles.field}>
          <Text style={newStyles.label}>Notes</Text>
          <TextInput
            style={[newStyles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            value={notes} onChangeText={setNotes}
            placeholder="Additional notes..." placeholderTextColor={COLORS.textDim}
            multiline numberOfLines={3}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center' },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 10,
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 10 },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  count: { fontSize: 11, color: COLORS.textDim, paddingHorizontal: 16, marginBottom: 4 },
  list: { padding: 12, paddingBottom: 40, gap: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  cardInactive: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginRight: 8 },
  supplierName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  euBadge: {
    backgroundColor: '#3b82f620', borderColor: '#3b82f640',
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  euBadgeText: { fontSize: 10, color: '#3b82f6', fontWeight: '600' },
  inactiveBadge: {
    backgroundColor: COLORS.textDim + '20', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  inactiveBadgeText: { fontSize: 10, color: COLORS.textDim },
  spec: { fontSize: 12, color: COLORS.textMuted },
  meta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: COLORS.textDim },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tag: {
    backgroundColor: COLORS.surfaceHigh, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.border,
  },
  tagText: { fontSize: 10, color: COLORS.textMuted },
});

const detailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  closeBtn: { fontSize: 14, color: COLORS.textMuted },
  scroll: { padding: 16, gap: 12 },
  badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  euBadge: {
    backgroundColor: '#3b82f615', borderColor: '#3b82f640',
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  euText: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardLabel: {
    fontSize: 10, color: COLORS.textDim, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  contactIcon: { fontSize: 16, width: 24 },
  contactText: { fontSize: 14, color: COLORS.text, flex: 1 },
  text: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: COLORS.surfaceHigh, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tagText: { fontSize: 12, color: COLORS.textMuted },
});

const newStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cancel: { fontSize: 15, color: COLORS.textMuted },
  save: { fontSize: 15, color: COLORS.primary, fontWeight: '700' },
  scroll: { padding: 16, gap: 4 },
  field: { marginBottom: 14 },
  label: {
    fontSize: 11, color: COLORS.textDim, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 11,
    color: COLORS.text, fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border + '40',
    marginBottom: 14,
  },
});
