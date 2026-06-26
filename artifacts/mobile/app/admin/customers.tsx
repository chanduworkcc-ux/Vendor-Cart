import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdmin } from '@/context/AdminContext';
import { adminFetch } from '@/lib/adminApi';

interface Customer {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = { approved: '#10B981', pending: '#F59E0B', rejected: '#EF4444' };

export default function AdminCustomersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { adminToken } = useAdmin();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Customer | null>(null);
  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers-mobile'],
    queryFn: async () => {
      const res = await adminFetch('/api/users', adminToken);
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    },
    enabled: !!adminToken,
    retry: 1,
  });

  const customers: Customer[] = (data?.data || []).map((u: any) => ({
    id: u.id, name: u.name, email: u.email, status: u.status, createdAt: u.createdAt,
  }));

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await adminFetch(`/api/users/${id}/status`, adminToken, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-customers-mobile'] }); setSelected(null); },
  });

  const renderItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={() => setSelected(item)} activeOpacity={0.8}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>{(item.name[0] ?? '?').toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
            <Text style={{ color: STATUS_COLORS[item.status], fontSize: 10, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase' }}>{item.status}</Text>
          </View>
        </View>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{item.email}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>Joined {new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  if (!adminToken) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customers</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Feather name="lock" size={48} color={colors.mutedForeground} />
          <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: 'Inter_700Bold', marginTop: 16, textAlign: 'center' }}>API Access Required</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8, textAlign: 'center' }}>Connect your admin account from the dashboard to view live customers.</Text>
        </View>
      </View>
    );
  }

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
          { label: 'Approved', value: customers.filter((c) => c.status === 'approved').length, color: '#10B981' },
          { label: 'Pending', value: customers.filter((c) => c.status === 'pending').length, color: '#F59E0B' },
          { label: 'Rejected', value: customers.filter((c) => c.status === 'rejected').length, color: '#EF4444' },
        ].map((s) => (
          <View key={s.label} style={[styles.statChip, { backgroundColor: colors.card, flex: 1 }]}>
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLab, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={customers} keyExtractor={(i) => String(i.id)} renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: 'Inter_400Regular' }}>No customers found</Text>
            </View>
          }
        />
      )}

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
                  <Text style={styles.bigAvatarText}>{(selected.name[0] ?? '?').toUpperCase()}</Text>
                </View>
                <Text style={[styles.name, { color: colors.foreground, fontSize: 18 }]}>{selected.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selected.status] + '20' }]}>
                  <Text style={{ color: STATUS_COLORS[selected.status], fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase' }}>{selected.status}</Text>
                </View>
              </View>
              {[
                { label: 'Email', value: selected.email, icon: 'mail' },
                { label: 'Joined', value: new Date(selected.createdAt).toLocaleDateString(), icon: 'calendar' },
              ].map(({ label, value, icon }) => (
                <View key={label} style={[styles.detailRow, { backgroundColor: colors.card }]}>
                  <Feather name={icon as any} size={16} color={colors.primary} />
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
                </View>
              ))}
              {selected.status !== 'approved' && (
                <TouchableOpacity
                  style={[styles.blockBtn, { backgroundColor: '#10B981', marginTop: 8 }]}
                  onPress={() => statusMutation.mutate({ id: selected.id, status: 'approved' })}
                  activeOpacity={0.85}
                >
                  <Feather name="user-check" size={16} color="#fff" />
                  <Text style={styles.blockBtnText}>Approve Customer</Text>
                </TouchableOpacity>
              )}
              {selected.status !== 'rejected' && (
                <TouchableOpacity
                  style={[styles.blockBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => statusMutation.mutate({ id: selected.id, status: 'rejected' })}
                  activeOpacity={0.85}
                >
                  <Feather name="user-x" size={16} color="#fff" />
                  <Text style={styles.blockBtnText}>Reject Customer</Text>
                </TouchableOpacity>
              )}
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
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
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
