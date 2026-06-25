import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, Platform, Modal, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useAdmin, BannerSlide } from '@/context/AdminContext';

export default function AdminSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    storeSettings, updateStoreSettings,
    announcements, addAnnouncement, removeAnnouncement,
    bannerSlides, addBannerSlide, removeBannerSlide, updateBannerSlide,
  } = useAdmin();
  const [s, setS] = useState({ ...storeSettings });
  const [saved, setSaved] = useState(false);
  const [newAnn, setNewAnn] = useState('');
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<BannerSlide | null>(null);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState('');
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

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to add banner images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingImageUri(result.assets[0].uri);
      setSlideTitle('');
      setSlideSubtitle('');
      setEditingSlide(null);
      setShowSlideModal(true);
    }
  };

  const openEditSlide = (slide: BannerSlide) => {
    setEditingSlide(slide);
    setSlideTitle(slide.title);
    setSlideSubtitle(slide.subtitle);
    setPendingImageUri(slide.imageUri);
    setShowSlideModal(true);
  };

  const handleSaveSlide = () => {
    if (!slideTitle.trim()) { Alert.alert('Error', 'Please enter a title for the banner.'); return; }
    if (editingSlide) {
      updateBannerSlide(editingSlide.id, {
        title: slideTitle.trim(),
        subtitle: slideSubtitle.trim(),
        imageUri: pendingImageUri,
      });
    } else {
      addBannerSlide({
        imageUri: pendingImageUri,
        title: slideTitle.trim(),
        subtitle: slideSubtitle.trim(),
      });
    }
    setShowSlideModal(false);
    setEditingSlide(null);
    setPendingImageUri('');
    setSlideTitle('');
    setSlideSubtitle('');
  };

  const handleDeleteSlide = (id: string) => {
    Alert.alert('Remove Slide', 'Remove this banner slide?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeBannerSlide(id) },
    ]);
  };

  const Field = ({ label, value, onChange, keyboard, multiline }: { label: string; value: string; onChange: (v: string) => void; keyboard?: any; multiline?: boolean }) => (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { minHeight: 70 }, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
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

        {/* Banner Slides */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.annHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Banner Slides</Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Auto-sliding hero images on the home screen</Text>
            </View>
            <TouchableOpacity
              style={[styles.addSlideBtn, { backgroundColor: colors.primary }]}
              onPress={pickImageFromGallery}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.addSlideBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {bannerSlides.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyBanner, { borderColor: colors.border, backgroundColor: colors.secondary }]}
              onPress={pickImageFromGallery}
              activeOpacity={0.8}
            >
              <Feather name="image" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyBannerText, { color: colors.mutedForeground }]}>Tap to add banner images from gallery</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slidesRow}>
              {bannerSlides.map((slide, index) => (
                <View key={slide.id} style={[styles.slideThumb, { borderColor: colors.border }]}>
                  <Image source={{ uri: slide.imageUri }} style={styles.slideThumbImg} resizeMode="cover" />
                  <View style={styles.slideThumbOverlay}>
                    <Text style={styles.slideThumbTitle} numberOfLines={1}>{slide.title}</Text>
                    {slide.subtitle ? <Text style={styles.slideThumbSub} numberOfLines={1}>{slide.subtitle}</Text> : null}
                  </View>
                  <View style={styles.slideThumbBadge}>
                    <Text style={styles.slideThumbBadgeText}>{index + 1}</Text>
                  </View>
                  <View style={styles.slideThumbActions}>
                    <TouchableOpacity
                      style={[styles.slideActionBtn, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
                      onPress={() => openEditSlide(slide)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Feather name="edit-2" size={13} color="#2563EB" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.slideActionBtn, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
                      onPress={() => handleDeleteSlide(slide.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Feather name="trash-2" size={13} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addSlideThumb, { borderColor: colors.border, backgroundColor: colors.secondary }]}
                onPress={pickImageFromGallery}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={24} color={colors.primary} />
                <Text style={[styles.addSlideThumbText, { color: colors.primary }]}>Gallery</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

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

      {/* Banner Slide Edit Modal */}
      <Modal visible={showSlideModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowSlideModal(false)}>
        <View style={[styles.annModal, { backgroundColor: colors.background }]}>
          <Text style={[styles.annModalTitle, { color: colors.foreground }]}>
            {editingSlide ? 'Edit Banner Slide' : 'New Banner Slide'}
          </Text>

          {pendingImageUri ? (
            <View style={styles.previewImgWrap}>
              <Image source={{ uri: pendingImageUri }} style={styles.previewImg} resizeMode="cover" />
              <TouchableOpacity
                style={[styles.changeImgBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [16, 9],
                    quality: 0.85,
                  });
                  if (!result.canceled && result.assets[0]) {
                    setPendingImageUri(result.assets[0].uri);
                  }
                }}
              >
                <Feather name="refresh-cw" size={14} color="#fff" />
                <Text style={styles.changeImgBtnText}>Change Image</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>TITLE *</Text>
          <TextInput
            style={[styles.annInput, { minHeight: 48, backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={slideTitle}
            onChangeText={setSlideTitle}
            placeholder="e.g. Summer Sale 2026"
            placeholderTextColor={colors.mutedForeground}
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>SUBTITLE (optional)</Text>
          <TextInput
            style={[styles.annInput, { minHeight: 48, backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={slideSubtitle}
            onChangeText={setSlideSubtitle}
            placeholder="e.g. Up to 50% off"
            placeholderTextColor={colors.mutedForeground}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity style={[styles.annCancelBtn, { borderColor: colors.border }]} onPress={() => {
              setShowSlideModal(false);
              setEditingSlide(null);
              setPendingImageUri('');
            }}>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.annSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveSlide}>
              <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>{editingSlide ? 'Update' : 'Add Slide'}</Text>
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
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  sectionSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 12 },
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

  addSlideBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addSlideBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  emptyBanner: { height: 110, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyBannerText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  slidesRow: { paddingBottom: 4, gap: 12, paddingRight: 4 },
  slideThumb: { width: 150, height: 100, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  slideThumbImg: { width: '100%', height: '100%' },
  slideThumbOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', padding: 8 },
  slideThumbTitle: { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  slideThumbSub: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 1 },
  slideThumbBadge: { position: 'absolute', top: 6, left: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  slideThumbBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold' },
  slideThumbActions: { position: 'absolute', top: 6, right: 6, gap: 4 },
  slideActionBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },

  addSlideThumb: { width: 100, height: 100, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addSlideThumbText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  previewImgWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 4 },
  previewImg: { width: '100%', height: 160, borderRadius: 12 },
  changeImgBtn: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  changeImgBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
