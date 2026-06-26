import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/LoadingScreen";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { UserProvider } from "@/context/UserContext";
import { AdminProvider } from "@/context/AdminContext";
import ForceUpdateScreen from "./force-update";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const APP_VERSION = "1.0.0";

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

interface RemoteConfig {
  logoUrl: string | null;
  currentAppVersion: string;
  minRequiredVersion: string;
  updateDownloadLink: string | null;
  forceUpdateEnabled: boolean;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="admin/login" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="admin/dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="admin/products" options={{ headerShown: false }} />
      <Stack.Screen name="admin/orders" options={{ headerShown: false }} />
      <Stack.Screen name="admin/customers" options={{ headerShown: false }} />
      <Stack.Screen name="admin/analytics" options={{ headerShown: false }} />
      <Stack.Screen name="admin/discounts" options={{ headerShown: false }} />
      <Stack.Screen name="admin/settings" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [showLoader, setShowLoader] = useState(true);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      const t = setTimeout(() => setShowLoader(false), 1800);
      return () => clearTimeout(t);
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) { setConfigLoaded(true); return; }

    fetch(`https://${domain}/api/config`)
      .then(r => r.json())
      .then((config: RemoteConfig) => {
        setRemoteConfig(config);
        if (config.forceUpdateEnabled && config.minRequiredVersion) {
          const needsUpdate = compareVersions(APP_VERSION, config.minRequiredVersion) < 0;
          if (needsUpdate) setForceUpdate(true);
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true));
  }, []);

  if (!fontsLoaded && !fontError) return null;

  if (showLoader) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  if (forceUpdate && remoteConfig?.updateDownloadLink) {
    return (
      <SafeAreaProvider>
        <ForceUpdateScreen
          downloadLink={remoteConfig.updateDownloadLink}
          logoUrl={remoteConfig.logoUrl}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AdminProvider>
            <UserProvider>
              <CartProvider>
                <WishlistProvider>
                  <GestureHandlerRootView>
                    <KeyboardProvider>
                      <RootLayoutNav />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </WishlistProvider>
              </CartProvider>
            </UserProvider>
          </AdminProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
