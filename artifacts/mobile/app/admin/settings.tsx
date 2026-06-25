import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, Platform, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';

export default function AdminSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { storeSettings, updateStoreSettings, announcements, addAnnouncement, removeAnnouncement } = useAdmin();
  const [s, setS] = useState({ ...storeSettings });
  const [saved, setSaved] = useState(false);
  const [newAnn, setNewAnn] = useState('');
  const [showAnnModal, setShowAnnModal] = useState(false);
  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const handleSave = () => {
    updateStoreSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddAnn = () => {
    if (!newAnn.trim()) { Alert.alert('Error', 'Announcement text is required.'); return; }
    addAnnouncement(newAnn.trim());
    setNewAnn('');
    setShowAnnModal(false);
  };

  const Field = ({ label, value, onChange, keyboard, multiline }: { label: string; value: string; onChange: (v: string) => void; keyboard?: any; multiline?: boolean }) => (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { minHeight: 70 }, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard ?? 'default'}
        multiline={!!multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );

  const ToggleRow = ({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) => (
    <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" ios_backgroundColor={colors.border} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 100 }}>
        {/* Store Info */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Store Information</Text>
          <Field label="Store Name" value={s.storeName} onChange={(v) => setS({ ...s, storeName: v })} />
          <Field label="Tagline" value={s.tagline} onChange={(v) => setS({ ...s, tagline: v })} multiline />
          <Field label="Email" value={s.email} onChange={(v) => setS({ ...s, email: v })} keyboard="email-address" />
          <Field label="Phone" value={s.phone} onChange={(v) => setS({ ...s, phone: v })} keyboard="phone-pad" />
          <Field label="Address" value={s.address} onChange={(v) => setS({ ...s, address: v })} multiline />
          <Field label="Free Shipping Above (₹)" value={String(s.freeShippingAbove)} onChange={(v) => setS({ ...s, freeShippingAbove: Number(v) || 0 })} keyboard="numeric" />
        </View>

        {/* Store Options */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Store Options</Text>
          <ToggleRow label="Maintenance Mode" sub="Disable checkout for customers" value={s.maintenanceMode} onChange={(v) => setS({ ...s, maintenanceMode: v })} />
          <ToggleRow label="Guest Checkout" sub="Allow orders without account" value={s.allowGuestCheckout} onChange={(v) => setS({ ...s, allowGuestCheckout: v })} />
          <ToggleRow label="Auto-confirm Orders" sub="Skip manual confirmation step" value={s.autoConfirmOrders} onChange={(v) => setS({ ...s, autoConfirmOrders: v })} />
        </View>

        {/* Announcements */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.annHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Announcements</Text>
            <TouchableOpacity onPress={() => setShowAnnModal(true)}>
              <Feather name="plus" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {announcements.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No announcements yet.</Text>
          ) : announcements.map((a) => (
            <View key={a.id} style={[styles.annRow, { borderBottomColor: colors.border }]}>
              <Feather name="megaphone" size={14} color={colors.primary} />
              <Text style={[styles.annText, { color: colors.foreground }]}>{a.text}</Text>
              <TouchableOpacity onPress={() => removeAnnouncement(a.id)}>
                <Feather name="x" size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Admin PIN Info */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Security</Text>
          <View style={[styles.pinInfo, { backgroundColor: colors.secondary }]}>
            <Feather name="lock" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pinLabel, { color: colors.foreground }]}>Admin PIN</Text>
              <Text style={[styles.pinSub, { color: colors.mutedForeground }]}>Current PIN: 1234 (change via developer settings)</Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saved ? '#10B981' : colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Feather name={saved ? 'check' : 'save'} size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{saved ? 'Settings Saved!' : 'Save Settings'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Announcement Modal */}
      <Modal visible={showAnnModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowAnnModal(false)}>
        <View style={[styles.annModal, { backgroundColor: colors.background }]}>
          <Text style={[styles.annModalTitle, { color: colors.foreground }]}>New Announcement</Text>
          <TextInput
            style={[styles.annInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={newAnn}
            onChangeText={setNewAnn}
            placeholder="e.g. Free shipping this weekend!"
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={[styles.annCancelBtn, { borderColor: colors.border }]} onPress={() => setShowAnnModal(false)}>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.annSaveBtn, { backgroundColor: colors.primary }]} onPress={handleAddAnn}>
              <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  sectionCard: { borderRadius: 16, padding: 16, gap: 4, elevation: 1 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginBottom: 5, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter_400Regular' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  toggleLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  toggleSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  annHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  annRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  annText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', padding: 16 },
  pinInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  pinLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  pinSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  annModal: { flex: 1, padding: 20 },
  annModalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 14 },
  annInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 100 },
  annCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  annSaveBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
});
