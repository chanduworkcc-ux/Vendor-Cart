import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  initials: string;
}

const DEFAULT_USER: UserProfile = {
  name: 'Guest User',
  email: 'guest@shopall.com',
  phone: '+1 (555) 000-0000',
  initials: 'G',
};

function SettingsRow({
  icon,
  label,
  onPress,
  badge,
  rightElement,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  badge?: string;
  rightElement?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={17} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      {badge ? (
        <View style={[styles.rowBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.rowBadgeText}>{badge}</Text>
        </View>
      ) : null}
      {rightElement ?? <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

function EditProfileModal({
  visible,
  user,
  onSave,
  onClose,
}: {
  visible: boolean;
  user: UserProfile;
  onSave: (u: UserProfile) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name cannot be empty');
      return;
    }
    onSave({
      ...user,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      initials: name.trim()[0]?.toUpperCase() ?? 'U',
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.editAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.editAvatarText}>{name[0]?.toUpperCase() ?? 'U'}</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full Name</Text>
          <TextInput
            style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground}
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email Address</Text>
          <TextInput
            style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Phone Number</Text>
          <TextInput
            style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 (555) 000-0000"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { totalItems: cartItems, clearCart } = useCart();
  const { totalItems: wishlistItems } = useWishlist();

  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [editVisible, setEditVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const showComingSoon = (feature: string) => {
    Alert.alert(feature, 'This feature will be available in a future update.', [{ text: 'OK' }]);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            clearCart();
            Alert.alert('Signed out', 'You have been signed out successfully.');
          },
        },
      ]
    );
  };

  const handleOrderHistory = () => {
    router.push('/(tabs)/orders');
  };

  const handleReturns = () => {
    Alert.alert(
      'Returns & Refunds',
      'To initiate a return, please contact us within 30 days of your purchase. Items must be unused and in original packaging.\n\nEmail: returns@shopall.com',
      [{ text: 'Got it' }]
    );
  };

  const handleTrackOrders = () => {
    Alert.alert(
      'Track Orders',
      'Once your order ships, you will receive a tracking number by email. Check your orders for the latest status.',
      [
        { text: 'View Orders', onPress: handleOrderHistory },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const handleAppearance = () => {
    Alert.alert(
      'Appearance',
      'Choose your preferred theme.',
      [
        { text: 'Light', onPress: () => Alert.alert('Theme', 'Light mode applied.') },
        { text: 'Dark', onPress: () => Alert.alert('Theme', 'Dark mode applied.') },
        { text: 'System Default', onPress: () => Alert.alert('Theme', 'Following system setting.') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLanguage = () => {
    Alert.alert(
      'Language & Region',
      'Current: English (US)\n\nMore language options coming soon.',
      [{ text: 'OK' }]
    );
  };

  const handleHelpCenter = () => {
    Alert.alert(
      'Help Center',
      'Need help? Here are some resources:\n\n• FAQ: shopall.com/faq\n• Email: support@shopall.com\n• Hours: Mon–Fri, 9am–6pm EST',
      [{ text: 'Close' }]
    );
  };

  const handleContactUs = () => {
    Alert.alert(
      'Contact Us',
      'We\'d love to hear from you!\n\n📧 hello@shopall.com\n📞 +1 (800) 555-0100\n\nResponse time: within 24 hours',
      [{ text: 'Close' }]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate ShopAll',
      'Enjoying the app? Give us a 5-star rating on the App Store — it really helps us grow!',
      [
        { text: 'Rate Now ⭐', onPress: () => Alert.alert('Thank you!', 'Redirecting to the App Store...') },
        { text: 'Maybe Later', style: 'cancel' },
      ]
    );
  };

  const handleAdminPanel = () => {
    Alert.alert(
      'Admin Panel',
      'Manage your store:\n\n• Products: Manage in your Stripe Dashboard\n• Orders: View in the Orders tab\n• Webhooks: Configure via Stripe Dashboard',
      [
        { text: 'View Orders', onPress: handleOrderHistory },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const handleSavedAddresses = () => {
    Alert.alert(
      'Saved Addresses',
      'You have no saved addresses yet.\n\nAddresses will be saved automatically when you complete a checkout.',
      [{ text: 'OK' }]
    );
  };

  const handlePaymentMethods = () => {
    Alert.alert(
      'Payment Methods',
      'Payment details are securely managed by Stripe.\n\nYour card info is never stored on our servers.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'web' ? 80 : 110,
          paddingHorizontal: 16,
          gap: 14,
        }}
      >
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{user.initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
          </View>
          <TouchableOpacity
            style={[styles.editBtn, { borderColor: colors.border }]}
            onPress={() => setEditVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={15} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.stat} onPress={handleOrderHistory} activeOpacity={0.7}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>0</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Orders</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.stat} onPress={() => router.push('/(tabs)/wishlist')} activeOpacity={0.7}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{wishlistItems}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Wishlist</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.stat} onPress={() => router.push('/(tabs)/cart')} activeOpacity={0.7}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{cartItems}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Cart Items</Text>
          </TouchableOpacity>
        </View>

        {/* ACCOUNT */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <SettingsRow icon="user" label="Personal Information" onPress={() => setEditVisible(true)} />
          <SettingsRow icon="map-pin" label="Saved Addresses" onPress={handleSavedAddresses} />
          <SettingsRow icon="credit-card" label="Payment Methods" onPress={handlePaymentMethods} />
        </View>

        {/* ORDERS */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ORDERS</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <SettingsRow icon="package" label="Order History" onPress={handleOrderHistory} />
          <SettingsRow icon="refresh-cw" label="Returns & Refunds" onPress={handleReturns} />
          <SettingsRow icon="truck" label="Track Orders" onPress={handleTrackOrders} />
        </View>

        {/* PREFERENCES */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PREFERENCES</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <SettingsRow
            icon="bell"
            label="Notifications"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow icon="moon" label="Appearance" onPress={handleAppearance} />
          <SettingsRow icon="globe" label="Language & Region" onPress={handleLanguage} />
        </View>

        {/* SUPPORT */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SUPPORT</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <SettingsRow icon="help-circle" label="Help Center" onPress={handleHelpCenter} />
          <SettingsRow icon="message-circle" label="Contact Us" onPress={handleContactUs} />
          <SettingsRow icon="star" label="Rate the App" onPress={handleRateApp} />
        </View>

        {/* Admin Panel */}
        <TouchableOpacity
          style={[styles.adminBtn, { backgroundColor: colors.primary }]}
          onPress={handleAdminPanel}
          activeOpacity={0.85}
        >
          <Feather name="shield" size={18} color="#fff" />
          <Text style={styles.adminBtnText}>Admin Panel</Text>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <EditProfileModal
        visible={editVisible}
        user={user}
        onSave={setUser}
        onClose={() => setEditVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  userEmail: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statNum: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statDivider: { width: 1 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 2,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  rowBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  rowBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  adminBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  signOutText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  modalCancel: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  modalSave: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  editAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  editAvatarText: { color: '#fff', fontSize: 28, fontFamily: 'Inter_700Bold' },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 6, marginTop: 16 },
  fieldInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
});
