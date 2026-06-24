import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { useColors } from '@/hooks/useColors';

export function CartBadge() {
  const { totalItems } = useCart();
  const colors = useColors();
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push('/cart')} activeOpacity={0.8} style={styles.container}>
      <Feather name="shopping-bag" size={22} color={colors.foreground} />
      {totalItems > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.count, { color: colors.accentForeground }]}>
            {totalItems > 9 ? '9+' : totalItems}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  count: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    lineHeight: 12,
  },
});
