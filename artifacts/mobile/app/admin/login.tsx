import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';

const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function AdminLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { adminLogin } = useAdmin();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const shake = useRef(new Animated.Value(0)).current;
  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const doShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleKey = (key: string) => {
    setError('');
    if (key === '⌫') { setPin((p) => p.slice(0, -1)); return; }
    if (key === '') return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) {
      const ok = adminLogin(next);
      if (ok) {
        router.replace('/admin/dashboard');
      } else {
        doShake();
        setError('Incorrect PIN. Try again.');
        setTimeout(() => setPin(''), 600);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </TouchableOpacity>

      <View style={styles.top}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
          <Feather name="shield" size={32} color="#fff" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Admin Access</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Enter your 4-digit PIN</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>Default PIN: 1234</Text>
      </View>

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shake }] }]}>
        {[0,1,2,3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < pin.length ? colors.primary : colors.secondary,
                borderColor: i < pin.length ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </Animated.View>

      {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}

      <View style={styles.pad}>
        {PAD.map((key, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.padKey,
              {
                backgroundColor: key === '' ? 'transparent' : colors.card,
                borderColor: key === '' ? 'transparent' : colors.border,
              },
            ]}
            activeOpacity={key === '' ? 1 : 0.7}
            onPress={() => handleKey(key)}
            disabled={key === ''}
          >
            <Text style={[
              styles.padKeyText,
              {
                color: key === '⌫' ? colors.destructive : colors.foreground,
                fontSize: key === '⌫' ? 22 : 26,
              },
            ]}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 56, left: 20, zIndex: 10, padding: 8 },
  top: { alignItems: 'center', marginTop: 80, gap: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  dotsRow: { flexDirection: 'row', gap: 16, marginTop: 36, marginBottom: 8 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  errorText: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, marginTop: 32, gap: 0 },
  padKey: {
    width: 280 / 3, height: 80,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  padKeyText: { fontFamily: 'Inter_400Regular' },
});
