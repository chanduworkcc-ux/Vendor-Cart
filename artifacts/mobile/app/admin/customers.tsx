import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Customer {
  id: string; name: string; email: string; phone: string;
  orders: number; totalSpent: number; location: string;
  joinedDate: string; status: 'active' | 'blocked';
}

const MOCK_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '+91 9876543210', orders: 5, totalSpent: 12498, location: 'Hyderabad', joinedDate: '2025-01-15', status: 'active' },
  { id: '2', name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 8765432109', orders: 3, totalSpent: 4497, location: 'Vijayawada', joinedDate: '2025-03-20', status: 'active' },
  { id: '3', name: 'Arjun Reddy', email: 'arjun@example.com', phone: '+91 7654321098', orders: 8, totalSpent: 22344, location: 'Bangalore', joinedDate: '2024-11-05', status: 'active' },
  { id: '4', name: 'Sneha Patel', email: 'sneha@example.com', phone: '+91 9543210987', orders: 2, totalSpent: 2898, location: 'Chennai', joinedDate: '2025-05-10', status: 'active' },
  { id: '5', name: 'Mohammed Ali', email: 'ali@example.com', phone: '+91 9432109876', orders: 1, totalSpent: 2498, location: 'Hyderabad', joinedDate: '2025-06-01', status: 'blocked' },
];

export default function AdminCustomersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [selected, setSelected] = useState<Customer | null>(null);
  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const toggleBlock = (c: Customer) => {
    setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, status: x.status === 'blocked' ? 'active' : 'blocked' } : x));
    setSelected((prev) => prev ? { ...prev, status: prev.status === 'blocked' ? 'active' : 'blocked' } : null);
  };

  const renderItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, opacity: item.status === 'blocked' ? 0.7 : 1 }]} onPress={() => setSelected(item)} activeOpacity={0.8}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>{item.name[0]}</Text>
      </View>
      <View style={styles.info}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
          {item.status === 'blocked' && (
            <View style={[styles.blockedBadge, { backgroundColor: '#EF4444' + '20' }]}>
              <Text style={{ color: '#EF4444', fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>BLOCKED</Text>
            </View>
          )}
        </View>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{item.email}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.orders} orders · ₹{item.totalSpent.toLocaleString()}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customers</Text>
        <Text style={styles.headerCount}>{customers.length} total</Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 10, padding: 16 }}>
        {[
          { label: 'Active', value: customers.filter((c) => c.status === 'active').length, color: '#10B981' },
          { label: 'Blocked', value: customers.filter((c) => c.status === 'blocked').length, color: '#EF4444' },
          { label: 'Total Revenue', value: `₹${customers.reduce((s, c) => s + c.totalSpent, 0).toLocaleString()}`, color: '#2563EB' },
        ].map((s) => (
          <View key={s.label} style={[styles.statChip, { backgroundColor: colors.card, flex: 1 }]}>
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLab, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <FlatList data={customers} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 100 }} showsVerticalScrollIndicator={false} />

      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={[styles.modalWrap, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setSelected(null)}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Customer Detail</Text>
              <View style={{ width: 36 }} />
            </View>
            <View style={{ padding: 20, gap: 12 }}>
              <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={[styles.bigAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.bigAvatarText}>{selected.name[0]}</Text>
                </View>
                <Text style={[styles.name, { color: colors.foreground, fontSize: 18 }]}>{selected.name}</Text>
                {selected.status === 'blocked' && (
                  <View style={[styles.blockedBadge, { backgroundColor: '#EF4444' + '20' }]}>
                    <Text style={{ color: '#EF4444', fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>BLOCKED</Text>
                  </View>
                )}
              </View>
              {[
                { label: 'Email', value: selected.email, icon: 'mail' },
                { label: 'Phone', value: selected.phone, icon: 'phone' },
                { label: 'Location', value: selected.location, icon: 'map-pin' },
                { label: 'Joined', value: selected.joinedDate, icon: 'calendar' },
                { label: 'Total Orders', value: String(selected.orders), icon: 'package' },
                { label: 'Total Spent', value: `₹${selected.totalSpent.toLocaleString()}`, icon: 'dollar-sign' },
              ].map(({ label, value, icon }) => (
                <View key={label} style={[styles.detailRow, { backgroundColor: colors.card }]}>
                  <Feather name={icon as any} size={16} color={colors.primary} />
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.blockBtn, { backgroundColor: selected.status === 'blocked' ? '#10B981' : '#EF4444', marginTop: 8 }]}
                onPress={() => toggleBlock(selected)}
                activeOpacity={0.85}
              >
                <Feather name={selected.status === 'blocked' ? 'user-check' : 'user-x'} size={16} color="#fff" />
                <Text style={styles.blockBtnText}>{selected.status === 'blocked' ? 'Unblock Customer' : 'Block Customer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  headerCount: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  statChip: { borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLab: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 12, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  email: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  meta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  blockedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  modalWrap: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { color: '#fff', fontSize: 28, fontFamily: 'Inter_700Bold' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  detailLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', width: 80 },
  detailValue: { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  blockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  blockBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
