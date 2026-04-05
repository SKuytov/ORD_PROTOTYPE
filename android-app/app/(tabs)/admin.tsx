import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Modal, ScrollView, Alert, ActivityIndicator, Switch
} from 'react-native';
import { getUsers, createUser, getAdminBuildings, getAdminCostCenters, createBuilding, createCostCenter, User, AdminBuilding, AdminCostCenter } from '../../src/api/admin';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants';
import { fmtDate } from '../../src/utils';

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444', procurement: '#3b82f6',
  manager: '#a855f7', accounting: '#10b981', requester: '#94a3b8',
};

type Tab = 'users' | 'buildings' | 'cost-centers';

export default function AdminScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('users');

  if (user?.role !== 'admin') {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40 }}>🛡️</Text>
        <Text style={styles.noAccess}>Admin access required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['users', 'buildings', 'cost-centers'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === 'cost-centers' ? 'Cost Centers' : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'users' && <UsersTab />}
      {tab === 'buildings' && <BuildingsTab />}
      {tab === 'cost-centers' && <CostCentersTab />}
    </View>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '', role: 'requester', building: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const d = await getUsers(); setUsers(d); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.username || !form.name || !form.password) {
      Alert.alert('Required', 'Username, name and password are required.'); return;
    }
    setSaving(true);
    try {
      await createUser(form);
      Alert.alert('✅ Created', `User "${form.name}" created.`);
      setShowNew(false);
      setForm({ username: '', name: '', email: '', password: '', role: 'requester', building: '' });
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const ROLES = ['admin', 'procurement', 'manager', 'accounting', 'requester'];

  return (
    <View style={styles.tabContent}>
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput} value={search} onChangeText={setSearch}
            placeholder="Search users..." placeholderTextColor={COLORS.textDim}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowNew(true)}>
          <Text style={styles.addBtnText}>+ Add User</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} /> : (
        <FlatList
          data={filtered}
          keyExtractor={u => String(u.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 40 }}
          renderItem={({ item: u }) => (
            <View style={styles.userCard}>
              <View style={[styles.roleTag, { backgroundColor: ROLE_COLORS[u.role] + '20', borderColor: ROLE_COLORS[u.role] + '50' }]}>
                <Text style={[styles.roleTagText, { color: ROLE_COLORS[u.role] }]}>{u.role}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{u.name}</Text>
                <Text style={styles.userMeta}>@{u.username}{u.email ? ` · ${u.email}` : ''}</Text>
                {u.building && <Text style={styles.userMeta}>🏭 {u.building}</Text>}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNew(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNew(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>New User</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.saveText}>Create</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 4 }}>
            {[
              { label: 'Username *', key: 'username', placeholder: 'e.g. john.smith' },
              { label: 'Full Name *', key: 'name', placeholder: 'John Smith' },
              { label: 'Email', key: 'email', placeholder: 'john@company.com' },
              { label: 'Password *', key: 'password', placeholder: 'Min 8 characters', secure: true },
              { label: 'Building', key: 'building', placeholder: 'Cotton Tape / Sliver...' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 14 }}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder} placeholderTextColor={COLORS.textDim}
                  secureTextEntry={f.secure}
                />
              </View>
            ))}
            <Text style={styles.fieldLabel}>Role</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ROLES.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChip, form.role === r && { backgroundColor: ROLE_COLORS[r] + '30', borderColor: ROLE_COLORS[r] }]}
                    onPress={() => setForm(p => ({ ...p, role: r }))}
                  >
                    <Text style={[styles.roleChipText, form.role === r && { color: ROLE_COLORS[r] }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function BuildingsTab() {
  const [buildings, setBuildings] = useState<AdminBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const d = await getAdminBuildings(); setBuildings(d); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.code || !form.name) { Alert.alert('Required', 'Code and name are required'); return; }
    setSaving(true);
    try {
      await createBuilding({ code: form.code, name: form.name, description: form.description || undefined });
      Alert.alert('✅ Created', `Building "${form.name}" added.`);
      setShowNew(false);
      setForm({ code: '', name: '', description: '' });
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.topBar}>
        <Text style={styles.countText}>{buildings.length} buildings</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowNew(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} /> : (
        <FlatList
          data={buildings}
          keyExtractor={b => String(b.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 40 }}
          renderItem={({ item: b }) => (
            <View style={styles.itemCard}>
              <View style={styles.codeTag}><Text style={styles.codeText}>{b.code}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{b.name}</Text>
                {b.description && <Text style={styles.itemDesc}>{b.description}</Text>}
              </View>
              <View style={[styles.activeDot, { backgroundColor: b.active ? COLORS.success : COLORS.textDim }]} />
            </View>
          )}
        />
      )}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNew(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNew(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>New Building</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 14 }}>
            {[
              { label: 'Code *', key: 'code', placeholder: 'e.g. CT, VY, LAB' },
              { label: 'Name *', key: 'name', placeholder: 'Cotton Tape / Sliver' },
              { label: 'Description', key: 'description', placeholder: 'Optional description' },
            ].map(f => (
              <View key={f.key}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder} placeholderTextColor={COLORS.textDim}
                  autoCapitalize="characters"
                />
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CostCentersTab() {
  const [centers, setCenters] = useState<AdminCostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const d = await getAdminCostCenters(); setCenters(d); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.code || !form.name) { Alert.alert('Required', 'Code and name are required'); return; }
    setSaving(true);
    try {
      await createCostCenter({ code: form.code, name: form.name, description: form.description || undefined });
      Alert.alert('✅ Created', `Cost center "${form.name}" added.`);
      setShowNew(false);
      setForm({ code: '', name: '', description: '' });
      load();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.topBar}>
        <Text style={styles.countText}>{centers.length} cost centers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowNew(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} /> : (
        <FlatList
          data={centers}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 40 }}
          renderItem={({ item: c }) => (
            <View style={styles.itemCard}>
              <View style={styles.codeTag}><Text style={styles.codeText}>{c.code}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{c.name}</Text>
                {c.description && <Text style={styles.itemDesc}>{c.description}</Text>}
              </View>
            </View>
          )}
        />
      )}
      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNew(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNew(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>New Cost Center</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 14 }}>
            {[
              { label: 'Code *', key: 'code', placeholder: 'e.g. CC-001' },
              { label: 'Name *', key: 'name', placeholder: 'Production Department' },
              { label: 'Description', key: 'description', placeholder: 'Optional' },
            ].map(f => (
              <View key={f.key}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder} placeholderTextColor={COLORS.textDim}
                />
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  noAccess: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 12,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabBtnText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  tabBtnTextActive: { color: COLORS.primary },
  tabContent: { flex: 1 },
  topBar: {
    flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  searchWrap: {
    flex: 1, backgroundColor: COLORS.surfaceHigh, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10,
  },
  searchInput: { color: COLORS.text, fontSize: 14, paddingVertical: 8 },
  countText: { flex: 1, fontSize: 13, color: COLORS.textMuted },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  roleTag: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, minWidth: 80, alignItems: 'center',
  },
  roleTagText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  userName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  userMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  codeTag: {
    backgroundColor: COLORS.primary + '20', borderRadius: 6, paddingHorizontal: 8,
    paddingVertical: 4, borderWidth: 1, borderColor: COLORS.primary + '40', minWidth: 50, alignItems: 'center',
  },
  codeText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cancelText: { fontSize: 15, color: COLORS.textMuted },
  saveText: { fontSize: 15, color: COLORS.primary, fontWeight: '700' },
  fieldLabel: {
    fontSize: 11, color: COLORS.textDim, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 11,
    color: COLORS.text, fontSize: 14,
  },
  roleChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  roleChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', textTransform: 'capitalize' },
});
