import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

const USER = {
  name: 'Guest User',
  email: 'guest@shopall.com',
  initials: 'G',
  ordersCount: 0,
};

interface RowItem {
  icon: string;
  label: string;
  onPress?: () => void;
}

interface Section {
  title: string;
  rows: RowItem[];
}

function SettingsRow({ icon, label, onPress }: RowItem) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={17} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { totalItems: cartItems } = useCart();
  const { totalItems: wishlistItems } = useWishlist();

  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const sections: Section[] = [
    {
      title: 'ACCOUNT',
      rows: [
        { icon: 'user', label: 'Personal Information' },
        { icon: 'map-pin', label: 'Saved Addresses' },
        { icon: 'credit-card', label: 'Payment Methods' },
      ],
    },
    {
      title: 'ORDERS',
      rows: [
        { icon: 'package', label: 'Order History' },
        { icon: 'refresh-cw', label: 'Returns & Refunds' },
        { icon: 'truck', label: 'Track Orders' },
      ],
    },
    {
      title: 'PREFERENCES',
      rows: [
        { icon: 'bell', label: 'Notifications' },
        { icon: 'moon', label: 'Appearance' },
        { icon: 'globe', label: 'Language & Region' },
      ],
    },
    {
      title: 'SUPPORT',
      rows: [
        { icon: 'help-circle', label: 'Help Center' },
        { icon: 'message-circle', label: 'Contact Us' },
        { icon: 'star', label: 'Rate the App' },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 80 : 110, paddingHorizontal: 16, gap: 16 }}
      >
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{USER.initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>{USER.name}</Text>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{USER.email}</Text>
          </View>
          <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border }]}>
            <Feather name="edit-2" size={15} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{USER.ordersCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Orders</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{wishlistItems}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Wishlist</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{cartItems}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Cart Items</Text>
          </View>
        </View>

        {/* Settings Sections */}
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              {section.rows.map((row, idx) => (
                <View key={row.label} style={idx < section.rows.length - 1 ? undefined : styles.lastRow}>
                  <SettingsRow {...row} />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Admin Panel */}
        <TouchableOpacity style={[styles.adminBtn, { backgroundColor: colors.primary }]}>
          <Feather name="shield" size={18} color="#fff" />
          <Text style={styles.adminBtnText}>Admin Panel</Text>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  userEmail: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statNum: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statDivider: { width: 1 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    borderBottomWidth: 1,
  },
  lastRow: {},
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  adminBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  signOutText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
