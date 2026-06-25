import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

const WEEKLY = [40, 65, 50, 80, 95, 70, 110];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TOP_PRODUCTS = [
  { name: 'Wireless Earbuds Pro', sales: 28, revenue: 55972 },
  { name: 'Running Shoes', sales: 19, revenue: 47481 },
  { name: 'Cotton Kurta Set', sales: 35, revenue: 31465 },
  { name: 'Smart LED Bulb', sales: 42, revenue: 14658 },
  { name: 'Bluetooth Speaker', sales: 15, revenue: 29985 },
];
const TOP_CATEGORIES = [
  { name: 'Electronics', pct: 38, color: '#2563EB' },
  { name: 'Footwear', pct: 22, color: '#10B981' },
  { name: 'Clothing', pct: 18, color: '#8B5CF6' },
  { name: 'Home', pct: 14, color: '#F59E0B' },
  { name: 'Others', pct: 8, color: '#6B7280' },
];

export default function AdminAnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const topPadding = Platform.OS === 'web' ? 24 : insets.top;
  const maxBar = Math.max(...WEEKLY);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 100 }}>
        {/* Period selector */}
        <View style={[styles.periodRow, { backgroundColor: colors.card }]}>
          {(['week', 'month', 'year'] as const).map((p) => (
            <TouchableOpacity key={p} style={[styles.periodBtn, { backgroundColor: period === p ? colors.primary : 'transparent' }]} onPress={() => setPeriod(p)}>
              <Text style={{ color: period === p ? '#fff' : colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' }}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          {[
            { icon: 'dollar-sign', label: 'Revenue', value: '₹1,79,561', change: '+12.4%', up: true, color: '#10B981' },
            { icon: 'shopping-bag', label: 'Orders', value: '139', change: '+8.2%', up: true, color: '#2563EB' },
            { icon: 'users', label: 'Customers', value: '94', change: '+5.1%', up: true, color: '#8B5CF6' },
            { icon: 'package', label: 'Avg Order', value: '₹1,292', change: '-2.1%', up: false, color: '#F59E0B' },
          ].map((s) => (
            <View key={s.label} style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <View style={[styles.summaryIcon, { backgroundColor: s.color + '20' }]}>
                <Feather name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              <Text style={{ color: s.up ? '#10B981' : '#EF4444', fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{s.change}</Text>
            </View>
          ))}
        </View>

        {/* Bar Chart */}
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Sales This Week</Text>
          <View style={styles.bars}>
            {WEEKLY.map((v, i) => (
              <View key={i} style={styles.barCol}>
                <Text style={[styles.barVal, { color: colors.primary }]}>₹{v}k</Text>
                <View style={[styles.bar, { height: (v / maxBar) * 100, backgroundColor: i === 6 ? colors.primary : colors.primary + '50' }]} />
                <Text style={[styles.barDay, { color: colors.mutedForeground }]}>{DAYS[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Sales by Category</Text>
          {TOP_CATEGORIES.map((c) => (
            <View key={c.name} style={styles.catRow}>
              <Text style={[styles.catName, { color: colors.foreground }]}>{c.name}</Text>
              <View style={styles.catBarWrap}>
                <View style={[styles.catBar, { width: `${c.pct}%`, backgroundColor: c.color }]} />
              </View>
              <Text style={[styles.catPct, { color: colors.mutedForeground }]}>{c.pct}%</Text>
            </View>
          ))}
        </View>

        {/* Top Products */}
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Top Products</Text>
          {TOP_PRODUCTS.map((p, i) => (
            <View key={p.name} style={[styles.topProductRow, { borderBottomColor: colors.border, borderBottomWidth: i < TOP_PRODUCTS.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
              <View style={[styles.rankBadge, { backgroundColor: i === 0 ? '#F59E0B20' : colors.secondary }]}>
                <Text style={{ color: i === 0 ? '#F59E0B' : colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_700Bold' }}>#{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.topProductName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                <Text style={[styles.topProductMeta, { color: colors.mutedForeground }]}>{p.sales} sold</Text>
              </View>
              <Text style={[styles.topProductRevenue, { color: colors.primary }]}>₹{p.revenue.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  periodRow: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  periodBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { width: '46%', flex: 1, borderRadius: 14, padding: 14, gap: 4, minWidth: 140, elevation: 1 },
  summaryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  summaryLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  chartCard: { borderRadius: 16, padding: 16, elevation: 1 },
  cardTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 16 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 140 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barVal: { fontSize: 9, fontFamily: 'Inter_500Medium' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  barDay: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  catName: { width: 90, fontSize: 13, fontFamily: 'Inter_500Medium' },
  catBarWrap: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#EEF1F8', overflow: 'hidden' },
  catBar: { height: '100%', borderRadius: 4 },
  catPct: { width: 36, fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  topProductRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rankBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  topProductName: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  topProductMeta: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  topProductRevenue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
