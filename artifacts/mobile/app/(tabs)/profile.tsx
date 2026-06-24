import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useUser, Language } from '@/context/UserContext';

const LANGUAGES: Language[] = ['English', 'Telugu', 'Hindi'];

function SettingsRow({
  icon, label, onPress, rightElement,
}: {
  icon: string; label: string; onPress?: () => void; rightElement?: React.ReactNode;
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
      {rightElement ?? <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

function ModalShell({
  visible, title, onClose, children,
}: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { user, updateName, setPhone } = useUser();
  const [name, setName] = useState(user.name);
  const [phone, setPhoneInput] = useState(user.phone);
  const [phoneError, setPhoneError] = useState('');

  const isValidIndianPhone = (p: string) => /^[6-9]\d{9}$/.test(p);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Error', 'Name cannot be empty.'); return; }
    if (!user.hasSetPhone) {
      if (!phone.trim()) { Alert.alert('Error', 'Please enter your mobile number.'); return; }
      if (!isValidIndianPhone(phone)) { setPhoneError('Enter a valid 10-digit Indian mobile number (starts with 6–9).'); return; }
    }
    updateName(name);
    if (!user.hasSetPhone) setPhone(phone);
    onClose();
  };

  return (
    <ModalShell visible={visible} title="Edit Profile" onClose={onClose}>
      <View style={[styles.editAvatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.editAvatarText}>{(name[0] ?? 'G').toUpperCase()}</Text>
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
      <View style={[styles.fieldInput, styles.lockedField, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>{user.email}</Text>
        <Feather name="lock" size={14} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.hintText, { color: colors.mutedForeground }]}>Email cannot be changed.</Text>

      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Mobile Number (India)</Text>
      {user.hasSetPhone ? (
        <>
          <View style={[styles.fieldInput, styles.lockedField, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>+91 {user.phone}</Text>
            <Feather name="lock" size={14} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>Mobile number cannot be changed once set.</Text>
        </>
      ) : (
        <>
          <View style={[styles.phoneRow, { backgroundColor: colors.card, borderColor: phoneError ? colors.destructive : colors.border }]}>
            <View style={[styles.countryCode, { borderRightColor: colors.border }]}>
              <Text style={[styles.countryCodeText, { color: colors.foreground }]}>🇮🇳 +91</Text>
            </View>
            <TextInput
              style={[styles.phoneInput, { color: colors.foreground }]}
              value={phone}
              onChangeText={(t) => { setPhoneInput(t.replace(/\D/g, '').slice(0, 10)); setPhoneError(''); }}
              placeholder="10-digit number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
          {phoneError ? <Text style={[styles.errorText, { color: colors.destructive }]}>{phoneError}</Text> : null}
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Once set, your mobile number cannot be changed.
          </Text>
        </>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        activeOpacity={0.85}
      >
        <Text style={styles.saveBtnText}>Save Changes</Text>
      </TouchableOpacity>
    </ModalShell>
  );
}

function AddressModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const [doorNo, setDoorNo] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!doorNo || !street || !city || !state || !pincode) {
      Alert.alert('Missing Fields', 'Please fill in all address fields.'); return;
    }
    if (!/^\d{6}$/.test(pincode)) {
      Alert.alert('Invalid Pincode', 'Enter a valid 6-digit Indian pincode.'); return;
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  const Field = ({ label, value, onChange, placeholder, keyboard, maxLen }: any) => (
    <>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboard ?? 'default'}
        maxLength={maxLen}
      />
    </>
  );

  return (
    <ModalShell visible={visible} title="Save Address" onClose={onClose}>
      <Field label="Door / Flat No." value={doorNo} onChange={setDoorNo} placeholder="e.g. 12B" />
      <Field label="Street / Area" value={street} onChange={setStreet} placeholder="e.g. MG Road" />
      <Field label="City" value={city} onChange={setCity} placeholder="e.g. Hyderabad" />
      <Field label="State" value={state} onChange={setState} placeholder="e.g. Telangana" />
      <Field label="Pincode" value={pincode} onChange={(t: string) => setPincode(t.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit pincode" keyboard="number-pad" maxLen={6} />

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: saved ? colors.success : colors.primary }]}
        onPress={handleSave}
        activeOpacity={0.85}
      >
        <Feather name={saved ? 'check' : 'map-pin'} size={16} color="#fff" />
        <Text style={styles.saveBtnText}>{saved ? 'Address Saved!' : 'Save Address'}</Text>
      </TouchableOpacity>
    </ModalShell>
  );
}

function PaymentModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  return (
    <ModalShell visible={visible} title="Payment Methods" onClose={onClose}>
      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <Feather name="shield" size={32} color={colors.primary} />
        <Text style={[styles.infoTitle, { color: colors.foreground }]}>Secure Payments via Stripe</Text>
        <Text style={[styles.infoBody, { color: colors.mutedForeground }]}>
          Your payment information is encrypted and securely handled by Stripe. We never store your card details on our servers.
        </Text>
      </View>
      <View style={[styles.methodCard, { backgroundColor: colors.card }]}>
        <Feather name="credit-card" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodTitle, { color: colors.foreground }]}>Cards Accepted</Text>
          <Text style={[styles.methodSub, { color: colors.mutedForeground }]}>Visa, Mastercard, RuPay, Amex</Text>
        </View>
      </View>
      <View style={[styles.methodCard, { backgroundColor: colors.card }]}>
        <Feather name="smartphone" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodTitle, { color: colors.foreground }]}>UPI & Wallets</Text>
          <Text style={[styles.methodSub, { color: colors.mutedForeground }]}>Google Pay, PhonePe, Paytm</Text>
        </View>
      </View>
      <Text style={[styles.hintText, { color: colors.mutedForeground, marginTop: 12, textAlign: 'center' }]}>
        Payment methods are added during checkout.
      </Text>
    </ModalShell>
  );
}

function ReturnsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  return (
    <ModalShell visible={visible} title="Returns & Refunds" onClose={onClose}>
      {[
        { icon: 'rotate-ccw', title: '30-Day Returns', body: 'Return any item within 30 days of delivery for a full refund, no questions asked.' },
        { icon: 'package', title: 'Condition', body: 'Items must be unused, in original packaging with all tags attached.' },
        { icon: 'dollar-sign', title: 'Refund Timeline', body: 'Refunds are processed within 5–7 business days after we receive the item.' },
        { icon: 'mail', title: 'How to Return', body: 'Email returns@shopall.com with your order ID and reason. We will arrange pickup.' },
      ].map((item) => (
        <View key={item.title} style={[styles.infoRow, { backgroundColor: colors.card }]}>
          <View style={[styles.infoRowIcon, { backgroundColor: colors.secondary }]}>
            <Feather name={item.icon as any} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoRowTitle, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.infoRowBody, { color: colors.mutedForeground }]}>{item.body}</Text>
          </View>
        </View>
      ))}
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
        <Text style={styles.saveBtnText}>Got it</Text>
      </TouchableOpacity>
    </ModalShell>
  );
}

function TrackOrdersModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const router = useRouter();
  const [orderId, setOrderId] = useState('');
  return (
    <ModalShell visible={visible} title="Track Orders" onClose={onClose}>
      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <Feather name="truck" size={32} color={colors.primary} />
        <Text style={[styles.infoTitle, { color: colors.foreground }]}>Track your delivery</Text>
        <Text style={[styles.infoBody, { color: colors.mutedForeground }]}>
          Enter your order ID below or check your email for a tracking link sent after dispatch.
        </Text>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Order ID</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
        value={orderId}
        onChangeText={setOrderId}
        placeholder="e.g. cs_live_xxxxx"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (!orderId.trim()) { Alert.alert('Enter Order ID', 'Please enter your order ID to track.'); return; }
          Alert.alert('Tracking', `Tracking info for order:\n${orderId}\n\nStatus: In Transit — estimated delivery in 3–5 days.`);
        }}
        activeOpacity={0.85}
      >
        <Feather name="search" size={16} color="#fff" />
        <Text style={styles.saveBtnText}>Track Order</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.outlineBtn, { borderColor: colors.border }]}
        onPress={() => { onClose(); router.push('/(tabs)/orders'); }}
        activeOpacity={0.85}
      >
        <Text style={[styles.outlineBtnText, { color: colors.primary }]}>View All Orders</Text>
      </TouchableOpacity>
    </ModalShell>
  );
}

function AppearanceModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const [selected, setSelected] = useState<'Light' | 'Dark' | 'System'>('Light');
  return (
    <ModalShell visible={visible} title="Appearance" onClose={onClose}>
      <Text style={[styles.sectionSubLabel, { color: colors.mutedForeground }]}>Choose your preferred theme</Text>
      {(['Light', 'Dark', 'System'] as const).map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.optionRow, { backgroundColor: colors.card, borderColor: selected === opt ? colors.primary : colors.border }]}
          onPress={() => setSelected(opt)}
          activeOpacity={0.8}
        >
          <Feather name={opt === 'Light' ? 'sun' : opt === 'Dark' ? 'moon' : 'monitor'} size={20} color={selected === opt ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.optionText, { color: selected === opt ? colors.primary : colors.foreground }]}>{opt === 'System' ? 'System Default' : `${opt} Mode`}</Text>
          {selected === opt && <Feather name="check-circle" size={18} color={colors.primary} />}
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }]} onPress={onClose} activeOpacity={0.85}>
        <Text style={styles.saveBtnText}>Apply</Text>
      </TouchableOpacity>
    </ModalShell>
  );
}

function LanguageModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { user, setLanguage } = useUser();
  const [selected, setSelected] = useState<Language>(user.language);

  const FLAG: Record<Language, string> = { English: '🇬🇧', Telugu: '🇮🇳', Hindi: '🇮🇳' };

  return (
    <ModalShell visible={visible} title="Language" onClose={onClose}>
      <Text style={[styles.sectionSubLabel, { color: colors.mutedForeground }]}>Select your preferred language</Text>
      {LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang}
          style={[styles.optionRow, { backgroundColor: colors.card, borderColor: selected === lang ? colors.primary : colors.border }]}
          onPress={() => setSelected(lang)}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 22 }}>{FLAG[lang]}</Text>
          <Text style={[styles.optionText, { color: selected === lang ? colors.primary : colors.foreground }]}>{lang}</Text>
          {selected === lang && <Feather name="check-circle" size={18} color={colors.primary} />}
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
        onPress={() => { setLanguage(selected); onClose(); }}
        activeOpacity={0.85}
      >
        <Text style={styles.saveBtnText}>Apply Language</Text>
      </TouchableOpacity>
    </ModalShell>
  );
}

function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  return (
    <ModalShell visible={visible} title="Help Center" onClose={onClose}>
      {[
        { q: 'How do I track my order?', a: 'Go to Profile → Track Orders and enter your order ID.' },
        { q: 'Can I cancel my order?', a: 'Orders can be cancelled within 1 hour of placing. Email support@shopall.com.' },
        { q: 'How long does delivery take?', a: 'Standard delivery: 5–7 days. Express: 2–3 days.' },
        { q: 'Is my payment secure?', a: 'Yes! All payments are processed by Stripe with bank-level encryption.' },
        { q: 'How do I return an item?', a: 'Email returns@shopall.com within 30 days with your order ID.' },
      ].map((item, i) => (
        <View key={i} style={[styles.faqCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.faqQ, { color: colors.foreground }]}>Q: {item.q}</Text>
          <Text style={[styles.faqA, { color: colors.mutedForeground }]}>A: {item.a}</Text>
        </View>
      ))}
      <View style={[styles.methodCard, { backgroundColor: colors.card, marginTop: 8 }]}>
        <Feather name="mail" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodTitle, { color: colors.foreground }]}>Email Support</Text>
          <Text style={[styles.methodSub, { color: colors.mutedForeground }]}>support@shopall.com · Mon–Sat, 9am–6pm</Text>
        </View>
      </View>
    </ModalShell>
  );
}

function ContactModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!msg.trim()) { Alert.alert('Empty Message', 'Please type your message before sending.'); return; }
    setSent(true);
    setTimeout(() => { setSent(false); setMsg(''); onClose(); }, 1500);
  };

  return (
    <ModalShell visible={visible} title="Contact Us" onClose={onClose}>
      <View style={[styles.methodCard, { backgroundColor: colors.card }]}>
        <Feather name="phone" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodTitle, { color: colors.foreground }]}>Phone Support</Text>
          <Text style={[styles.methodSub, { color: colors.mutedForeground }]}>+91 1800 555 0100 (Toll-free)</Text>
        </View>
      </View>
      <View style={[styles.methodCard, { backgroundColor: colors.card }]}>
        <Feather name="mail" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodTitle, { color: colors.foreground }]}>Email</Text>
          <Text style={[styles.methodSub, { color: colors.mutedForeground }]}>hello@shopall.com</Text>
        </View>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Send us a message</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
        value={msg}
        onChangeText={setMsg}
        placeholder="Describe your issue or question..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: sent ? colors.success : colors.primary }]} onPress={handleSend} activeOpacity={0.85}>
        <Feather name={sent ? 'check' : 'send'} size={16} color="#fff" />
        <Text style={styles.saveBtnText}>{sent ? 'Message Sent!' : 'Send Message'}</Text>
      </TouchableOpacity>
    </ModalShell>
  );
}

function RateModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) { Alert.alert('Select a Rating', 'Please tap a star to rate the app.'); return; }
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setRating(0); setFeedback(''); onClose(); }, 1500);
  };

  return (
    <ModalShell visible={visible} title="Rate ShopAll" onClose={onClose}>
      <View style={styles.ratingCenter}>
        <Text style={[styles.ratingEmoji]}>{'⭐'.repeat(Math.max(rating, 1))}</Text>
        <Text style={[styles.ratingPrompt, { color: colors.foreground }]}>
          {rating === 0 ? 'How would you rate ShopAll?' : rating === 5 ? 'You\'re amazing! 🎉' : rating >= 4 ? 'Great, thanks!' : rating >= 3 ? 'We\'ll improve!' : 'Sorry to hear that!'}
        </Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 38 }}>{s <= rating ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Additional feedback (optional)</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
        value={feedback}
        onChangeText={setFeedback}
        placeholder="Tell us what you think..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: submitted ? colors.success : colors.primary }]} onPress={handleSubmit} activeOpacity={0.85}>
        <Text style={styles.saveBtnText}>{submitted ? 'Thank you! 🎉' : 'Submit Review'}</Text>
      </TouchableOpacity>
    </ModalShell>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { totalItems: cartItems, clearCart } = useCart();
  const { totalItems: wishlistItems } = useWishlist();
  const { user, toggleNotifications } = useUser();

  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const [modals, setModals] = useState({
    editProfile: false,
    address: false,
    payment: false,
    returns: false,
    trackOrders: false,
    appearance: false,
    language: false,
    help: false,
    contact: false,
    rate: false,
  });

  const open = (key: keyof typeof modals) => setModals((m) => ({ ...m, [key]: true }));
  const close = (key: keyof typeof modals) => setModals((m) => ({ ...m, [key]: false }));

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { clearCart(); Alert.alert('Signed out', 'You have been signed out.'); } },
    ]);
  };

  const handleAdminPanel = () => {
    Alert.alert(
      'Admin Panel',
      'Manage your store:\n\n• Products: Via Stripe Dashboard\n• Orders: View in Orders tab\n• Webhooks: Stripe Dashboard',
      [{ text: 'View Orders', onPress: () => router.push('/(tabs)/orders') }, { text: 'Close', style: 'cancel' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 80 : 110, paddingHorizontal: 16, gap: 14 }}
      >
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{user.initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>{user.name}</Text>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
            {user.hasSetPhone && (
              <Text style={[styles.userPhone, { color: colors.mutedForeground }]}>+91 {user.phone}</Text>
            )}
          </View>
          <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border }]} onPress={() => open('editProfile')} activeOpacity={0.7}>
            <Feather name="edit-2" size={15} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.stat} onPress={() => router.push('/(tabs)/orders')} activeOpacity={0.7}>
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

        {/* Language Badge */}
        <TouchableOpacity style={[styles.langBadge, { backgroundColor: colors.secondary }]} onPress={() => open('language')} activeOpacity={0.8}>
          <Text style={{ fontSize: 16 }}>🌐</Text>
          <Text style={[styles.langBadgeText, { color: colors.primary }]}>Language: {user.language}</Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <SettingsRow icon="user" label="Personal Information" onPress={() => open('editProfile')} />
          <SettingsRow icon="map-pin" label="Saved Addresses" onPress={() => open('address')} />
          <SettingsRow icon="credit-card" label="Payment Methods" onPress={() => open('payment')} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ORDERS</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <SettingsRow icon="package" label="Order History" onPress={() => router.push('/(tabs)/orders')} />
          <SettingsRow icon="refresh-cw" label="Returns & Refunds" onPress={() => open('returns')} />
          <SettingsRow icon="truck" label="Track Orders" onPress={() => open('trackOrders')} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PREFERENCES</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <SettingsRow
            icon="bell"
            label="Notifications"
            rightElement={
              <Switch
                value={user.notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
                ios_backgroundColor={colors.border}
              />
            }
          />
          <SettingsRow icon="moon" label="Appearance" onPress={() => open('appearance')} />
          <SettingsRow icon="globe" label="Language" onPress={() => open('language')} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SUPPORT</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <SettingsRow icon="help-circle" label="Help Center" onPress={() => open('help')} />
          <SettingsRow icon="message-circle" label="Contact Us" onPress={() => open('contact')} />
          <SettingsRow icon="star" label="Rate the App" onPress={() => open('rate')} />
        </View>

        <TouchableOpacity style={[styles.adminBtn, { backgroundColor: colors.primary }]} onPress={handleAdminPanel} activeOpacity={0.85}>
          <Feather name="shield" size={18} color="#fff" />
          <Text style={styles.adminBtnText}>Admin Panel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleSignOut} activeOpacity={0.85}>
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <EditProfileModal visible={modals.editProfile} onClose={() => close('editProfile')} />
      <AddressModal visible={modals.address} onClose={() => close('address')} />
      <PaymentModal visible={modals.payment} onClose={() => close('payment')} />
      <ReturnsModal visible={modals.returns} onClose={() => close('returns')} />
      <TrackOrdersModal visible={modals.trackOrders} onClose={() => close('trackOrders')} />
      <AppearanceModal visible={modals.appearance} onClose={() => close('appearance')} />
      <LanguageModal visible={modals.language} onClose={() => close('language')} />
      <HelpModal visible={modals.help} onClose={() => close('help')} />
      <ContactModal visible={modals.contact} onClose={() => close('contact')} />
      <RateModal visible={modals.rate} onClose={() => close('rate')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  userCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, gap: 14, elevation: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  userEmail: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  userPhone: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  editBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', elevation: 1 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statNum: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statDivider: { width: 1 },
  langBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  langBadgeText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 2, marginLeft: 4 },
  sectionCard: { borderRadius: 16, overflow: 'hidden', elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  adminBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16 },
  adminBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  signOutText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  // Modal
  modalWrap: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  editAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  editAvatarText: { color: '#fff', fontSize: 28, fontFamily: 'Inter_700Bold' },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  lockedField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lockedText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  hintText: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
  errorText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  phoneRow: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  countryCode: { paddingHorizontal: 12, paddingVertical: 12, borderRightWidth: 1, justifyContent: 'center' },
  countryCodeText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  phoneInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 10 },
  outlineBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sectionSubLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  optionText: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  infoCard: { borderRadius: 16, padding: 20, alignItems: 'center', gap: 10, marginBottom: 16 },
  infoTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  infoBody: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 14, borderRadius: 14, marginBottom: 10 },
  infoRowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoRowTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 3 },
  infoRowBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, marginBottom: 10 },
  methodTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  methodSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  textArea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 100 },
  faqCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  faqQ: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  faqA: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  ratingCenter: { alignItems: 'center', gap: 8, marginBottom: 20 },
  ratingEmoji: { fontSize: 28 },
  ratingPrompt: { fontSize: 16, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  stars: { flexDirection: 'row', gap: 4 },
});
