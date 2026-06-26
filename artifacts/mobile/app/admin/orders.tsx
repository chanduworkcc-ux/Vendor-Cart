import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdmin } from '@/context/AdminContext';
import { adminFetch } from '@/lib/adminApi';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: number;
  orderRef: string;
  title: string;
  amount: number;
  status: OrderStatus;
  createdAt: string;
  userName?: string;
  isLocked?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', processing: '#3B82F6', shipped: '#8B5CF6', delivered: '#10B981', cancelled: '#EF4444',
};

const STATUS_FLOW: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered'];

export default function AdminOrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { adminToken } = useAdmin();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders-mobile'],
    queryFn: async () => {
      const res = await adminFetch('/api/orders', adminToken);
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    },
    enabled: !!adminToken,
    retry: 1,
  });

  const orders: Order[] = (data?.data || []).map((o: any) => ({
    id: o.id,
    orderRef: o.orderRef,
    title: o.title,
    amount: o.amount,
    status: o.status,
    createdAt: o.createdAt,
    userName: o.userName,
    isLocked: o.isLocked,
  }));

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const advanceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await adminFetch(`/api/orders/${id}/status`, adminToken, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders-mobile'] }); setSelectedOrder(null); },
  });

  const advanceStatus = (order: Order) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    advanceMutation.mutate({ id: order.id, status: next });
  };

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminFetch(`/api/orders/${id}/status`, adminToken, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders-mobile'] }); setSelectedOrder(null); },
  });

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity style={[styles.orderCard, { backgroundColor: colors.card }]} onPress={() => setSelectedOrder(item)} activeOpacity={0.8}>
      <View style={styles.orderTop}>
        <Text style={[styles.orderId, { color: colors.foreground }]}>{item.orderRef}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={[styles.orderCustomer, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
      {item.userName && <Text style={[styles.orderCustomer, { color: colors.mutedForeground, fontSize: 12 }]}>{item.userName}</Text>}
      <View style={styles.orderBottom}>
        <Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <Text style={[styles.orderAmount, { color: colors.primary }]}>₹{item.amount}</Text>
      </View>
    </TouchableOpacity>
  );

  const FILTER_OPTIONS: Array<OrderStatus | 'all'> = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (!adminToken) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orders</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Feather name="lock" size={48} color={colors.mutedForeground} />
          <Text style={{ color: colors.foreground, fontSize: 17, fontFamily: 'Inter_700Bold', marginTop: 16, textAlign: 'center' }}>API Access Required</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8, textAlign: 'center' }}>Connect your admin account from the dashboard to view live orders.</Text>
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
        <Text style={styles.headerTitle}>Orders</Text>
        <Text style={styles.headerCount}>{orders.length} total</Text>
      </View>

      <View style={{ backgroundColor: colors.card }}>
        <FlatList
          horizontal data={FILTER_OPTIONS} keyExtractor={(i) => i}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, { backgroundColor: filter === item ? colors.primary : colors.secondary }]}
              onPress={() => setFilter(item)}
            >
              <Text style={{ color: filter === item ? '#fff' : colors.foreground, fontSize: 12, fontFamily: 'Inter_500Medium', textTransform: 'capitalize' }}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered} keyExtractor={(i) => String(i.id)} renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: 'Inter_400Regular' }}>No orders in this category</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!selectedOrder} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedOrder(null)}>
        {selectedOrder && (
          <View style={[styles.modalWrap, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedOrder.orderRef}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedOrder.status] + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[selectedOrder.status] }]}>{selectedOrder.status}</Text>
              </View>
            </View>
            <View style={{ padding: 20, gap: 14 }}>
              {[
                { label: 'Order Title', value: selectedOrder.title },
                { label: 'Customer', value: selectedOrder.userName ?? '—' },
                { label: 'Amount', value: `₹${selectedOrder.amount}` },
                { label: 'Date', value: new Date(selectedOrder.createdAt).toLocaleDateString() },
              ].map(({ label, value }) => (
                <View key={label} style={[styles.detailRow, { backgroundColor: colors.card }]}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
                </View>
              ))}
              <View style={[styles.timelineCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.timelineTitle, { color: colors.foreground }]}>Order Timeline</Text>
                {STATUS_FLOW.map((s, i) => {
                  const done = STATUS_FLOW.indexOf(selectedOrder.status) >= i;
                  return (
                    <View key={s} style={styles.timelineStep}>
                      <View style={[styles.timelineDot, { backgroundColor: done ? colors.primary : colors.border }]}>
                        {done && <Feather name="check" size={10} color="#fff" />}
                      </View>
                      {i < STATUS_FLOW.length - 1 && <View style={[styles.timelineLine, { backgroundColor: done ? colors.primary : colors.border }]} />}
                      <Text style={[styles.timelineLabel, { color: done ? colors.foreground : colors.mutedForeground, textTransform: 'capitalize' }]}>{s}</Text>
                    </View>
                  );
                })}
              </View>
              {selectedOrder.isLocked && (
                <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="lock" size={14} color="#D97706" />
                  <Text style={{ color: '#D97706', fontSize: 13, fontFamily: 'Inter_500Medium' }}>This order is locked by an admin</Text>
                </View>
              )}
              {!selectedOrder.isLocked && selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => advanceStatus(selectedOrder)} activeOpacity={0.85}>
                  <Feather name="arrow-right" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>
                    {selectedOrder.status === 'pending' ? 'Mark Processing' : selectedOrder.status === 'processing' ? 'Mark as Shipped' : 'Mark as Delivered'}
                  </Text>
                </TouchableOpacity>
              )}
              {!selectedOrder.isLocked && selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.destructive }]} onPress={() => cancelMutation.mutate(selectedOrder.id)} activeOpacity={0.85}>
                  <Text style={[styles.cancelBtnText, { color: colors.destructive }]}>Cancel Order</Text>
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
  headerCount: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Inter_400Regular' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  orderCard: { borderRadius: 14, padding: 14, elevation: 1 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderId: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
  orderCustomer: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  orderAmount: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  modalWrap: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { flex: 1, fontSize: 17, fontFamily: 'Inter_700Bold' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12 },
  detailLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  detailValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'right', flex: 1, paddingLeft: 16 },
  timelineCard: { borderRadius: 14, padding: 16 },
  timelineTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 16 },
  timelineStep: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  timelineDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { position: 'absolute', left: 9, top: 20, width: 2, height: 20 },
  timelineLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
