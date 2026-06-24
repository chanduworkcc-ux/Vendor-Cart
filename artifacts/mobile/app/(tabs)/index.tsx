import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { setBaseUrl, useListProducts, useListCategories } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { ProductSkeleton } from '@/components/SkeletonLoader';

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

const STORE_NAME = 'ShopAll';

function formatPrice(cents: number, currency = 'usd') {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addToCart, totalItems: cartCount } = useCart();
  const { addToWishlist, removeFromWishlist, isWishlisted } = useWishlist();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const { data: productsData, isLoading, refetch } = useListProducts(
    selectedCategory ? { category: selectedCategory } : {},
    { query: { queryKey: ['products', selectedCategory] } }
  );
  const { data: categoriesData } = useListCategories();

  const products = productsData?.data ?? [];
  const categories = categoriesData?.data ?? [];
  const featured = products.slice(0, 3);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const handleAddToCart = (item: any) => {
    const price = item.prices?.[0];
    if (price) {
      addToCart({
        productId: item.id,
        priceId: price.id,
        name: item.name,
        price: price.unit_amount ?? 0,
        currency: price.currency,
        image: item.images?.[0],
      });
    }
  };

  const handleToggleWishlist = (item: any) => {
    const price = item.prices?.[0];
    if (!price) return;
    if (isWishlisted(item.id)) {
      removeFromWishlist(item.id);
    } else {
      addToWishlist({
        productId: item.id,
        priceId: price.id,
        name: item.name,
        price: price.unit_amount ?? 0,
        currency: price.currency,
        image: item.images?.[0],
        category: item.metadata?.category,
        badge: item.metadata?.badge,
      });
    }
  };

  const renderFeaturedCard = (item: any) => {
    const price = item.prices?.[0];
    const amt = price?.unit_amount ?? 0;
    const category = item.metadata?.category ?? '';
    const badge = item.metadata?.badge;
    const wishlisted = isWishlisted(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.featuredCard, { backgroundColor: colors.card }]}
        activeOpacity={0.92}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
      >
        <View style={[styles.featuredImgBox, { backgroundColor: colors.secondary }]}>
          {item.images?.[0] ? (
            <Image source={{ uri: item.images[0] }} style={styles.featuredImg} resizeMode="cover" />
          ) : (
            <Feather name="package" size={28} color={colors.mutedForeground} />
          )}
          {badge && (
            <View style={[styles.badgeTag, { backgroundColor: colors.accent }]}>
              <Text style={styles.badgeTagText}>{badge === 'Sale' ? `-${badge}` : badge}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.wishlistBtn} onPress={() => handleToggleWishlist(item)}>
            <Feather name="heart" size={16} color={wishlisted ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        {category ? (
          <Text style={[styles.cardCategory, { color: colors.primary }]}>
            {category.toUpperCase()}
          </Text>
        ) : null}
        <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardBottom}>
          <Text style={[styles.cardPrice, { color: colors.foreground }]}>{formatPrice(amt)}</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleAddToCart(item)}
          >
            <Feather name="plus" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductRow = ({ item }: { item: any }) => {
    const price = item.prices?.[0];
    const amt = price?.unit_amount ?? 0;
    const category = item.metadata?.category ?? '';
    const badge = item.metadata?.badge;
    const wishlisted = isWishlisted(item.id);

    return (
      <TouchableOpacity
        style={[styles.productRow, { backgroundColor: colors.card }]}
        activeOpacity={0.92}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
      >
        <View style={[styles.rowImgBox, { backgroundColor: colors.secondary }]}>
          {item.images?.[0] ? (
            <Image source={{ uri: item.images[0] }} style={styles.rowImg} resizeMode="cover" />
          ) : (
            <Feather name="package" size={22} color={colors.mutedForeground} />
          )}
          {badge && (
            <View style={[styles.smallBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.smallBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <View style={styles.rowInfo}>
          {category ? (
            <Text style={[styles.rowCategory, { color: colors.primary }]}>{category.toUpperCase()}</Text>
          ) : null}
          <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
          <Text style={[styles.rowPrice, { color: colors.foreground }]}>{formatPrice(amt)}</Text>
        </View>
        <View style={styles.rowActions}>
          <TouchableOpacity onPress={() => handleToggleWishlist(item)} style={styles.heartBtn}>
            <Feather name="heart" size={18} color={wishlisted ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtnSm, { backgroundColor: colors.primary }]}
            onPress={() => handleAddToCart(item)}
          >
            <Feather name="plus" size={15} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <>
      {/* Hero Banner */}
      <View style={[styles.heroBanner, { backgroundColor: colors.primary }]}>
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>NEW ARRIVALS</Text>
          <Text style={styles.heroTitle}>Summer Collection 2026</Text>
          <TouchableOpacity style={styles.heroBtn}>
            <Text style={styles.heroBtnText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
        {categories.length > 0 && (
          <View style={styles.heroCats}>
            {categories.slice(0, 3).map((cat, i) => (
              <TouchableOpacity
                key={cat}
                style={[styles.heroCatTile, { backgroundColor: i === 0 ? '#E8EDF8' : '#DDE3F0' }]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Feather name="grid" size={18} color={colors.primary} />
                <Text style={[styles.heroCatLabel, { color: colors.foreground }]} numberOfLines={1}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Featured Section */}
      {featured.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Featured</Text>
            <TouchableOpacity onPress={() => setSelectedCategory(undefined)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {isLoading
              ? [0, 1, 2].map((i) => <ProductSkeleton key={i} />)
              : featured.map(renderFeaturedCard)}
          </ScrollView>
        </View>
      )}

      {/* All Products Header + Category Pills */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All Products</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: selectedCategory === undefined ? colors.primary : colors.card, borderColor: colors.border }]}
            onPress={() => setSelectedCategory(undefined)}
          >
            <Text style={[styles.pillText, { color: selectedCategory === undefined ? '#fff' : colors.foreground }]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, { backgroundColor: selectedCategory === cat ? colors.primary : colors.card, borderColor: colors.border }]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.pillText, { color: selectedCategory === cat ? '#fff' : colors.foreground }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </>
  );

  const emptyProduct = products.length === 0 && !isLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <View>
          <Text style={[styles.welcome, { color: colors.mutedForeground }]}>Welcome back</Text>
          <Text style={[styles.brand, { color: colors.foreground }]}>{STORE_NAME}</Text>
        </View>
        <TouchableOpacity
          style={[styles.cartIconBtn, { backgroundColor: colors.card }]}
          onPress={() => router.push('/(tabs)/cart')}
        >
          <Feather name="shopping-cart" size={20} color={colors.foreground} />
          {cartCount > 0 && (
            <View style={[styles.cartBubble, { backgroundColor: colors.primary }]}>
              <Text style={styles.cartBubbleText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar (decorative — taps go to Search tab) */}
      <TouchableOpacity
        style={[styles.searchBar, { backgroundColor: colors.card }]}
        activeOpacity={0.85}
        onPress={() => router.push('/(tabs)/search')}
      >
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>Search products...</Text>
      </TouchableOpacity>

      <FlatList
        data={isLoading ? [] : products}
        keyExtractor={(item) => item.id}
        renderItem={renderProductRow}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.skeletonRow, { backgroundColor: colors.card }]} />
              ))}
            </View>
          ) : emptyProduct ? (
            <View style={styles.empty}>
              <Feather name="shopping-bag" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No products yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Connect Stripe and seed products to get started
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 80 : 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />
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
  welcome: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  brand: { fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  cartIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBubble: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBubbleText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchPlaceholder: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  heroBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  heroText: { flex: 1, justifyContent: 'center' },
  heroEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold', marginVertical: 8, lineHeight: 26 },
  heroBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
  heroBtnText: { color: '#2563EB', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  heroCats: { width: 90, gap: 6, justifyContent: 'center' },
  heroCatTile: {
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    gap: 4,
  },
  heroCatLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  section: { paddingHorizontal: 16, marginTop: 20, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  seeAll: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  featuredRow: { gap: 12, paddingRight: 4 },
  featuredCard: {
    width: 160,
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  featuredImgBox: {
    height: 130,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  featuredImg: { width: '100%', height: '100%' },
  badgeTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeTagText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCategory: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, marginBottom: 3 },
  cardName: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 18, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  addBtn: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  pills: { paddingVertical: 12, gap: 8 },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  rowImgBox: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowImg: { width: '100%', height: '100%' },
  smallBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  smallBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  rowInfo: { flex: 1 },
  rowCategory: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, marginBottom: 2 },
  rowName: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20, marginBottom: 4 },
  rowPrice: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  rowActions: { alignItems: 'center', gap: 8 },
  heartBtn: { padding: 4 },
  addBtnSm: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  skeletonRow: { height: 94, borderRadius: 16, marginBottom: 10, marginHorizontal: 16 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 21 },
});
