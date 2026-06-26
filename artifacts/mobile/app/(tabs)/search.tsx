import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useListProducts } from '@/hooks/useProducts';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/context/CartContext';

const TRENDING = ['Wireless Earbuds', 'Linen Shirt', 'Dark Chocolate', 'Yoga Mat', 'Smart Watch'];

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addToCart } = useCart();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const { data: allProductsData } = useListProducts({}, { query: { queryKey: ['products-all'] } });
  const allProducts = allProductsData?.data ?? [];

  const filtered = query.trim().length > 0
    ? allProducts.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.metadata?.category ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const renderResult = ({ item }: { item: any }) => {
    const price = item.prices?.[0];
    const amt = price?.unit_amount ?? 0;
    const category = item.metadata?.category ?? '';

    return (
      <TouchableOpacity
        style={[styles.resultRow, { backgroundColor: colors.card }]}
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
      >
        <View style={[styles.imgBox, { backgroundColor: colors.secondary }]}>
          {item.images?.[0] ? (
            <Image source={{ uri: item.images[0] }} style={styles.img} resizeMode="cover" />
          ) : (
            <Feather name="package" size={22} color={colors.mutedForeground} />
          )}
        </View>
        <View style={styles.rowInfo}>
          {category ? (
            <Text style={[styles.category, { color: colors.primary }]}>{category.toUpperCase()}</Text>
          ) : null}
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
          <Text style={[styles.price, { color: colors.foreground }]}>{formatPrice(amt)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (price) {
              addToCart({ productId: item.id, priceId: price.id, name: item.name, price: price.unit_amount ?? 0, currency: price.currency, image: item.images?.[0] });
            }
          }}
        >
          <Feather name="shopping-cart" size={15} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Search</Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.foreground }]}
          placeholder="Search products, categories..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {query.trim().length === 0 ? (
        <View style={styles.trending}>
          <Text style={[styles.trendingTitle, { color: colors.foreground }]}>Trending</Text>
          <View style={styles.trendingPills}>
            {TRENDING.map((term) => (
              <TouchableOpacity
                key={term}
                style={[styles.trendingPill, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setQuery(term)}
              >
                <Feather name="trending-up" size={13} color={colors.primary} />
                <Text style={[styles.trendingPillText, { color: colors.foreground }]}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderResult}
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === 'web' ? 80 : 110, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="search" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results for "{query}"</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try a different search term</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  input: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  trending: { paddingHorizontal: 16 },
  trendingTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 14 },
  trendingPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  trendingPillText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  imgBox: { width: 68, height: 68, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%' },
  rowInfo: { flex: 1 },
  category: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, marginBottom: 2 },
  name: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20, marginBottom: 4 },
  price: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
