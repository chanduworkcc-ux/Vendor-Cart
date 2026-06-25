import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

interface StatCardProps { icon: string; label: string; value: string; color: string; onPress?: () => void }
function StatCard({ icon, label, value, color, onPress }: StatCardProps) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface QuickActionProps { icon: string; label: string; color: string; onPress: () => void }
function QuickAction({ icon, label, color, onPress }: QuickActionProps) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.qaIcon, { backgroundColor: color }]}>
        <Feather name={icon as any} size={20} color="#fff" />
      </View>
      <Text style={[styles.qaLabel, { color: colors.foreground }]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { storeSettings, adminLogout, announcements } = useAdmin();
  const { totalItems: cartItems } = useCart();
  const { totalItems: wishlistItems } = useWishlist();
  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const handleLogout = () => {
    adminLogout();
    router.replace('/(tabs)/profile');
  };

  const RECENT_ACTIVITY = [
    { icon: 'user', text: 'New customer registered', time: '2 min ago', color: '#10B981' },
    { icon: 'shopping-bag', text: 'Order #1042 placed', time: '15 min ago', color: '#2563EB' },
    { icon: 'heart', text: '3 items added to wishlists', time: '1 hr ago', color: '#EF4444' },
    { icon: 'star', text: 'New 5-star review received', time: '2 hr ago', color: '#F59E0B' },
    { icon: 'package', text: 'Order #1041 shipped', time: '3 hr ago', color: '#8B5CF6' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 16, backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.headerSub}>Admin Dashboard</Text>
          <Text style={styles.headerTitle}>{storeSettings.storeName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Feather name="log-out" size={18} color="#fff" />
          <Text style={styles.logoutText}>Exit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 80 : 110, gap: 0 }}
      >
        {/* Maintenance Mode Warning */}
        {storeSettings.maintenanceMode && (
          <View style={[styles.warningBanner, { backgroundColor: '#FEF3C7' }]}>
            <Feather name="alert-triangle" size={16} color="#D97706" />
            <Text style={[styles.warningText, { color: '#D97706' }]}>Store is in Maintenance Mode — customers cannot checkout</Text>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="shopping-bag" label="Total Orders" value="0" color="#2563EB" onPress={() => router.push('/admin/orders')} />
          <StatCard icon="dollar-sign" label="Revenue" value="₹0" color="#10B981" onPress={() => router.push('/admin/analytics')} />
          <StatCard icon="package" label="Products" value="0" color="#8B5CF6" onPress={() => router.push('/admin/products')} />
          <StatCard icon="users" label="Customers" value="0" color="#F59E0B" onPress={() => router.push('/admin/customers')} />
          <StatCard icon="heart" label="Wishlists" value={String(wishlistItems)} color="#EF4444" />
          <StatCard icon="shopping-cart" label="Cart Items" value={String(cartItems)} color="#06B6D4" onPress={() => router.push('/admin/orders')} />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            <QuickAction icon="plus-circle" label="Add Product" color="#2563EB" onPress={() => router.push('/admin/products')} />
            <QuickAction icon="list" label="All Orders" color="#10B981" onPress={() => router.push('/admin/orders')} />
            <QuickAction icon="users" label="Customers" color="#8B5CF6" onPress={() => router.push('/admin/customers')} />
            <QuickAction icon="bar-chart-2" label="Analytics" color="#F59E0B" onPress={() => router.push('/admin/analytics')} />
            <QuickAction icon="percent" label="Discounts" color="#EF4444" onPress={() => router.push('/admin/discounts')} />
            <QuickAction icon="settings" label="Settings" color="#06B6D4" onPress={() => router.push('/admin/settings')} />
          </View>
        </View>

        {/* Announcements */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Announcements</Text>
            <TouchableOpacity onPress={() => router.push('/admin/settings')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Manage</Text>
            </TouchableOpacity>
          </View>
          {announcements.slice(0, 2).map((a) => (
            <View key={a.id} style={[styles.announcementCard, { backgroundColor: colors.card, borderLeftColor: colors.primary }]}>
              <Feather name="megaphone" size={14} color={colors.primary} />
              <Text style={[styles.announcementText, { color: colors.foreground }]}>{a.text}</Text>
            </View>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
          <View style={[styles.activityCard, { backgroundColor: colors.card }]}>
            {RECENT_ACTIVITY.map((item, i) => (
              <View key={i} style={[styles.activityRow, { borderBottomColor: colors.border, borderBottomWidth: i < RECENT_ACTIVITY.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
                <View style={[styles.activityIcon, { backgroundColor: item.color + '20' }]}>
                  <Feather name={item.icon as any} size={14} color={item.color} />
                </View>
                <Text style={[styles.activityText, { color: colors.foreground }]}>{item.text}</Text>
                <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{item.time}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Admin Nav */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Manage Store</Text>
          <View style={[styles.navCard, { backgroundColor: colors.card }]}>
            {[
              { icon: 'package', label: 'Products', route: '/admin/products' },
              { icon: 'list', label: 'Orders', route: '/admin/orders' },
              { icon: 'users', label: 'Customers', route: '/admin/customers' },
              { icon: 'percent', label: 'Discounts & Promos', route: '/admin/discounts' },
              { icon: 'bar-chart-2', label: 'Analytics', route: '/admin/analytics' },
              { icon: 'bell', label: 'Announcements', route: '/admin/settings' },
              { icon: 'settings', label: 'Store Settings', route: '/admin/settings' },
            ].map((item, i, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.navRow, { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.navIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name={item.icon as any} size={17} color={colors.primary} />
                </View>
                <Text style={[styles.navLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Inter_500Medium' },
  headerTitle: { color: '#fff', fontSize: 24, fontFamily: 'Inter_700Bold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  logoutText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_500Medium' },
  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  warningText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { width: '30%', flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, minWidth: 100, elevation: 1 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  seeAll: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: { width: '30%', flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 8, minWidth: 90, elevation: 1 },
  qaIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  announcementCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderLeftWidth: 3, marginBottom: 8, elevation: 1 },
  announcementText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  activityCard: { borderRadius: 16, overflow: 'hidden', elevation: 1 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  activityIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  activityTime: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  navCard: { borderRadius: 16, overflow: 'hidden', elevation: 1 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  navIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
});
