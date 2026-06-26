import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface ForceUpdateScreenProps {
  downloadLink: string;
  logoUrl?: string | null;
}

export default function ForceUpdateScreen({ downloadLink, logoUrl }: ForceUpdateScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleDownload = () => {
    if (downloadLink) {
      Linking.openURL(downloadLink);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.content}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
            <Feather name="refresh-cw" size={48} color={colors.primary} />
          </View>
        )}

        <Text style={[styles.title, { color: colors.foreground }]}>Update Required</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          A new version of the app is available. Please update to continue using the application.
        </Text>

        <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="info" size={16} color={colors.primary} style={{ marginTop: 1 }} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            This update contains important improvements and fixes. You must update before continuing.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handleDownload}
          activeOpacity={0.85}
        >
          <Feather name="download" size={20} color={colors.primaryForeground} />
          <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Download Update</Text>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Tap the button above to download the latest version
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 380, paddingHorizontal: 28, alignItems: 'center', gap: 20 },
  logo: { width: 120, height: 80, marginBottom: 8 },
  iconWrap: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 24 },
  infoBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, width: '100%' },
  infoText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20, flex: 1 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    marginTop: 8,
  },
  btnText: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: -8 },
});
