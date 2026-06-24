import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text, Easing } from 'react-native';

export function LoadingScreen() {
  const spin1 = useRef(new Animated.Value(0)).current;
  const spin2 = useRef(new Animated.Value(0)).current;
  const spin3 = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(spin1, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.timing(spin2, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.timing(spin3, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.08,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const rotate1 = spin1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotate2 = spin2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const rotate3 = spin3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Animated.View style={[styles.outerRing, { transform: [{ rotate: rotate1 }] }]}>
        <View style={styles.ringDot} />
      </Animated.View>
      <Animated.View style={[styles.middleRing, { transform: [{ rotate: rotate2 }] }]}>
        <View style={styles.ringDotMid} />
      </Animated.View>
      <Animated.View style={[styles.innerRing, { transform: [{ rotate: rotate3 }] }]}>
        <View style={styles.ringDotInner} />
      </Animated.View>
      <Animated.View style={[styles.core, { transform: [{ scale }] }]}>
        <View style={styles.coreInner} />
      </Animated.View>
      <Text style={styles.label}>ShopAll</Text>
    </Animated.View>
  );
}

const BLUE = '#2563EB';
const LIGHT_BLUE = '#60A5FA';
const PALE_BLUE = '#BFDBFE';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  outerRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: PALE_BLUE,
    borderTopColor: BLUE,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  ringDot: {
    position: 'absolute',
    top: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLUE,
  },
  middleRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: PALE_BLUE,
    borderBottomColor: LIGHT_BLUE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  ringDotMid: {
    position: 'absolute',
    bottom: -5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LIGHT_BLUE,
  },
  innerRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: PALE_BLUE,
    borderLeftColor: BLUE,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  ringDotInner: {
    position: 'absolute',
    left: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: BLUE,
  },
  core: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  coreInner: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
  },
  label: {
    marginTop: 100,
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#0D1B4B',
    letterSpacing: -0.5,
  },
});
