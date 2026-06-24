import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setBaseUrl } from '@workspace/api-client-react';
import { useListProducts, useListCategories } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/ProductCard';
import { CategoryPill } from '@/components/CategoryPill';
import { CartBadge } from '@/components/CartBadge';
import { ProductSkeleton } from '@/components/SkeletonLoader';

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const { data: productsData, isLoading, refetch } = useListProducts(
    selectedCategory ? { category: selectedCategory } : {},
    { query: { queryKey: ['products', selectedCategory] } }
  );

  const { data: categoriesData } = useListCategories();

  const products = productsData?.data ?? [];
  const categories = categoriesData?.data ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const renderProduct = useCallback(({ item, index }: { item: any; index: number }) => {
    const price = item.prices?.[0];
    return (
      <View style={index % 2 === 0 ? styles.leftItem : styles.rightItem}>
        <ProductCard
          product={item}
          onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
          onAddToCart={() => {
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
          }}
        />
      </View>
    );
  }, [router, addToCart]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.brand, { color: colors.primary }]}>ShopAll</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Everything you need</Text>
        </View>
        <CartBadge />
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <View style={[styles.categoriesWrapper, { borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            <CategoryPill
              label="All"
              active={selectedCategory === undefined}
              onPress={() => setSelectedCategory(undefined)}
            />
            {categories.map((cat) => (
              <CategoryPill
                key={cat}
                label={cat}
                active={selectedCategory === cat}
                onPress={() => setSelectedCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Product Grid */}
      {isLoading ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={i % 2 === 0 ? styles.leftItem : styles.rightItem}>
              <ProductSkeleton />
            </View>
          ))}
        </View>
      ) : products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No products yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Connect Stripe and add products to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  brand: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  categoriesWrapper: {
    borderBottomWidth: 1,
  },
  categories: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  list: {
    padding: 16,
    gap: 0,
  },
  row: {
    justifyContent: 'space-between',
  },
  leftItem: {
    flex: 1,
    marginRight: 6,
  },
  rightItem: {
    flex: 1,
    marginLeft: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },
});
