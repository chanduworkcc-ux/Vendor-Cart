import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { setBaseUrl, useGetProduct } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/context/CartContext';

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addToCart } = useCart();
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const { data: product, isLoading, isError } = useGetProduct(id as string, {
    query: { queryKey: ['product', id], enabled: !!id }
  });

  const prices = product?.prices ?? [];
  const activePriceId = selectedPriceId ?? prices[0]?.id ?? null;
  const activePrice = prices.find((p) => p.id === activePriceId) ?? prices[0];

  const handleAddToCart = () => {
    if (!product || !activePrice) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addToCart({
      productId: product.id,
      priceId: activePrice.id,
      name: product.name,
      price: activePrice.unit_amount ?? 0,
      currency: activePrice.currency,
      image: product.images?.[0],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.destructive }]}>Product not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={[styles.backLinkText, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={[styles.heroContainer, { backgroundColor: colors.secondary }]}>
          {product.images?.[0] ? (
            <Image source={{ uri: product.images[0] }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Feather name="package" size={64} color={colors.mutedForeground} />
            </View>
          )}
          <TouchableOpacity
            style={[styles.backOverlay, { paddingTop: topPadding, backgroundColor: 'transparent' }]}
            onPress={() => router.back()}
          >
            <View style={[styles.backCircle, { backgroundColor: colors.card }]}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={[styles.content, { paddingBottom: 160 }]}>
          {product.metadata?.category ? (
            <Text style={[styles.category, { color: colors.accent }]}>
              {product.metadata.category}
            </Text>
          ) : null}

          <Text style={[styles.name, { color: colors.foreground }]}>{product.name}</Text>

          {/* Price selector */}
          {prices.length > 0 && (
            <View style={styles.priceSection}>
              {prices.length > 1 ? (
                <View style={styles.priceOptions}>
                  {prices.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.priceOption,
                        {
                          borderColor: p.id === activePriceId ? colors.primary : colors.border,
                          backgroundColor: p.id === activePriceId ? colors.primary : colors.card,
                        },
                      ]}
                      onPress={() => setSelectedPriceId(p.id)}
                    >
                      <Text style={{ color: p.id === activePriceId ? colors.primaryForeground : colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
                        {p.unit_amount != null ? `$${(p.unit_amount / 100).toFixed(2)}` : 'Free'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.price, { color: colors.primary }]}>
                  {activePrice?.unit_amount != null
                    ? `$${(activePrice.unit_amount / 100).toFixed(2)}`
                    : 'Free'}
                </Text>
              )}
            </View>
          )}

          {product.description ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>About this product</Text>
              <Text style={[styles.description, { color: colors.foreground }]}>{product.description}</Text>
            </>
          ) : null}

          {/* Mandatory policy notice — fixed on every product */}
          <View style={[styles.policyBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Feather name="alert-triangle" size={15} color="#DC2626" style={{ marginTop: 1 }} />
            <Text style={styles.policyText}>No Refund · No Exchange · No Return</Text>
          </View>

          {/* Metadata tags */}
          {Object.entries(product.metadata ?? {}).filter(([k]) => !['badge'].includes(k)).length > 0 && (
            <View style={styles.tags}>
              {Object.entries(product.metadata ?? {})
                .filter(([k]) => !['badge'].includes(k))
                .map(([k, v]) => (
                  <View key={k} style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{k}: </Text>
                    <Text style={[styles.tagText, { color: colors.foreground }]}>{v}</Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add to Cart Footer */}
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
        {/* Policy reminder directly above the button */}
        <Text style={[styles.footerPolicy, { color: '#DC2626' }]}>
          No Refund · No Exchange · No Return — All sales are final
        </Text>
        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: added ? colors.success : colors.primary },
          ]}
          onPress={handleAddToCart}
          activeOpacity={0.85}
        >
          <Feather name={added ? 'check' : 'shopping-bag'} size={18} color={colors.primaryForeground} />
          <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
            {added ? 'Added to Cart!' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  backLink: { padding: 8 },
  backLinkText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  heroContainer: { height: 320, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backOverlay: { position: 'absolute', top: 0, left: 0, padding: 16 },
  backCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  category: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 26, fontFamily: 'Inter_700Bold', lineHeight: 34, marginBottom: 16 },
  priceSection: { marginBottom: 20 },
  price: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  priceOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priceOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  sectionLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  description: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 24, marginBottom: 20 },
  policyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  policyText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#DC2626', flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tag: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  tagText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 16, gap: 10 },
  footerPolicy: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14 },
  addBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
