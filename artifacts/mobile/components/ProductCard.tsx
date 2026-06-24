import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Price {
  id: string;
  unit_amount: number | null;
  currency: string;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  metadata: Record<string, string>;
  prices: Price[];
}

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
}

export function ProductCard({ product, onPress, onAddToCart }: ProductCardProps) {
  const colors = useColors();
  const price = product.prices[0];
  const formattedPrice = price?.unit_amount != null
    ? `${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`
    : 'Price on request';

  const handleAddToCart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddToCart();
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.secondary }]}>
        {product.images[0] ? (
          <Image source={{ uri: product.images[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="package" size={32} color={colors.mutedForeground} />
          </View>
        )}
        {product.metadata?.badge ? (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.badgeText, { color: colors.accentForeground }]}>{product.metadata.badge}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>
        {product.metadata?.category ? (
          <Text style={[styles.category, { color: colors.mutedForeground }]} numberOfLines={1}>
            {product.metadata.category}
          </Text>
        ) : null}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.primary }]}>{formattedPrice}</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddToCart}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  info: {
    padding: 12,
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 18,
  },
  category: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  price: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
