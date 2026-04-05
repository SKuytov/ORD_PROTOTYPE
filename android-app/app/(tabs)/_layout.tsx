import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  const isProcurement = user?.role === 'procurement' || user?.role === 'admin';
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const canSeeSuppliers = isProcurement;
  const canSeeAnalytics = isProcurement || isManager || user?.role === 'accounting';

  const tabStyle = {
    tabBarStyle: {
      backgroundColor: COLORS.navyDark,
      borderTopColor: COLORS.border,
      height: 62,
      paddingBottom: 8,
    },
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.textMuted,
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
    headerStyle: { backgroundColor: COLORS.navyDark },
    headerTintColor: COLORS.text,
    headerTitleStyle: { fontWeight: '700' as const, fontSize: 17 },
  };

  return (
    <Tabs screenOptions={tabStyle}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard', tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
          headerTitle: 'PartPulse Orders',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders', tabBarLabel: 'Orders',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="quotes"
        options={isProcurement || isManager
          ? { title: 'Quotes', tabBarLabel: 'Quotes', tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} /> }
          : { href: null }
        }
      />
      <Tabs.Screen
        name="approvals"
        options={isManager
          ? { title: 'Approvals', tabBarLabel: 'Approvals', tabBarIcon: ({ focused }) => <TabIcon emoji="✅" focused={focused} /> }
          : { href: null }
        }
      />
      <Tabs.Screen
        name="suppliers"
        options={canSeeSuppliers
          ? { title: 'Suppliers', tabBarLabel: 'Suppliers', tabBarIcon: ({ focused }) => <TabIcon emoji="🏢" focused={focused} /> }
          : { href: null }
        }
      />
      <Tabs.Screen
        name="analytics"
        options={canSeeAnalytics
          ? { title: 'Analytics', tabBarLabel: 'Analytics', tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }
          : { href: null }
        }
      />
      <Tabs.Screen
        name="admin"
        options={isAdmin
          ? { title: 'Admin', tabBarLabel: 'Admin', tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }
          : { href: null }
        }
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile', tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
