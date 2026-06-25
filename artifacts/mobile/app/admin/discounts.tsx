import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Discount {
  id: string; code: string; type: 'percent' | 'flat';
  value: number; minOrder: number; usedCount: number;
  maxUses: number; active: boolean; expiry: string;
}

const SEED: Discount[] = [
  { id: '1', code: 'WELCOME10', type: 'percent', value: 10, minOrder: 499, usedCount: 34, maxUses: 100, active: true, expiry: '2026-12-31' },
  { id: '2', code: 'FLAT100', type: 'flat', value: 100, minOrder: 999, usedCount: 12, maxUses: 50, active: true, expiry: '2026-09-30' },
  { id: '3', code: 'SAVE20', type: 'percent', value: 20, minOrder: 1499, usedCount: 8, maxUses: 30, active: false, expiry: '2026-07-31' },
];

export default function AdminDiscountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [discounts, setDiscounts] = useState<Discount[]>(SEED);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'flat'>('percent');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiry, setExpiry] = useState('');
  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const resetForm = () => { setCode(''); setType('percent'); setValue(''); setMinOrder(''); setMaxUses(''); setExpiry(''); };

  const handleAdd = () => {
    if (!code.trim() || !value) { Alert.alert('Error', 'Code and value are required.'); return; }
    const d: Discount = {
      id: Date.now().toString(), code: code.toUpperCase().trim(),
      type, value: Number(value), minOrder: Number(minOrder) || 0,
      usedCount: 0, maxUses: Number(maxUses) || 9999,
      active: true, expiry: expiry || '2026-12-31',
    };
    setDiscounts((prev) => [d, ...prev]);
    resetForm(); setShowModal(false);
  };

  const toggleActive = (id: string) => {
    setDiscounts((prev) => prev.map((d) => d.id === id ? { ...d, active: !d.active } : d));
  };

  const deleteDiscount = (id: string) => {
    Alert.alert('Delete Coupon', 'Remove this discount code?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setDiscounts((prev) => prev.filter((d) => d.id !== id)) },
    ]);
  };

  const renderItem = ({ item }: { item: Discount }) => (
    <View style={[styles.card, { backgroundColor: colors.card, opacity: item.active ? 1 : 0.6 }]}>
      <View style={styles.cardTop}>
        <View style={[styles.codeBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.codeText, { color: colors.primary }]}>{item.code}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => toggleActive(item.id)}>
            <View style={[styles.toggle, { backgroundColor: item.active ? colors.primary : colors.border }]}>
              <Text style={styles.toggleText}>{item.active ? 'ON' : 'OFF'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteDiscount(item.id)}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Feather name="percent" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.foreground }]}>
            {item.type === 'percent' ? `${item.value}% off` : `₹${item.value} off`}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="shopping-bag" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.foreground }]}>Min ₹{item.minOrder}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="users" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.foreground }]}>{item.usedCount}/{item.maxUses} used</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.foreground }]}>Expires {item.expiry}</Text>
        </View>
      </View>
      <View style={styles.usageBar}>
        <View style={[styles.usageFill, { width: `${(item.usedCount / item.maxUses) * 100}%`, backgroundColor: colors.primary }]} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discounts</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList data={discounts} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Feather name="percent" size={40} color={colors.mutedForeground} /><Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: 'Inter_400Regular' }}>No discount codes yet</Text></View>} />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalWrap, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { resetForm(); setShowModal(false); }}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Discount Code</Text>
            <TouchableOpacity onPress={handleAdd}><Text style={[styles.saveText, { color: colors.primary }]}>Create</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {[
              { label: 'Coupon Code *', value: code, onChange: setCode, placeholder: 'e.g. SAVE20', caps: true },
              { label: 'Discount Value *', value: value, onChange: setValue, placeholder: type === 'percent' ? 'e.g. 10' : 'e.g. 100', keyboard: 'numeric' },
              { label: 'Minimum Order Amount (₹)', value: minOrder, onChange: setMinOrder, placeholder: 'e.g. 499', keyboard: 'numeric' },
              { label: 'Max Uses', value: maxUses, onChange: setMaxUses, placeholder: 'e.g. 100', keyboard: 'numeric' },
              { label: 'Expiry Date (YYYY-MM-DD)', value: expiry, onChange: setExpiry, placeholder: '2026-12-31' },
            ].map((f) => (
              <View key={f.label}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                  value={f.value} onChangeText={f.onChange} placeholder={f.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType={(f.keyboard as any) ?? 'default'}
                  autoCapitalize={f.caps ? 'characters' : 'none'}
                />
              </View>
            ))}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Discount Type</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {(['percent', 'flat'] as const).map((t) => (
                <TouchableOpacity key={t} style={[styles.typeBtn, { backgroundColor: type === t ? colors.primary : colors.card, borderColor: colors.border }]} onPress={() => setType(t)}>
                  <Text style={{ color: type === t ? '#fff' : colors.foreground, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                    {t === 'percent' ? '% Percent' : '₹ Flat Amount'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10 },
  card: { borderRadius: 16, padding: 14, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codeBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  codeText: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  toggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  toggleText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  usageBar: { height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 2 },
  modalWrap: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  saveText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  typeBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
});
