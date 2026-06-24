import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useColors } from '@/hooks/useColors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export function ProductSkeleton() {
  const colors = useColors();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity }]}>
      <View style={[styles.imageBox, { backgroundColor: colors.secondary }]} />
      <View style={styles.info}>
        <View style={[styles.line, { backgroundColor: colors.muted, width: '80%' }]} />
        <View style={[styles.line, { backgroundColor: colors.muted, width: '50%', marginTop: 4 }]} />
        <View style={[styles.line, { backgroundColor: colors.muted, width: '40%', marginTop: 8 }]} />
      </View>
    </Animated.View>
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
  imageBox: {
    width: '100%',
    height: CARD_WIDTH,
  },
  info: {
    padding: 12,
  },
  line: {
    height: 12,
    borderRadius: 6,
  },
});
