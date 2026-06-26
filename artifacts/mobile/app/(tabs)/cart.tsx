import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useColors } from '@/hooks/useColors';
import { useCart, CartItem } from '@/context/CartContext';

const ABANDONMENT_MINUTES = 15;

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, removeFromCart, updateQuantity, clearCart, totalAmount } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const abandonmentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastItemCount = useRef(0);

  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  // Cart abandonment detection — fire notification after ABANDONMENT_MINUTES if cart still has items
  useEffect(() => {
    if (abandonmentTimer.current) clearTimeout(abandonmentTimer.current);

    if (items.length > 0) {
      lastItemCount.current = items.length;
      abandonmentTimer.current = setTimeout(async () => {
        try {
          const domain = process.env.EXPO_PUBLIC_DOMAIN;
          if (!domain) return;
          await fetch(`https://${domain}/api/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch {}
      }, ABANDONMENT_MINUTES * 60 * 1000);
    }

    return () => {
      if (abandonmentTimer.current) clearTimeout(abandonmentTimer.current);
    };
  }, [items.length]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setIsCheckingOut(true);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const lineItems = items.map((item) => ({ priceId: item.priceId, quantity: item.quantity }));
      const res = await fetch(`https://${domain}/api/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems,
          successUrl: `https://${domain}`,
          cancelUrl: `https://${domain}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');
      await WebBrowser.openBrowserAsync(data.url);
      clearCart();
    } catch (err: any) {
      Alert.alert('Checkout Error', err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={[styles.item, { backgroundColor: colors.card }]}>
      <View style={[styles.imageBox, { backgroundColor: colors.secondary }]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <Feather name="package" size={22} color={colors.mutedForeground} />
        )}
      </View>

      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.itemPrice, { color: colors.primary }]}>
          {formatPrice(item.price * item.quantity)}
        </Text>
        <View style={styles.qtyControls}>
          <TouchableOpacity
            style={[styles.qtyBtn, { borderColor: colors.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateQuantity(item.priceId, item.quantity - 1); }}
          >
            <Feather name="minus" size={13} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyBtn, { borderColor: colors.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateQuantity(item.priceId, item.quantity + 1); }}
          >
            <Feather name="plus" size={13} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.deleteBtn, { backgroundColor: colors.secondary }]}
        onPress={() => removeFromCart(item.priceId)}
      >
        <Feather name="trash-2" size={16} color={colors.destructive} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={clearCart}>
            <Text style={[styles.clearText, { color: colors.destructive }]}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="shopping-cart" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your cart is empty</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Add some products and they'll appear here
          </Text>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/')}
          >
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.priceId}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 220, gap: 10 }}
            showsVerticalScrollIndicator={false}
          />

          <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 24 : 16) }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
              <Text style={[styles.summaryAmount, { color: colors.foreground }]}>{formatPrice(totalAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Shipping</Text>
              <Text style={[styles.summaryFree, { color: colors.success }]}>Free</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: colors.foreground }]}>{formatPrice(totalAmount)}</Text>
            </View>

            {/* Mandatory policy notice above checkout button */}
            <View style={[styles.policyRow, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Feather name="alert-triangle" size={13} color="#DC2626" />
              <Text style={styles.policyText}>No Refund · No Exchange · No Return — All sales are final</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutBtn, { backgroundColor: colors.primary, opacity: isCheckingOut ? 0.75 : 1 }]}
              onPress={handleCheckout}
              disabled={isCheckingOut}
              activeOpacity={0.85}
            >
              {isCheckingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="lock" size={16} color="#fff" />
                  <Text style={styles.checkoutText}>Checkout with Stripe</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  clearText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  imageBox: { width: 70, height: 70, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20, marginBottom: 4 },
  itemPrice: { fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 15, fontFamily: 'Inter_600SemiBold', minWidth: 20, textAlign: 'center' },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  shopBtn: { marginTop: 8, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
  shopBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    padding: 20,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  summaryAmount: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  summaryFree: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  divider: { height: 1, marginVertical: 4 },
  totalLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  totalAmount: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1 },
  policyText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#DC2626', flex: 1 },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  checkoutText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
