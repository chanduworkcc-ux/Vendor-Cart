import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string; customer: string; email: string; amount: number;
  status: OrderStatus; items: number; date: string; address: string;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', shipped: '#8B5CF6', delivered: '#10B981', cancelled: '#EF4444',
};

const MOCK_ORDERS: Order[] = [
  { id: 'ORD-1042', customer: 'Rajesh Kumar', email: 'rajesh@example.com', amount: 3498, status: 'pending', items: 2, date: '2026-06-24', address: 'Hyderabad, Telangana' },
  { id: 'ORD-1041', customer: 'Priya Sharma', email: 'priya@example.com', amount: 899, status: 'shipped', items: 1, date: '2026-06-23', address: 'Vijayawada, AP' },
  { id: 'ORD-1040', customer: 'Arjun Reddy', email: 'arjun@example.com', amount: 5247, status: 'delivered', items: 3, date: '2026-06-22', address: 'Bangalore, Karnataka' },
  { id: 'ORD-1039', customer: 'Sneha Patel', email: 'sneha@example.com', amount: 1999, status: 'confirmed', items: 1, date: '2026-06-22', address: 'Chennai, Tamil Nadu' },
  { id: 'ORD-1038', customer: 'Mohammed Ali', email: 'ali@example.com', amount: 2498, status: 'cancelled', items: 2, date: '2026-06-21', address: 'Hyderabad, Telangana' },
];

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];

export default function AdminOrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const advanceStatus = (order: Order) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: next } : o));
    setSelectedOrder((prev) => prev ? { ...prev, status: next } : null);
  };

  const cancelOrder = (order: Order) => {
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: 'cancelled' } : o));
    setSelectedOrder(null);
  };

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity style={[styles.orderCard, { backgroundColor: colors.card }]} onPress={() => setSelectedOrder(item)} activeOpacity={0.8}>
      <View style={styles.orderTop}>
        <Text style={[styles.orderId, { color: colors.foreground }]}>{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={[styles.orderCustomer, { color: colors.foreground }]}>{item.customer}</Text>
      <View style={styles.orderBottom}>
        <Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>{item.items} item{item.items > 1 ? 's' : ''} · {item.date}</Text>
        <Text style={[styles.orderAmount, { color: colors.primary }]}>₹{item.amount}</Text>
      </View>
    </TouchableOpacity>
  );

  const FILTER_OPTIONS: Array<OrderStatus | 'all'> = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
        <Text style={styles.headerCount}>{orders.length} total</Text>
      </View>

      {/* Filter Tabs */}
      <View style={{ backgroundColor: colors.card }}>
        <FlatList
          horizontal
          data={FILTER_OPTIONS}
          keyExtractor={(i) => i}
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

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Feather name="inbox" size={40} color={colors.mutedForeground} /><Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: 'Inter_400Regular' }}>No orders in this category</Text></View>}
      />

      {/* Order Detail Modal */}
      <Modal visible={!!selectedOrder} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedOrder(null)}>
        {selectedOrder && (
          <View style={[styles.modalWrap, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedOrder.id}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedOrder.status] + '20' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[selectedOrder.status] }]}>{selectedOrder.status}</Text>
              </View>
            </View>
            <View style={{ padding: 20, gap: 14 }}>
              {[
                { label: 'Customer', value: selectedOrder.customer },
                { label: 'Email', value: selectedOrder.email },
                { label: 'Address', value: selectedOrder.address },
                { label: 'Order Date', value: selectedOrder.date },
                { label: 'Items', value: String(selectedOrder.items) },
                { label: 'Total Amount', value: `₹${selectedOrder.amount}` },
              ].map(({ label, value }) => (
                <View key={label} style={[styles.detailRow, { backgroundColor: colors.card }]}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
                </View>
              ))}

              {/* Status Timeline */}
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

              {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => advanceStatus(selectedOrder)} activeOpacity={0.85}>
                  <Feather name="arrow-right" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>
                    {selectedOrder.status === 'pending' ? 'Confirm Order' : selectedOrder.status === 'confirmed' ? 'Mark as Shipped' : 'Mark as Delivered'}
                  </Text>
                </TouchableOpacity>
              )}
              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.destructive }]} onPress={() => cancelOrder(selectedOrder)} activeOpacity={0.85}>
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
  orderCustomer: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 6 },
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
