import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { setBaseUrl, useListOrders } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useListOrders({
    query: { queryKey: ['orders'] }
  });

  const orders = data?.data ?? [];

  const renderOrder = ({ item }: { item: any }) => {
    const date = new Date(item.created * 1000);
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const amount = `$${(item.amount / 100).toFixed(2)}`;

    return (
      <View style={[styles.order, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
          <Feather name="check-circle" size={20} color={colors.success} />
        </View>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderId, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.id}
          </Text>
          <Text style={[styles.orderDate, { color: colors.foreground }]}>{formatted}</Text>
          {item.customerEmail && (
            <Text style={[styles.orderEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.customerEmail}
            </Text>
          )}
        </View>
        <View style={styles.orderRight}>
          <Text style={[styles.orderAmount, { color: colors.foreground }]}>{amount}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
            <Text style={[styles.statusText, { color: colors.success }]}>Paid</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Orders</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {orders.length > 0 ? `${orders.length} recent` : 'Recent sales'}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <Feather name="loader" size={24} color={colors.mutedForeground} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Completed purchases will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  order: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfo: { flex: 1 },
  orderId: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  orderDate: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  orderEmail: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: 6 },
  orderAmount: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});
