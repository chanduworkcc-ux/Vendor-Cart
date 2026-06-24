import React, { useState } from 'react';
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

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, removeFromCart, updateQuantity, clearCart, totalAmount } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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
    <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.imageBox, { backgroundColor: colors.secondary }]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <Feather name="package" size={24} color={colors.mutedForeground} />
        )}
      </View>

      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.itemPrice, { color: colors.primary }]}>
          {((item.price / 100) * item.quantity).toFixed(2)} {item.currency.toUpperCase()}
        </Text>
      </View>

      <View style={styles.qtyControls}>
        <TouchableOpacity
          style={[styles.qtyBtn, { borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateQuantity(item.priceId, item.quantity - 1);
          }}
        >
          <Feather name="minus" size={14} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
        <TouchableOpacity
          style={[styles.qtyBtn, { borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateQuantity(item.priceId, item.quantity + 1);
          }}
        >
          <Feather name="plus" size={14} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => removeFromCart(item.priceId)} style={styles.removeBtn}>
        <Feather name="trash-2" size={16} color={colors.destructive} />
      </TouchableOpacity>
    </View>
  );

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={clearCart}>
            <Text style={[styles.clearText, { color: colors.destructive }]}>Clear</Text>
          </TouchableOpacity>
        )}
        {items.length === 0 && <View style={{ width: 40 }} />}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="shopping-bag" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your cart is empty</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Add items from the shop to get started
          </Text>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.shopBtnText, { color: colors.primaryForeground }]}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.priceId}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, { paddingBottom: 160 }]}
            showsVerticalScrollIndicator={false}
          />

          {/* Checkout Footer */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom + (Platform.OS === 'web' ? 24 : 16),
              },
            ]}
          >
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: colors.foreground }]}>
                ${(totalAmount / 100).toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, { backgroundColor: colors.primary, opacity: isCheckingOut ? 0.7 : 1 }]}
              onPress={handleCheckout}
              disabled={isCheckingOut}
              activeOpacity={0.85}
            >
              {isCheckingOut ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="lock" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.checkoutText, { color: colors.primaryForeground }]}>
                    Checkout with Stripe
                  </Text>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40 },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  clearText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  list: { padding: 16, gap: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  imageBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20 },
  itemPrice: { fontSize: 14, fontFamily: 'Inter_700Bold', marginTop: 4 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { fontSize: 15, fontFamily: 'Inter_600SemiBold', minWidth: 20, textAlign: 'center' },
  removeBtn: { padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  shopBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  shopBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    padding: 20,
    gap: 16,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  totalAmount: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  checkoutText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
