import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants';
import PartPulseLogo from '../../src/components/PartPulseLogo';
import { router } from 'expo-router';

const ROLE_ICONS: Record<string, string> = {
  admin: '🛡️',
  procurement: '🛒',
  manager: '👔',
  accounting: '💼',
  requester: '📝',
};

const ROLE_DESC: Record<string, string> = {
  admin: 'Full access to all features, users, and settings',
  procurement: 'Manage orders, suppliers, and purchase orders',
  manager: 'Review and approve order requests',
  accounting: 'View financial data and invoices',
  requester: 'Submit and track order requests',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const openWebApp = () => {
    Linking.openURL('https://partpulse-orders.tail675c8b.ts.net/');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Logo */}
      <View style={styles.logoArea}>
        <PartPulseLogo size="md" />
      </View>

      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userUsername}>@{user?.username}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Role card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Role & Access</Text>
        <View style={styles.roleRow}>
          <Text style={styles.roleIcon}>{ROLE_ICONS[user?.role ?? 'requester'] ?? '👤'}</Text>
          <View>
            <Text style={styles.roleName}>
              {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
            </Text>
            <Text style={styles.roleDesc}>{ROLE_DESC[user?.role ?? 'requester']}</Text>
          </View>
        </View>
        {user?.building && (
          <View style={styles.buildingRow}>
            <Text style={styles.buildingLabel}>Department</Text>
            <Text style={styles.buildingValue}>🏭 {user.building}</Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Quick Access</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/orders')}>
          <Text style={styles.menuIcon}>📋</Text>
          <Text style={styles.menuLabel}>My Orders</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        {(user?.role !== 'accounting' && user?.role !== 'requester') && (
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/quotes')}>
            <Text style={styles.menuIcon}>💬</Text>
            <Text style={styles.menuLabel}>Quotes</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}
        {(user?.role === 'manager' || user?.role === 'admin') && (
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/approvals')}>
            <Text style={styles.menuIcon}>✅</Text>
            <Text style={styles.menuLabel}>Approvals</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.menuItem} onPress={openWebApp}>
          <Text style={styles.menuIcon}>🌐</Text>
          <Text style={styles.menuLabel}>Open Web App</Text>
          <Text style={styles.menuArrow}>↗</Text>
        </TouchableOpacity>
      </View>

      {/* Server info */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Connection</Text>
        <View style={styles.serverRow}>
          <View style={styles.serverDot} />
          <Text style={styles.serverText}>partpulse-orders.tail675c8b.ts.net</Text>
        </View>
        <Text style={styles.serverNote}>Connected via Tailscale Funnel</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>PartPulse Orders · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40, gap: 14 },

  logoArea: {
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 8,
  },

  userCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.navyLight + '40',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  userUsername: { fontSize: 13, color: COLORS.primary, marginTop: 2 },
  userEmail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleIcon: { fontSize: 28 },
  roleName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  roleDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  buildingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  buildingLabel: { fontSize: 12, color: COLORS.textDim, fontWeight: '500' },
  buildingValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  menuArrow: { fontSize: 20, color: COLORS.textDim },

  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  serverText: { fontSize: 13, color: COLORS.text, fontWeight: '500', flex: 1 },
  serverNote: { fontSize: 11, color: COLORS.textDim },

  logoutBtn: {
    backgroundColor: COLORS.error + '15',
    borderColor: COLORS.error + '40',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '700',
  },

  version: {
    fontSize: 11,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: 4,
  },
});
