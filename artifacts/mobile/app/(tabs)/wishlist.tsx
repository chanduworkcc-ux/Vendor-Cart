import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useWishlist, WishlistItem } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function WishlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, removeFromWishlist, totalItems } = useWishlist();
  const { addToCart } = useCart();

  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const handleAddToCart = (item: WishlistItem) => {
    addToCart({
      productId: item.productId,
      priceId: item.priceId,
      name: item.name,
      price: item.price,
      currency: item.currency,
      image: item.image,
    });
  };

  const renderItem = ({ item }: { item: WishlistItem }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={[styles.imgBox, { backgroundColor: colors.secondary }]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.img} resizeMode="cover" />
        ) : (
          <Feather name="package" size={24} color={colors.mutedForeground} />
        )}
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        {item.category ? (
          <Text style={[styles.category, { color: colors.primary }]}>{item.category.toUpperCase()}</Text>
        ) : null}
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.foreground }]}>{formatPrice(item.price)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={() => handleAddToCart(item)}
        >
          <Feather name="shopping-cart" size={15} color="#fff" />
          <Text style={styles.addBtnText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.deleteBtn, { backgroundColor: colors.secondary }]}
        onPress={() => removeFromWishlist(item.productId)}
      >
        <Feather name="trash-2" size={16} color={colors.destructive} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Wishlist</Text>
        {totalItems > 0 && (
          <Text style={[styles.count, { color: colors.mutedForeground }]}>{totalItems} item{totalItems !== 1 ? 's' : ''}</Text>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="heart" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your wishlist is empty</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Tap the heart icon on any product to save it here
          </Text>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/')}
          >
            <Text style={styles.shopBtnText}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.productId}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === 'web' ? 80 : 110, gap: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  count: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  imgBox: {
    width: 90,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 6, left: 6, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold' },
  info: { flex: 1, gap: 4 },
  category: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  name: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 21 },
  shopBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  shopBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
